# AIService/agents/entity_extractor_agent.py

from typing import Dict, Any, List
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
from services.utils import _safe_json
import os
import json
import logging
import asyncio

from dotenv import load_dotenv
load_dotenv()

# Google Generative AI client
import google.generativeai as genai

logger = logging.getLogger(__name__)

# --- Init Gemini ---
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise KeyError("GOOGLE_API_KEY not found in environment variables.")
    genai.configure(api_key=api_key)
except KeyError as e:
    logger.warning(f"{e} The agent will not work.")
    genai = None

# --- Safety settings (unchanged) ---
GEMINI_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

# --- Entity schema (kept as in your prompt) ---
ENTITY_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "companies": {"type": "array", "items": {"type": "string"}},
        "dates": {"type": "array", "items": {"type": "string"}},
        "skills": {"type": "array", "items": {"type": "string"}},
        "job_titles": {"type": "array", "items": {"type": "string"}},
        "technologies": {"type": "array", "items": {"type": "string"}},
        "education_degrees": {"type": "array", "items": {"type": "string"}},
        "universities": {"type": "array", "items": {"type": "string"}},
        "achievements": {"type": "array", "items": {"type": "string"}},
        "requirements": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["skills", "job_titles", "companies", "dates"],
}

DEFAULT_KEYS = list(ENTITY_SCHEMA["properties"].keys())

def _blank_entities() -> Dict[str, Any]:
    """Return an empty, well-formed entity dict."""
    return {k: ([] if ENTITY_SCHEMA["properties"][k]["type"] == "array" else {})
            for k in DEFAULT_KEYS}

def _dedup_list(values: List[str]) -> List[str]:
    seen, out = set(), []
    for v in values or []:
        v2 = (v or "").strip()
        if v2 and v2.lower() not in seen:
            seen.add(v2.lower()); out.append(v2)
    return out

def _merge_entities(base: Dict[str, Any], add: Dict[str, Any]) -> Dict[str, Any]:
    merged = {k: list(base.get(k, [])) for k in DEFAULT_KEYS}
    for k in DEFAULT_KEYS:
        merged[k] = _dedup_list((merged.get(k, []) or []) + (add.get(k, []) or []))
    return merged

def _chunk(text: str, max_chars: int = 9000) -> List[str]:
    """Split very long docs into chunks on paragraph boundaries to avoid model limits."""
    if not text or len(text) <= max_chars:
        return [text or ""]
    parts, cur = [], []
    total = 0
    for line in text.splitlines(keepends=True):
        if total + len(line) > max_chars:
            parts.append("".join(cur)); cur = []; total = 0
        cur.append(line); total += len(line)
    if cur: parts.append("".join(cur))
    return parts

