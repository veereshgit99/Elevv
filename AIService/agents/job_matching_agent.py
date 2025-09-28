# AIService/agents/job_matching_agent_optimized.py

import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Union
import google.generativeai as genai
from anthropic import AsyncAnthropic
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
from services.utils import _safe_json

logger = logging.getLogger(__name__)

# Configure API clients
try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
    anthropic_client = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
except KeyError as e:
    logger.warning(f"API key not found: {e}")
    genai = None
    anthropic_client = None

GEMINI_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]
class JobMatchingAgent(BaseAgent):
    """
    Optimized JobMatching agent using different models for different tasks in parallel.
    """

    def __init__(self):
        super().__init__(AgentType.JOB_MATCHER)
        
        if genai and anthropic_client:
            self.models = {
                # Fast models for scoring and strengths
                "gemini_flash_lite": genai.GenerativeModel(
                    "gemini-2.5-flash-lite",
                    safety_settings=GEMINI_SAFETY_SETTINGS
                ),
                # Higher quality for improvement analysis
                "gemini_pro": genai.GenerativeModel(
                    "gemini-2.5-pro", 
                    safety_settings=GEMINI_SAFETY_SETTINGS
                ),
                "anthropic_client": anthropic_client
            }
            
            # Task assignments
            self.task_models = {
                "calculate_match_score": "claude_sonnet",      # Fast scoring
                "generate_strength_summary": "gemini_flash_lite",  # Fast strengths summary
            }
        else:
            self.models = None
            self.task_models = None
            

    def _normalize_response_data(self, data: Any) -> Union[List, Dict, float, str]:
        """Ensure data is in expected format"""
        if data is None:
            return []
        return data

    async def _call_gemini_model(self, model_name: str, prompt: str) -> Any:
        """Call Gemini models with error handling"""
        print(f"[DEBUG] Gemini model {model_name} started")
        try:
            model = self.models[model_name]
            response = await model.generate_content_async(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.0,
                    "max_output_tokens": 1000
                },
                safety_settings=GEMINI_SAFETY_SETTINGS
            )
            print(f"[DEBUG] Gemini model {model_name} finished")
            # Handle safety blocks
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'finish_reason') and candidate.finish_reason != 1:
                    self.logger.warning(f"Gemini response blocked. Finish reason: {candidate.finish_reason}")
                    return {}
            if hasattr(response, 'text') and response.text:
                return _safe_json(response.text)
            else:
                self.logger.warning(f"No text in Gemini response for {model_name}")
                return {}
        except Exception as e:
            print(f"[DEBUG] Gemini model {model_name} failed: {e}")
            self.logger.error(f"Gemini model {model_name} failed: {e}")
            return {}

    async def _call_claude_model(self, model_type: str, prompt: str) -> Any:
        """Call Claude models with error handling"""
        print(f"[DEBUG] Claude model {model_type} started")
        try:
            client = self.models["anthropic_client"]
            # Use Claude Sonnet
            model_name = "claude-4-sonnet-20250514"
            response = await client.messages.create(
                model=model_name,
                max_tokens=1000,
                temperature=0.0,
                messages=[{
                    "role": "user",
                    "content": prompt + "\n\nRespond ONLY with valid JSON. No markdown, no explanations."
                }]
            )
            print(f"[DEBUG] Claude model {model_type} finished")
            response_text = response.content[0].text.strip()
            # Clean response
            if response_text.startswith('```'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            if not response_text:
                return {}
            try:
                return _safe_json(response_text)
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'$$.*?$$|\{.*?\}', response_text, re.DOTALL)
                if json_match:
                    return _safe_json(json_match.group(0))
                else:
                    return {}
        except Exception as e:
            print(f"[DEBUG] Claude model {model_type} failed: {e}")
            self.logger.error(f"Claude model {model_type} failed: {e}")
            return {}

    async def _dispatch_to_model(self, task_name: str, prompt: str) -> Any:
        """Route task to appropriate model"""
        model_assignment = self.task_models.get(task_name)
        
        if model_assignment in ["gemini_flash_lite", "gemini_pro"]:
            return await self._call_gemini_model(model_assignment, prompt)
        elif model_assignment == "claude_sonnet":
            return await self._call_claude_model("claude_sonnet", prompt)
        else:
            self.logger.error(f"Unknown model assignment for task: {task_name}")
            return {}

    async def _calculate_match_score(self, resume_content, jd_content, relationship_map: Dict) -> float:
        """Calculate match percentage using fast model"""

        prompt = (
            "You are a senior hiring manager with a quantitative, data-driven approach to talent analysis. "
            "Your task is to calculate a realistic job match percentage (0–100).\n\n"

            "Inputs:\n"
            "1) Resume Content (partial, up to 5000 chars)\n"
            "2) Job Description Content (partial, up to 5000 chars)\n"
            "3) Relationship Map (skills, experience, gaps, matches)\n\n"

            "Scoring rules:\n"
            "- Special rule for simple JDs: If the Job Description is very sparse (e.g., only 1–2 requirements) "
            "and the candidate meets all of them with no gaps, the score should be very high (90+).\n"
            "- Be strict about mandatory qualifications and core requirements—missing these should sharply reduce the score.\n"
            "- Deduct more for missing required experiences than for missing skills, and more for missing skills than for general responsibilities.\n"
            "- Give credit only when the resume provides explicit evidence, not inference.\n"
            "- Treat minimum qualifications as critical and preferred ones as secondary.\n"
            "- Always combine evidence from both the relationship map and the raw texts (JD + Resume).\n\n"

            f"--- Resume Content ---\n{resume_content[:5000]}\n\n"
            f"--- Job Description ---\n{jd_content[:5000]}\n\n"
            f"--- Relationship Map ---\n{json.dumps(relationship_map, indent=2)}\n\n"

            "Return a valid JSON object with exactly one key 'match_percentage' as an integer from 0 to 100. "
            "No text before or after."
        )



        result = await self._dispatch_to_model("calculate_match_score", prompt)
        return result.get("match_percentage", 0.0) if isinstance(result, dict) else 0.0

    async def _generate_strength_summary(self, relationship_map: Dict) -> List[str]:
        
        prompt = (
            "You are a professional resume writer. Your ONLY task is to write a concise, encouraging 2-3 sentence summary of the candidate's strengths based on the 'strong_points_in_resume' and 'matched_experience_to_responsibilities' from the relationship map.\n\n"
            f"--- Relationship Map ---\n{json.dumps(relationship_map, indent=2)}\n\n"
            "Return ONLY a JSON object with a single key: 'strength_summary'."
        )

        result = await self._dispatch_to_model("generate_strength_summary", prompt)
        return result.get("strength_summary", "") if isinstance(result, dict) else ""


    # In job_matching_agent.py

    async def process(self, context: DocumentContext) -> AgentResult:
        if not self.models:
            raise RuntimeError("API keys not configured for job matching.")

        try:
            resume_content = context.content # The original resume content
            jd_content = context.metadata.get('job_description', {}).get('content', 'Job Description content not available.')
            
            relationship_map = context.previous_results[AgentType.RELATIONSHIP_MAPPER].data.get("relationship_map", {})
            if not relationship_map:
                raise ValueError("Missing relationship map for job matching.")
            
            # Execute the two required tasks in parallel
            tasks = [
                self._calculate_match_score(resume_content, jd_content, relationship_map),
                self._generate_strength_summary(relationship_map)
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # --- CORRECTED RESULT HANDLING ---
            match_percentage = 0
            strength_summary = ""

            # Process the result for the first task (match_percentage)
            if not isinstance(results[0], Exception):
                match_percentage = int(round(float(results[0])))
            else:
                self.logger.error(f"Match score task failed: {results[0]}")

            # Process the result for the second task (strength_summary)
            if not isinstance(results[1], Exception):
                strength_summary = results[1] if isinstance(results[1], str) else ""
            else:
                self.logger.error(f"Strength summary task failed: {results[1]}")
            
            # This is the final JSON object your frontend expects
            final_analysis_output = {
                "strength_summary": strength_summary
            }
            # --- END OF CORRECTION ---
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "match_analysis": final_analysis_output,
                    "overall_match_percentage": match_percentage
                },
                confidence=1.0,
                processing_time=0  # Placeholder for actual processing time
            )

        except Exception as e:
            self.logger.error(f"Job matching analysis failed: {e}", exc_info=True)
            # You can decide on a more specific fallback error structure if needed
            return AgentResult(
                agent_type=self.agent_type,
                success=False,
                data={"match_analysis": {}, "overall_match_percentage": 0},
                error=str(e),
                confidence=1.0,
                processing_time=0  # Placeholder for actual processing time
            )

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "name": "Optimized Parallel Job Matching Agent",
            "description": "Uses different models for scoring, strengths, and improvement analysis in parallel",
            "models": self.task_models if self.task_models else {},
            "expected_latency": "4-6 seconds"
        }
