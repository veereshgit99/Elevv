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
            self.llm_model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.llm_model = None
        self.logger.info(f"JobMatchingAgent initialized with model: Gemini 1.5 Flash")

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
                "You are an expert Job Matching AI, acting as a seasoned executive recruiter. Your task is to calculate a realistic overall match percentage and provide insightful analysis based on a detailed relationship map. You must adhere to the following universal principles of professional evaluation:\n\n"
    
                "--- CORE REASONING PRINCIPLES ---\n"
                "1.  **Hierarchy of Experience**: Always weigh different types of experience appropriately. Relevant full-time professional experience is the most valuable, followed by internships or freelance work, then personal projects, and finally academic coursework.\n\n"
                "2.  **Impact over Keywords**: Give significantly more weight to skills demonstrated with quantified, results-oriented achievements.\n\n"
                "3.  **Semantic Equivalence**: Understand that different industries use different terminology for the same skills and responsibilities.\n\n"
                "4.  **Recency Matters**: More recent experience is generally more relevant than older experience.\n\n"
    
                "--- OUTPUT INSTRUCTIONS ---\n"
                "Based on these principles, provide your analysis. Ensure the match percentage is realistic and your feedback is directly supported by the data in the relationship map. The output must strictly follow the JSON schema."
)

            user_prompt = (
                f"Analyze the following job description and the relationship map (which details matches and gaps "
                f"between the resume and JD) to calculate an overall match percentage and provide feedback.\n\n"
                f"--- Job Description ---\n{jd_content[:5000]}\n\n"
                f"--- Relationship Map ---\n{json.dumps(relationship_map, indent=2)}\n\n"
                f"Output the match analysis as a JSON object strictly following this schema:\n"
                f"{json.dumps(match_score_schema, indent=2)}"
            )
            
            # --- CORRECTED: Make the LLM API call to Gemini with a list of prompts ---
            response = self.llm_model.generate_content(
                [system_prompt, user_prompt], # Pass prompts as a list
                generation_config=genai.types.GenerationConfig(
                    temperature=0.0,
                    response_mime_type="application/json"
                ),
                safety_settings=GEMINI_SAFETY_SETTINGS
            )
            
            llm_output = json.loads(response.text)
            
            if not isinstance(llm_output, dict) or not all(key in llm_output for key in match_score_schema['required']):
                raise ValueError("LLM returned invalid or incomplete JSON for match score.")
            
            match_percentage = max(0, min(100, int(llm_output.get("match_percentage", 0))))
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "match_analysis": llm_output,
                    "overall_match_percentage": match_percentage,
                    "llm_model_used": "gemini-1.5-flash"
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
            "model": "gemini-1.5-flash",
            "input_requirements": [
                "Relationship Mapper Agent result",
                "Job Description content"
            ],
            "output_format": "Structured JSON with match percentage, strengths, and areas for improvement",
            "model": self.llm_model,
            "confidence_level": 0.95 # Reflects expected LLM performance for scoring
        }