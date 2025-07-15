# AIService/agents/job_matching_agent.py

from typing import Dict, Any, List, Optional
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import os
import json
import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class JobMatchingAgent(BaseAgent):
    """
    Agent responsible for calculating a match score and summary between a resume
    and a job description, based on the output of the RelationshipMapperAgent.
    """
    
    def __init__(self):
        super().__init__(AgentType.JOB_MATCHER)
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.llm_model = "gpt-4o" # Or your chosen LLM
        self.logger.info(f"JobMatchingAgent initialized with model: {self.llm_model}")

    async def process(self, context: DocumentContext) -> AgentResult:
        """
        Calculates a job match score and summary.
        Requires RelationshipMapperAgent results from previous steps.
        """
        try:
            if not context.previous_results:
                raise ValueError("JobMatchingAgent requires previous agent results.")
            
            relationship_map_result = context.previous_results.get(AgentType.RELATIONSHIP_MAPPER)
            if not relationship_map_result or not relationship_map_result.success:
                raise ValueError("Failed to get relationship map results for job matching.")
            
            relationship_map = relationship_map_result.data.get("relationship_map", {})
            
            # Retrieve original JD content for better context in LLM prompt, if available
            # This assumes your orchestrator might pass JD content through context.metadata
            jd_content = context.metadata.get('job_description', {}).get('content', 'Job Description content not available.')

            # Define the schema for the desired match score output
            match_score_schema = {
                "type": "object",
                "properties": {
                    "match_percentage": {"type": "number", "minimum": 0, "maximum": 100, "description": "Overall match percentage"},
                    "strength_summary": {"type": "string", "description": "Concise summary of the candidate's strongest alignments with the JD."},
                    "areas_for_improvement": {"type": "array", "items": {"type": "string", "description": "Key areas from the JD where the resume could be stronger or needs to be optimized."}},
                    "key_matched_skills": {"type": "array", "items": {"type": "string", "description": "List of the most critical skills from the JD that were matched in the resume."}},
                    "key_matched_experiences": {"type": "array", "items": {"type": "string", "description": "List of the most critical experiences/responsibilities from the JD that were matched in the resume."}},
                    "overall_feedback": {"type": "string", "description": "General feedback on the overall match and next steps."}
                },
                "required": ["match_percentage", "strength_summary", "areas_for_improvement"]
            }

            # Construct the prompt for the LLM
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert Job Matching AI. Your task is to calculate an overall match percentage "
                        "between a resume and a job description, based on a detailed relationship map. "
                        "Provide a concise summary of strengths, clear areas for improvement, and key matches. "
                        "Ensure the match percentage is realistic (0-100) and the output strictly follows the JSON schema. "
                        "Consider both explicit matches and implied capabilities."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Analyze the following job description and the relationship map (which details matches and gaps "
                        f"between the resume and JD) to calculate an overall match percentage and provide feedback.\n\n"
                        f"--- Job Description ---\n{jd_content[:5000]}\n\n" # Provide original JD content for broader context
                        f"--- Relationship Map ---\n{json.dumps(relationship_map, indent=2)}\n\n"
                        f"Output the match analysis as a JSON object strictly following this schema:\n"
                        f"{json.dumps(match_score_schema, indent=2)}"
                    )
                }
            ]
            
            # Make the LLM API call
            response = await self.openai_client.chat.completions.create(
                model=self.llm_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0 # Low temperature for factual, deterministic scoring
            )
            
            # Parse and validate the LLM's response
            llm_output = json.loads(response.choices[0].message.content)
            
            # Basic validation
            if not isinstance(llm_output, dict) or not all(key in llm_output for key in match_score_schema['required']):
                raise ValueError("LLM returned invalid or incomplete JSON for match score.")
            
            match_percentage = max(0, min(100, int(llm_output.get("match_percentage", 0))))
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "match_analysis": llm_output,
                    "overall_match_percentage": match_percentage,
                    "llm_model_used": self.llm_model
                },
                confidence=match_percentage / 100.0, # Confidence reflects the match score
                processing_time=0.0 # Will be updated by _execute_with_timing
            )
            
        except json.JSONDecodeError as e:
            self.logger.error(f"LLM returned invalid JSON for Job Matching: {e}", exc_info=True)
            raise ValueError(f"Failed to parse LLM response: Invalid JSON. {e}")
        except ValueError as e:
            self.logger.error(f"Data validation error in JobMatchingAgent: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Job matching failed: {str(e)}", exc_info=True)
            raise

    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "LLM-Powered Job Matcher",
            "description": "Calculates an overall match percentage and provides key insights between a candidate's resume and a job description.",
            "input_requirements": [
                "Relationship Mapper Agent result",
                "Job Description content"
            ],
            "output_format": "Structured JSON with match percentage, strengths, and areas for improvement",
            "model": self.llm_model,
            "confidence_level": 0.95 # Reflects expected LLM performance for scoring
        }