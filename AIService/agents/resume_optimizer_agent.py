# AIService/agents/resume_optimizer_agent.py

from typing import Dict, Any, List, Optional
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import os
import json
import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class ResumeOptimizerAgent(BaseAgent):
    """
    Agent responsible for generating specific, actionable, and contextualized
    suggestions to enhance a resume for a given job description.
    This includes quantification, explanations, and company-specific tailoring.
    """
    
    def __init__(self):
        super().__init__(AgentType.RESUME_OPTIMIZER)
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.llm_model = "gpt-4o" # Or your chosen LLM
        self.logger.info(f"ResumeOptimizerAgent initialized with model: {self.llm_model}")

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
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert Resume Optimization AI. Your goal is to provide highly specific, actionable, "
                        "and semantically rich suggestions to enhance a candidate's resume for a given job description. "
                        "Base your suggestions on the provided resume content, job description, extracted entities, "
                        "the relationship map, job match analysis, and company context (if available). "
                        "Crucially, for each suggestion, provide clear reasoning, propose specific text, and identify the target section. "
                        "Focus on quantification, alignment with JD requirements, and matching company values/needs. "
                        "Output must be a JSON object strictly following the schema. Prioritize critical and high-impact suggestions."
                    )
                },
                {
                    "role": "user",
                    "content": (
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
                }
            ]
            
            # Make the LLM API call
            response = await self.openai_client.chat.completions.create(
                model=self.llm_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.4 # Higher temperature than extraction/matching for more creative suggestions
            )
            
            # Parse and validate the LLM's response
            llm_output = json.loads(response.choices[0].message.content)
            
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
                    "llm_model_used": self.llm_model
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