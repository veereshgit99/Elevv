# AIService/agents/relationship_mapper_agent_multi_model.py

import os
import logging
import asyncio, json, re, unicodedata
from typing import Dict, Any, List
import google.generativeai as genai
from anthropic import AsyncAnthropic
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
from typing import Any
from services.utils import _safe_json

logger = logging.getLogger(__name__)

from dotenv import load_dotenv
load_dotenv()

# Configure API keys
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

# ---- LLM with time budget (fast path)
async def _llm_with_budget(model: Any, system_prompt: str, user_prompt: str,
                           soft_timeout: float = 2.0, hard_timeout: float = 6.0, retries: int = 1):

    import time
    async def _call():
        print(f"[DEBUG] LLM call started at {time.strftime('%X')} (model={getattr(model, 'model_name', str(model))})")
        result = await model.generate_content_async(
            [system_prompt, user_prompt],
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.0,
                "max_output_tokens": 512,   # small → less tail latency
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ],
        )
        print(f"[DEBUG] LLM call ended at {time.strftime('%X')} (model={getattr(model, 'model_name', str(model))})")
        return result

    print(f"[DEBUG] _llm_with_budget: Model call about to start (model={getattr(model, 'model_name', str(model))})")
    task = asyncio.create_task(_call())
    try:
        result = await asyncio.wait_for(task, timeout=soft_timeout)
        print(f"[DEBUG] _llm_with_budget: Model call finished within soft_timeout ({soft_timeout}s)")
        return result
    except asyncio.TimeoutError:
        print(f"[DEBUG] _llm_with_budget: Soft timeout ({soft_timeout}s) reached, waiting for hard_timeout ({hard_timeout}s)")
        try:
            result = await asyncio.wait_for(task, timeout=(hard_timeout - soft_timeout))
            print(f"[DEBUG] _llm_with_budget: Model call finished within hard_timeout ({hard_timeout}s)")
            return result
        except asyncio.TimeoutError:
            print(f"[DEBUG] _llm_with_budget: Hard timeout reached, cancelling task")
            task.cancel()
            # ✅ swallow the cancellation so gather doesn't receive a CancelledError object
            try:
                await task
            except asyncio.CancelledError:
                print(f"[DEBUG] _llm_with_budget: Task cancelled")
                pass

            if retries <= 0:
                print(f"[DEBUG] _llm_with_budget: No retries left, raising exception")
                raise
            print(f"[DEBUG] _llm_with_budget: Retrying model call (retries left: {retries})")
            await asyncio.sleep(0.2)
            result = await asyncio.wait_for(_call(), timeout=soft_timeout)
            print(f"[DEBUG] _llm_with_budget: Retry finished")
            return result


# ---- Deterministic fallback (zero cost, very fast)
def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", (s or "").strip().lower())
    return re.sub(r"[^a-z0-9+.# ]+", " ", s)

def _tokenize(s: str) -> set[str]:
    return set(t for t in _norm(s).split() if t)

_SYNONYMS = {
    "js": "javascript",
    "py": "python",
    "ts": "typescript",
    "postgres": "postgresql",
    "aws": "amazon web services",
    "llm": "large language model",
}

def _canon(skill: str) -> str:
    n = _norm(skill)
    return _SYNONYMS.get(n, n)

def _deterministic_skill_map(resume_skills: list[str], jd_skills: list[str]) -> list[dict]:
    rs = [_canon(s) for s in (resume_skills or [])]
    js = [_canon(s) for s in (jd_skills or [])]
    out = []
    for j in js:
        jt = _tokenize(j)
        best = None; best_score = 0.0
        for r in rs:
            rt = _tokenize(r)
            if not rt or not jt:
                continue
            inter = len(rt & jt)
            union = len(rt | jt)
            score = inter / union if union else 0.0
            if score > best_score:
                best_score, best = score, r
        if best and best_score >= 0.34:  # tune threshold if you like
            out.append({
                "jd_skill": j,
                "resume_skill": best,
                "confidence": round(min(0.85, 0.5 + best_score), 2),
                "reasoning": "Matched via token overlap/synonyms (fallback)",
            })
    return out

