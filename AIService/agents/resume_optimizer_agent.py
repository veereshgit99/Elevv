# AIService/agents/resume_optimizer_agent.py

from typing import Dict, Any, List, Optional
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import os
import json
import logging

import google.generativeai as genai

logger = logging.getLogger(__name__)

from dotenv import load_dotenv
load_dotenv()

try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise KeyError("GOOGLE_API_KEY not found in environment variables.")
    genai.configure(api_key=api_key)
except KeyError as e:
    logger.warning(f"{e} The agent will not work.")
    genai = None
    
# --- Define standard safety settings ---
GEMINI_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

class ResumeOptimizerAgent(BaseAgent):
    """
    Agent responsible for generating specific, actionable, and contextualized
    suggestions to enhance a resume for a given job description.
    This includes quantification, explanations, and company-specific tailoring.
    """
    
    def __init__(self):
        super().__init__(AgentType.RESUME_OPTIMIZER)
        
        if genai:
            self.llm_model = genai.GenerativeModel("gemini-2.5-pro")
        else:
            self.llm_model = None
        self.logger.info("LLM-based ResumeOptimizerAgent initialized with model: Gemini 1.5 Pro")

    async def process(self, context: DocumentContext) -> AgentResult:
        """
        Generates resume enhancement suggestions based on job description,
        relationship map, and optionally company context.
        """
        try:
            if not context.previous_results:
                raise ValueError("ResumeOptimizerAgent requires previous agent results.")
            
            # Get necessary results from previous agents
            resume_content = context.content # The original resume content
            
            jd_content = context.metadata.get('job_description', {}).get('content', 'Job Description content not available.')
            
            resume_entities_result = context.previous_results.get(AgentType.ENTITY_EXTRACTOR)
            resume_entities = resume_entities_result.data.get("entities", {}) if resume_entities_result and resume_entities_result.success else {}
            
            jd_entities_result = context.metadata.get('job_description', {}).get('entity_extractor_result') # Assuming orchestrator puts JD entity result here
            jd_entities = jd_entities_result.data.get("entities", {}) if jd_entities_result and jd_entities_result.success else {}

            relationship_map_result = context.previous_results.get(AgentType.RELATIONSHIP_MAPPER)
            relationship_map = relationship_map_result.data.get("relationship_map", {}) if relationship_map_result and relationship_map_result.success else {}

            job_match_result = context.previous_results.get(AgentType.JOB_MATCHER)
            match_analysis = job_match_result.data.get("match_analysis", {}) if job_match_result and job_match_result.success else {}
            
            company_info = context.metadata.get('company_info', {}) # From WebScraperAgent, if implemented
            
            # Define the schema for the desired enhancement suggestions output
            enhancement_schema = {
                "type": "object",
                "properties": {
                    "suggestions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string", "enum": ["add", "rephrase", "quantify", "highlight", "remove", "style_adjust"], "description": "Type of suggestion"},
                                "target_section": {"type": "string", "description": "Section of the resume to apply the suggestion to (e.g., 'SUMMARY', 'EXPERIENCE', 'PROJECTS', 'SKILLS')"},
                                "original_text_snippet": {"type": "string", "description": "Small snippet of original resume text relevant to the suggestion (for context)"},
                                "suggested_text": {"type": "string", "description": "The proposed new or rephrased text for the resume"},
                                "reasoning": {"type": "string", "description": "Explanation of why this enhancement is beneficial and how it aligns with the JD or company."},
                                "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"], "description": "Priority level of the suggestion"},
                                "quantification_prompt": {"type": "string", "nullable": True, "description": "If 'type' is 'quantify', a prompt asking the user for metrics."}
                            },
                            "required": ["type", "target_section", "suggested_text", "reasoning", "priority"]
                        }
                    },
                    "overall_feedback": {"type": "string", "description": "General feedback on the enhancement process and next steps."}
                },
                "required": ["suggestions"]
            }

            # Construct the prompt for the LLM
            # Provide all relevant context for comprehensive suggestions
            
            system_prompt = (
                "You are an expert Resume Optimization AI, acting as a seasoned executive recruiter with years of experience evaluating top-tier candidates, and if a human recruiter sees the enhanced resume, they should be impressed and hire the candidate. Your goal is to provide highly specific, actionable, "
                "and semantically rich suggestions to enhance a candidate's resume for a given job description. "
                "Base your suggestions on the provided resume content, job description, extracted entities, "
                "the relationship map, job match analysis, and company context (if available). "
                "Crucially, for each suggestion, provide clear reasoning, propose specific text, and identify the target section. "
                "Focus on quantification, alignment with JD requirements, and matching company values/needs. "
                "CRITICAL RULE: Never invent or suggest adding a project or experience the user has not done.\n\n"
                
                "Focus on suggestions:\n"
                "**Check for Existing Matches First**: Before making any suggestion, you MUST review the `relationship_map`. If a requirement from the job description has already been matched with a high confidence score, you are NOT allowed to make a suggestion about it. Your role is to fill gaps, not to elaborate on existing strengths.\n\n"
                "1. ENHANCE EXISTING CONTENT:\n"
                "   i. Rephrase bullet points to be more impactful, quantify achievements, and highlight existing skills that align with the job description.\n"
                "   ii. Any suggested bullet points must be concise and if possible, start with a strong action verb.\n"
                "   iii. Only suggest a change if it provides a significant and meaningful improvement.** Do not suggest minor stylistic tweaks, if the original bullet point is already strong and clear.\n"
                "   iv. If you suggest a new bullet point, it should be relevant and not random.\n"
                "The 'ENHANCE EXISTING CONTENT' is your primary focus.\n"
                "2. Coming to the priority of suggestions, focus on the following:\n"
                "   i. 'critical' : Use only for suggestions that address a major, explicitly stated requirement in the job description that is currently missing from the resume.\n"
                "   ii. 'high' : Use ONLY for suggestions that add significant, measurable value. This includes **quantifying a key achievement** that was not previously quantified or\n"
                "               **fundamentally rephrasing a weak bullet point** to directly address a core job responsibility.\n"
                "   iii. 'medium' : Use for suggestions that improve the alignment with a 'preferred' qualification or add clarifying technical details.\n"
                "3. NEW ADDITION\n"
                "   i. **Re-frame, Do Not Invent**: You must not invent experience. However, you are encouraged to intelligently **re-frame** a candidate's existing experience to better align with the language of the job description.\n"
                "       If you identify a skill or qualification on the resume that is semantically related to a job requirement but not explicitly stated, you can suggest adding a new bullet point that highlights this connection.\n"
                "       Your reasoning must clearly state which part of the existing resume supports your new suggested text.\n\n"
                "   ii. *Only if you identify a critical, high-priority skill or experience gap**, propose a detailed project idea that the user could build in the future to fill that gap.\n"
                "       Clearly label this with type 'suggest_new_project'. If the gaps are minor, do not suggest a new project.\n\n"
                "4. Address Gaps: Also check 'identified_gaps_in_resume' from 'relationship_map' - Identify and suggest enhancements for any missing critical skills or experiences that are explicitly required in the job description but not present in the resume.\n"
                    "CRITICAL: Make sure at the end, the enhanced resume has a strong, and relevant set of experiences that directly address the job description requirements, and that the candidate appears highly qualified for the role.\n\n"

               "Output must be a JSON object strictly following the schema. Prioritize critical and high-impact suggestions."
            )
            
            user_prompt = (
                f"Optimize the following resume for the given job description:\n\n"
                f"--- Original Resume (Partial) ---\n{resume_content[:5000]}\n\n"
                f"--- Job Description ---\n{jd_content[:5000]}\n\n"
                f"--- Resume's Extracted Entities ---\n{json.dumps(resume_entities, indent=2)}\n\n"
                f"--- Job Description's Extracted Entities ---\n{json.dumps(jd_entities, indent=2)}\n\n"
                f"--- Resume-JD Relationship Map ---\n{json.dumps(relationship_map, indent=2)}\n\n"
                f"--- Job Match Analysis ---\n{json.dumps(match_analysis, indent=2)}\n\n"
                f"--- Company Context (from Website) ---\n{json.dumps(company_info, indent=2)}\n\n"
                f"Provide your enhancement suggestions as a JSON object strictly following this schema:\n"
                f"{json.dumps(enhancement_schema, indent=2)}"
            )
            
            # Make the LLM API call
            response = await self.llm_model.generate_content_async(
                [system_prompt, user_prompt],
                generation_config={"response_mime_type": "application/json", "temperature": 0.4},
                safety_settings=GEMINI_SAFETY_SETTINGS
            )
            
            # --- NEW: Robust JSON Parsing Logic ---
            try:
                # First, try to parse the response directly
                llm_output = json.loads(response.text)
            except json.JSONDecodeError:
                self.logger.warning("Initial JSON parsing failed. Attempting to self-correct.")
                # If it fails, ask the LLM to fix the broken JSON
                fix_prompt = (
                    "The following text is not a valid JSON object due to an unescaped character or formatting error. "
                    "Please analyze the text, correct the error, and return only the perfectly formatted JSON object. "
                    "Do not include any other text or explanation outside of the JSON itself.\n\n"
                    f"--- BROKEN TEXT ---\n{response.text}\n--- END BROKEN TEXT ---"
                )
                
                correction_response = await self.llm_model.generate_content_async(
                    fix_prompt,
                    generation_config={"response_mime_type": "application/json", "temperature": 0.0},
                    safety_settings=GEMINI_SAFETY_SETTINGS
                )
                llm_output = json.loads(correction_response.text) # Try parsing the fixed version
                
            
            if not isinstance(llm_output, dict) or "suggestions" not in llm_output or not isinstance(llm_output["suggestions"], list):
                raise ValueError("LLM returned invalid or incomplete JSON for resume suggestions.")
            
            # Confidence can be based on the number/quality of suggestions or an LLM-derived score
            overall_confidence = 0.9 # Placeholder
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "enhancement_suggestions": llm_output["suggestions"],
                    "overall_feedback": llm_output.get("overall_feedback", ""),
                    "llm_model_used": "gemini-2.5-pro"
                },
                confidence=overall_confidence,
                processing_time=0.0 # Will be updated by _execute_with_timing
            )
            
        except json.JSONDecodeError as e:
            self.logger.error(f"LLM returned invalid JSON for Resume Optimization: {e}", exc_info=True)
            raise ValueError(f"Failed to parse LLM response: Invalid JSON. {e}")
        except ValueError as e:
            self.logger.error(f"Data validation error in ResumeOptimizerAgent: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Resume optimization failed: {str(e)}", exc_info=True)
            raise

    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "LLM-Powered Resume Optimizer",
            "description": "Generates actionable, contextualized suggestions for resume enhancement, including quantification and company-specific tailoring.",
            "input_requirements": [
                "Original Resume content",
                "Job Description content",
                "Entity Extractor results (for Resume and JD)",
                "Relationship Mapper Agent result",
                "Job Matcher Agent result",
                "Optional: Company info from Web Scraper Agent"
            ],
            "output_format": "Structured JSON with specific suggestions, proposed text, reasoning, and priority",
            "model": self.llm_model,
            "confidence_level": 0.9 # Reflects expected LLM performance
        }