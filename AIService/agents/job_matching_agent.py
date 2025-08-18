# AIService/agents/job_matching_agent.py

import os
import json
import logging
from typing import Dict, Any

import google.generativeai as genai
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext

logger = logging.getLogger(__name__)

# Configure the Gemini client at the module level
try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
except KeyError:
    logger.warning("GOOGLE_API_KEY not found in environment. The agent will not work.")
    genai = None

# Define Gemini-specific settings
GEMINI_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

class JobMatchingAgent(BaseAgent):
    """
    Agent responsible for calculating a match score and summary between a resume
    and a job description, using the Gemini API.
    """

    def __init__(self):
        super().__init__(AgentType.JOB_MATCHER)
        if genai:
            self.llm_model = genai.GenerativeModel('gemini-2.5-pro')
        else:
            self.llm_model = None
        self.logger.info(f"JobMatchingAgent initialized with model: Gemini 2.5 Pro")

    async def process(self, context: DocumentContext) -> AgentResult:
        """Calculates a job match score and summary."""
        if not self.llm_model:
            raise RuntimeError("Gemini API key not configured. Cannot call the LLM.")

        try:
            relationship_map_result = context.previous_results.get(AgentType.RELATIONSHIP_MAPPER)
            if not relationship_map_result or not relationship_map_result.success:
                raise ValueError("Failed to get relationship map results for job matching.")
            
            relationship_map = relationship_map_result.data.get("relationship_map", {})
            jd_content = context.metadata.get('job_description', {}).get('content', 'Job Description content not available.')
            
            if not relationship_map:
                raise ValueError("JobMatchingAgent requires a relationship_map in its context metadata.")

            match_score_schema = {
                "type": "object",
                "properties": {
                    "match_percentage": {"type": "number", "minimum": 0, "maximum": 100},
                    "strength_summary": {"type": "string"},
                    "areas_for_improvement": {"type": "array", "items": {"type": "string"}},
                    # ... other properties
                },
                "required": ["match_percentage", "strength_summary", "areas_for_improvement"]
            }

            # --- CORRECTED: System and User prompts are now separate ---
            system_prompt = (
                "You are an expert Job Matching AI, acting as a seasoned executive recruiter. Your task is to evaluate a candidate’s fit for a role by calculating a realistic match percentage and providing structured, evidence-based insights, strictly adhering to the schema and principles below.:\n\n"
    
                "--- CORE REASONING PRINCIPLES ---\n"
                "1.  **Hierarchy of Experience**: Prioritize full-time professional experience above internships, freelance roles, personal projects, and coursework.\n\n"
                "2.  **Impact over Keywords**: Quantified, results-based achievements count most—simple keyword matches are less important.\n\n"
                "3.  **Semantic Equivalence**: Recognize similar skills or responsibilities, even if phrased differently.\n\n"
                "4.  **Match Percentage Calculation**: Your score must:\n"
                     "i. Be data-driven, based solely on the provided relationship map and job description.\n"
                     "ii. Increase with more highly confident matches of key skills/experiences.\n"
                     "iii. Decrease with significant gaps in core competencies.\n"
                     "iv. Weigh fundamental “experience_gap” (missing core responsibilities) more than secondary “skill_gap.”"
                "5.  Realism & Trust: Do not inflate scores or overstate strengths. Conservatively score when data is partial or weak.\n\n"
                "6. Authorization, Sponsorship, and Security Requirements: These should NOT affect your match percentage calculation if missing from the resume. Simply highlight as informational for the candidate to clarify if relevant.\n"
                "-  Only output a valid JSON. In 'areas_for_improvement', you may include a reminder to clarify work authorization or clearance status (if the JD requires it), but do NOT lower 'match_percentage' unless the resume directly contradicts employer requirement.\n\n"
                "--- OUTPUT INSTRUCTIONS ---\n"
                "Only output a single valid JSON object matching the schema 'match_score_schema; - no extra text, comments, or explanations"
)

            user_prompt = (
                f"Analyze the following relationship map (which details matches and gaps "
                f"between a resume and a job description) to calculate an overall match percentage and provide feedback.\n\n"
                # --- Job Description content is removed ---
                f"--- Relationship Map ---\n{json.dumps(relationship_map, indent=2)}\n\n"
                f"Output the match analysis as a JSON object strictly following this schema:\n"
                f"{json.dumps(match_score_schema, indent=2)}"
)
            
            # --- CORRECTED: Make the LLM API call to Gemini with a list of prompts ---
            response = await self.llm_model.generate_content_async(
                [system_prompt, user_prompt], # Pass prompts as a list
                generation_config=genai.types.GenerationConfig(
                    temperature=0.0,
                    response_mime_type="application/json"
                ),
                safety_settings=GEMINI_SAFETY_SETTINGS
            )
            
            try:
                # First, try to parse the response directly
                llm_output = json.loads(response.text)
            except json.JSONDecodeError:
                self.logger.warning("Initial JSON parsing failed for Job Matcher. Attempting to self-correct.")
                # If it fails, ask the LLM to fix the broken JSON
                fix_prompt = (
                    "The following text is not a valid JSON object because it contains extra data or formatting errors. "
                    "Please analyze the text, correct any errors, and return ONLY the perfectly formatted JSON object. "
                    "Do not include any other text or explanation outside of the JSON itself.\n\n"
                    f"--- BROKEN TEXT ---\n{response.text}\n--- END BROKEN TEXT ---"
                )
                
                correction_response = await self.llm_model.generate_content_async(
                    fix_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.0,
                        response_mime_type="application/json"
                    ),
                    safety_settings=GEMINI_SAFETY_SETTINGS
                )
                llm_output = json.loads(correction_response.text)
            
            if not isinstance(llm_output, dict) or not all(key in llm_output for key in match_score_schema['required']):
                raise ValueError("LLM returned invalid or incomplete JSON for match score.")
            
            match_percentage = max(0, min(100, int(llm_output.get("match_percentage", 0))))
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "match_analysis": llm_output,
                    "overall_match_percentage": match_percentage,
                    "llm_model_used": "gemini-2.5-pro"
                },
                confidence=match_percentage / 100.0,
                processing_time=0.0
            )
            
        except json.JSONDecodeError as e:
            self.logger.error(f"LLM returned invalid JSON for Job Matching: {e}", exc_info=True)
            raise ValueError(f"Failed to parse LLM response: Invalid JSON. {e}")
        except Exception as e:
            self.logger.error(f"Job matching failed: {str(e)}", exc_info=True)
            raise

    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "LLM-Powered Job Matcher",
            "description": "Calculates an overall match percentage and provides key insights between a candidate's resume and a job description.",
            "model": "gemini-2.5-pro",
            "input_requirements": [
                "Relationship Mapper Agent result",
                "Job Description content"
            ],
            "output_format": "Structured JSON with match percentage, strengths, and areas for improvement",
            "model": self.llm_model,
            "confidence_level": 0.95 # Reflects expected LLM performance for scoring
        }