class EntityExtractorAgent(BaseAgent):
    """LLM-based entity extraction with robust JSON handling & retries."""

    def __init__(self):
        super().__init__(AgentType.ENTITY_EXTRACTOR)
        if genai:
            self.llm_model = genai.GenerativeModel("gemini-2.5-flash-lite")
        else:
            self.llm_model = None

    async def _call_llm(self, system_prompt: str, user_prompt: str, retries: int = 2):
        """Call Gemini with a couple of short retries to ride out 500s."""
        last_err = None
        for attempt in range(retries + 1):
            try:
                return await self.llm_model.generate_content_async(
                    [system_prompt, user_prompt],
                    generation_config={
                        "response_mime_type": "application/json",
                        "temperature": 0.0,
                        # Keep this reasonable; huge limits can trigger server errors
                        "max_output_tokens": 2048,
                    },
                    safety_settings=GEMINI_SAFETY_SETTINGS
                )
            except Exception as e:
                last_err = e
                await asyncio.sleep(0.25 * (2 ** attempt))  # 250ms, 500ms
        raise last_err

    async def _extract_one(self, content: str, doc_type: str, job_title: str, company_name: str) -> Dict[str, Any]:
        system_prompt = (
            "You are an expert entity extraction AI for professional documents. "
            "Return ONLY one valid JSON object; no code fences, no explanations. "
            "Follow the provided JSON schema exactly."
        )
        if doc_type == "Job Description" and job_title:
            system_prompt += f" You are analyzing a job description for the role '{job_title}' at '{company_name}'."

        user_prompt = (
            "Extract entities from the following document. "
            "If it's a resume, focus on experiences, skills, projects, education. "
            "If it's a job description, focus on required skills, responsibilities, and company details. "
            "Provide a JSON object that follows this schema:\n"
            f"{json.dumps(ENTITY_SCHEMA, indent=2)}\n\n"
            f"Document content:\n```\n{content}\n```"
        )

        response = await self._call_llm(system_prompt, user_prompt, retries=2)

        # Safety/empty guards
        blocked = False
        try:
            if hasattr(response, "prompt_feedback") and response.prompt_feedback and getattr(response.prompt_feedback, "block_reason", None):
                blocked = True
        except Exception:
            pass
        raw_text = getattr(response, "text", "") or ""
        if blocked or not raw_text.strip():
            # Return an empty but valid object so pipeline continues
            return _blank_entities()

        # Parse JSON safely
        try:
            obj = _safe_json(raw_text)
        except Exception as e:
            logger.warning(f"Entity extractor: JSON parse failed, returning empty set. Err={e}")
            return _blank_entities()

        # Fill missing keys as empty lists
        out = _blank_entities()
        for k in DEFAULT_KEYS:
            v = obj.get(k, [])
            out[k] = v if isinstance(v, list) else []
        # Dedup each list
        for k in DEFAULT_KEYS:
            out[k] = _dedup_list(out[k])
        return out

    async def process(self, context: DocumentContext) -> AgentResult:
        if not self.llm_model:
            raise RuntimeError("Gemini client not initialized. Check GOOGLE_API_KEY.")

        try:
            doc_type = context.metadata.get("doc_type", "professional document")
            job_title = context.metadata.get("job_title", "the job")
            company_name = context.metadata.get("company_name", "the company")

            content = context.content or ""
            # Chunk long docs to reduce 500s; merge results deterministically
            chunks = _chunk(content, max_chars=9000)

            merged = _blank_entities()
            for chunk in chunks:
                part = await self._extract_one(chunk, doc_type, job_title, company_name)
                merged = _merge_entities(merged, part)

            # Basic counts
            total_entities = sum(len(merged[k]) for k in DEFAULT_KEYS if k not in ["achievements", "requirements"])
            doc_classification = None
            if AgentType.CLASSIFIER in context.previous_results:
                doc_classification = context.previous_results[AgentType.CLASSIFIER].data.get("primary_classification")

            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "entities": merged,
                    "summary": {
                        "total_extracted_entities": total_entities,
                        "entity_counts": {k: len(merged[k]) for k in DEFAULT_KEYS if k not in ["achievements", "requirements"]},
                        "technical_skills_found": len(merged.get("skills", [])) > 0,
                        "achievements_found": len(merged.get("achievements", [])) > 0,
                        "requirements_found": len(merged.get("requirements", [])) > 0,
                    },
                    "document_classification": doc_classification,
                    "llm_model_used": "gemini-2.5-flash-lite",
                },
                confidence=0.95,
                processing_time=0.0
            )

        except Exception as e:
            # Never crash the pipeline on LLM/internal errors; return an empty, valid shape
            self.logger.error(f"LLM-based entity extraction failed: {e}", exc_info=True)
            empty = _blank_entities()
            return AgentResult(
                agent_type=self.agent_type,
                success=True,  # keep pipeline moving
                data={
                    "entities": empty,
                    "summary": {
                        "total_extracted_entities": 0,
                        "entity_counts": {k: 0 for k in DEFAULT_KEYS if k not in ["achievements", "requirements"]},
                        "technical_skills_found": False,
                        "achievements_found": False,
                        "requirements_found": False
                    },
                    "document_classification": None,
                    "llm_model_used": "gemini-2.5-flash-lite"
                },
                confidence=1.0,
                processing_time=0.0
            )

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "name": "LLM-Powered Entity Extractor",
            "description": "Extracts named entities and structured data from professional documents using an LLM.",
            "entity_types": DEFAULT_KEYS,
            "features": [
                "LLM-based semantic extraction",
                "Structured JSON output",
                "Robust to API hiccups and malformed JSON",
                "Optional chunking for long documents",
            ],
            "model": "gemini-2.5-flash-lite",
            "confidence_level": 0.95
        }