class RelationshipMapperAgent(BaseAgent):
    """
    RelationshipMapper agent with per-task model sharding for optimal latency and quality.
    """

    def __init__(self):
        super().__init__(AgentType.RELATIONSHIP_MAPPER)
        
        # Initialize different models for different tasks
        if genai and anthropic_client:
            self.models = {
                "gemini_flash": genai.GenerativeModel(
                    "gemini-2.5-flash",
                    safety_settings=GEMINI_SAFETY_SETTINGS
                ),
                "gemini_flash_lite": genai.GenerativeModel(
                    "gemini-2.5-flash-lite",
                    safety_settings=GEMINI_SAFETY_SETTINGS
                ),
                "gemini_pro": genai.GenerativeModel(
                    "gemini-2.5-pro",
                    safety_settings=GEMINI_SAFETY_SETTINGS
                ),
                "anthropic_client": anthropic_client,
            }
            
            # Task-to-model assignments for optimal performance
            self.task_models = {
                "map_skills": "gemini_flash_lite",
                "map_experience": "claude_sonnet",
                "identify_gaps": "gemini_pro",
                "identify_strong_points": "gemini_flash_lite"
            }
        else:
            self.models = None
            self.task_models = None

    async def _call_gemini_model(self, model_name: str, prompt: str) -> Any:
        """Call Gemini models"""
        print(f"[DEBUG] Gemini model {model_name} started")
        try:
            model = self.models[model_name]
            response = await model.generate_content_async(
                prompt,
                generation_config={
                    "response_mime_type": "application/json", 
                    "temperature": 0.0
                }
            )
            print(f"[DEBUG] Gemini model {model_name} finished")
            try:
                return _safe_json(response.text)
            except json.JSONDecodeError as e:
                print(f"[DEBUG] Gemini model {model_name} JSON decode error: {e}")
                print(f"[DEBUG] Gemini model {model_name} raw response:\n{response.text}")
                self.logger.error(f"Gemini model {model_name} failed: {e}")
                return None
        except Exception as e:
            print(f"[DEBUG] Gemini model {model_name} failed: {e}")
            self.logger.error(f"Gemini model {model_name} failed: {e}")
            return None

    async def _call_claude_model(self, model_type: str, prompt: str) -> Any:
        """Call Claude models"""
        print(f"[DEBUG] Claude model {model_type} started")
        try:
            client = self.models["anthropic_client"]
            # Choose Claude model based on task
            model_name = {
                "claude_sonnet": "claude-4-sonnet-20250514",
                "claude_opus": "claude-4-opus-20250514",
            }.get(model_type, "claude-4-sonnet-20250514")
            response = await client.messages.create(
                model=model_name,
                max_tokens=2048,
                temperature=0.0,
                messages=[{
                    "role": "user",
                    "content": prompt + "\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown, no explanations, just the JSON array."
                }]
            )
            print(f"[DEBUG] Claude model {model_type} finished")
            try:
                return _safe_json(response.content[0].text)
            except json.JSONDecodeError as e:
                print(f"[DEBUG] Claude model {model_type} JSON decode error: {e}")
                print(f"[DEBUG] Claude model {model_type} raw response:\n{response.content[0].text}")
                self.logger.error(f"Claude model {model_type} failed: {e}")
                return None
        except Exception as e:
            print(f"[DEBUG] Claude model {model_type} failed: {e}")
            self.logger.error(f"Claude model {model_type} failed: {e}")
            return None

    async def _dispatch_to_model(self, task_name: str, prompt: str) -> Any:
        """Route task to appropriate model"""
        model_assignment = self.task_models.get(task_name)

        if model_assignment in ["gemini_flash", "gemini_flash_lite", "gemini_pro"]:
            return await self._call_gemini_model(model_assignment, prompt)
        elif model_assignment in ["claude_sonnet", "claude_opus", "claude_haiku"]:
            return await self._call_claude_model(model_assignment, prompt)
        else:
            self.logger.error(f"Unknown model assignment for task: {task_name}")
            return None

    async def _map_skills(self, resume_entities: dict, jd_entities: dict) -> list[dict]:
        # Keep inputs compact for speed
        resume_sk = sorted(set((resume_entities or {}).get("skills", [])[:80]))
        jd_sk     = sorted(set((jd_entities or {}).get("skills", [])[:80]))

        # If either side is empty, nothing to do
        if not resume_sk or not jd_sk:
            return []

        system_prompt = (
            "You are matching resume skills to job description skills. "
            "Return ONLY JSON: an array of objects "
            "{'jd_skill': str, 'resume_skill': str, 'confidence': float, 'reasoning': str}. "
            "Map only when there is a clear semantic match; otherwise skip."
        )
        user_prompt = (
            f"Resume skills: {json.dumps(resume_sk)}\n\n"
            f"JD skills: {json.dumps(jd_sk)}\n\n"
            "Return [] if nothing matches."
        )

        model = genai.GenerativeModel("gemini-2.5-flash-lite")

        # Try flash-lite with a strict time budget (fast path)
        try:
            resp = await _llm_with_budget(model, system_prompt, user_prompt,
                                        soft_timeout=2.0, hard_timeout=12.0, retries=1)
            text = getattr(resp, "text", "") or ""
            items = _safe_json(text)
            if isinstance(items, list):
                cleaned = []
                for it in items:
                    if not isinstance(it, dict): 
                        continue
                    jd_s = (it.get("jd_skill") or "").strip()
                    rs_s = (it.get("resume_skill") or "").strip()
                    try:
                        conf = float(it.get("confidence", 0.0))
                    except Exception:
                        conf = 0.0
                    if jd_s and rs_s and conf >= 0.4:
                        cleaned.append({
                            "jd_skill": jd_s,
                            "resume_skill": rs_s,
                            "confidence": round(min(1.0, max(0.0, conf)), 2),
                            "reasoning": (it.get("reasoning", "") or "")[:300],
                        })
                return cleaned
            # if not a list: fall through to fallback
        except Exception as e:
            # budget exceeded or transient failure → fallback
            pass

        # Deterministic fallback (always returns quickly)
        fallback = _deterministic_skill_map(resume_sk, jd_sk)
        return fallback


    async def _map_experience(self, resume_entities: Dict, jd_entities: Dict) -> List[Dict]:

        prompt = (
            "Match the candidate's REAL work experience to JD responsibilities.\n"
            "\nRULES:\n"
            "- ONLY map when the resume shows concrete evidence (project, role, quantified result).\n"
            "- Do NOT map if evidence is just a lone skill in a skills list.\n"
            "- Do NOT map a responsibility if it has no direct evidence.\n"
            "- Keep reasoning brief and specific to the resume evidence used.\n"
            "- Confidence reflects strength of evidence (0.0–1.0).\n"
            "\nResume Entities:\n"
            f"{json.dumps(resume_entities)}\n\n"
            "JD Entities:\n"
            f"{json.dumps(jd_entities)}\n\n"
            "Return ONLY a JSON array. Each item:\n"
            "{'resume_experience_summary': str, 'jd_responsibility': str, 'confidence': float, 'reasoning': str}.\n"
            "Return [] if none."
            )
        
        result = await self._dispatch_to_model("map_experience", prompt)
        return result if isinstance(result, list) else []

    async def _identify_gaps(self, resume_entities: Dict, jd_entities: Dict) -> List[Dict]:
        # Print the resume and JD entities for debugging
        print("Resume Entities:", json.dumps(resume_entities, indent=2))
        print("JD Entities:", json.dumps(jd_entities, indent=2))

        prompt = (
            "Identify critical skill or experience gaps where the resume shows no direct evidence for a mandatory job requirement.\n\n"
            "Be extremely concise. Use short phrases, not full sentences.\n"
            f"IMPORTANT: Only consider actual job requirements (Responsibilities or Qualifications). Ignore company background, mission, or domain descriptions.\n"
            f"Resume:\n{json.dumps(resume_entities)}\n\n"
            f"Job Description:\n{json.dumps(jd_entities)}\n\n"
            "Return ONLY a JSON array of objects, each with keys: 'jd_requirement', 'type' ('skill_gap' or 'experience_gap'), and 'reasoning'. "
            "If no major gaps are found, return []."
        )
        
        result = await self._dispatch_to_model("identify_gaps", prompt)
        return result if isinstance(result, list) else []

    async def _identify_strong_points(self, resume_entities: Dict, jd_entities: Dict) -> List[str]:
        
        prompt = (
            "You are an expert talent analyst AI. Identify the top 3-4 most impressive, highly relevant achievements or skills from the candidate's resume that directly align with the job description.\n\n"
            "--- PRINCIPLES TO APPLY ---\n"
            "- Focus on achievements or skills that make the candidate stand out for this specific role.\n"
            "- Prefer quantified accomplishments and skills in relevant contexts.\n\n"
            f"IMPORTANT: Be extremely concise. Use short phrases, not full sentences, no 'Resume:' text, no duplication.\n"
            f"--- DATA ---\nResume entities:\n{json.dumps(resume_entities)}\n\n"
            f"Job description entities:\n{json.dumps(jd_entities)}\n\n"
            "--- OUTPUT ---\n"
            "- Return ONLY a JSON array of strings, each a summary of a strong point and the supporting resume context.\n"
            "- If none found, output an empty array."
        )
        
        result = await self._dispatch_to_model("identify_strong_points", prompt)
        return result if isinstance(result, list) else []

    async def process(self, context: DocumentContext) -> AgentResult:
        if not self.models:
            raise RuntimeError("API keys not configured for multi-model processing.")

        try:
            # Extract entities from context
            resume_entities = context.previous_results[AgentType.ENTITY_EXTRACTOR].data.get("entities", {})
            jd_entities = context.metadata.get('job_description', {}).get('entities', {})

            if not resume_entities or not jd_entities:
                raise ValueError("Missing resume or JD entities for relationship mapping.")

            # Execute all tasks in parallel with different models
            tasks = [
                self._map_skills(resume_entities, jd_entities),
                self._map_experience(resume_entities, jd_entities), 
                self._identify_gaps(resume_entities, jd_entities),
                self._identify_strong_points(resume_entities, jd_entities)
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Handle results and exceptions
            matched_skills, matched_experience, identified_gaps, strong_points = [], [], [], []
            
            for i, result in enumerate(results):
                # ✅ CancelledError inherits from BaseException, not Exception
                if isinstance(result, BaseException):
                    self.logger.error(f"Task {i} failed: {result}")
                    continue

                # ✅ Only accept lists; anything else becomes []
                val = result if isinstance(result, list) else []

                if i == 0:      # map_skills
                    matched_skills = val
                elif i == 1:    # map_experience
                    matched_experience = val
                elif i == 2:    # identify_gaps
                    identified_gaps = val
                elif i == 3:    # identify_strong_points
                    strong_points = val


            final_map = {
                "matched_skills": matched_skills if isinstance(matched_skills, list) else [],
                "matched_experience_to_responsibilities": matched_experience if isinstance(matched_experience, list) else [],
                "identified_gaps_in_resume": identified_gaps if isinstance(identified_gaps, list) else [],
                "strong_points_in_resume": strong_points if isinstance(strong_points, list) else []
            }

            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={"relationship_map": final_map},
                confidence=1.0,
                processing_time=0.0
            )

        except Exception as e:
            self.logger.error(f"Multi-model relationship mapping failed: {e}", exc_info=True)
            raise

    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "Multi-Model Parallel LLM Relationship Mapper",
            "description": "Uses different LLMs optimized for individual subtasks to improve speed and quality.",
            "models": self.task_models if self.task_models else {},
            "expected_latency": "2-4 seconds"
        }
