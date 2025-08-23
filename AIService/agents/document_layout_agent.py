# AIService/agents/document_layout_agent.py

import os
import json
import logging
import re
import asyncio
from typing import Dict, Any, List

import google.generativeai as genai
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
from services.utils import _safe_json

logger = logging.getLogger(__name__)

# --- Standard Gemini Configuration ---
try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
except KeyError:
    logger.warning("GOOGLE_API_KEY not found. The agent will not work.")
    genai = None

GEMINI_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

MODEL_NAME = "gemini-2.5-flash-lite"

def _chunk(text: str, max_chars: int = 9000) -> List[str]:
    """Split long documents on line boundaries to avoid server-side 500s."""
    if not text or len(text) <= max_chars:
        return [text or ""]
    parts, cur, total = [], [], 0
    for line in text.splitlines(keepends=True):
        if total + len(line) > max_chars:
            parts.append("".join(cur))
            cur, total = [], 0
        cur.append(line)
        total += len(line)
    if cur:
        parts.append("".join(cur))
    return parts


def _merge_sections(a: Dict[str, str], b: Dict[str, str]) -> Dict[str, str]:
    """Merge two section dicts; for duplicate keys, append with a separating newline."""
    out = dict(a)
    for k, v in (b or {}).items():
        if not v:
            continue
        if k in out and out[k]:
            out[k] = f"{out[k].rstrip()}\n\n{v.lstrip()}"
        else:
            out[k] = v
    return out


class DocumentLayoutAgent(BaseAgent):
    """
    Identifies logical sections of a document using a fast LLM.
    Robust to transient 500s and non-JSON outputs.
    """

    def __init__(self):
        super().__init__(AgentType.LAYOUT_ANALYZER)
        if genai:
            self.llm_model = genai.GenerativeModel(MODEL_NAME)
        else:
            self.llm_model = None
        self.logger.info(f"DocumentLayoutAgent initialized with model: {MODEL_NAME}")

    async def _call_llm(self, system_prompt: str, user_prompt: str, retries: int = 2):
        """Call Gemini with small exponential backoff to ride out sporadic 500s."""
        last_err = None
        for attempt in range(retries + 1):
            try:
                return await self.llm_model.generate_content_async(
                    [system_prompt, user_prompt],
                    generation_config={
                        "response_mime_type": "application/json",
                        "temperature": 0.0,
                        "max_output_tokens": 2048,  # keep reasonable; large values can trigger 500s
                    },
                    safety_settings=GEMINI_SAFETY_SETTINGS,
                )
            except Exception as e:
                last_err = e
                await asyncio.sleep(0.25 * (2 ** attempt))  # 250ms, 500ms
        raise last_err

    async def _analyze_one(self, content: str) -> Dict[str, str]:
        system_prompt = (
            "You are a document structure analysis AI. Identify primary logical sections of the document "
            "(e.g., 'Summary', 'Work Experience', 'Skills', 'Education', 'Responsibilities', 'Qualifications'). "
            "Return a single JSON object where each key is a section title you identified and the value is the "
            "complete, unmodified text content of that section. Do not invent sections. Output only the JSON."
        )
        user_prompt = f"Analyze the following document and extract its sections:\n\n---\n{content}\n---"

        response = await self._call_llm(system_prompt, user_prompt, retries=2)

        # Some SDKs expose blocking via prompt_feedback; also guard empty text.
        raw_text = getattr(response, "text", "") or ""
        if not raw_text.strip():
            return {"full_content": content}

        try:
            sections = _safe_json(raw_text)
        except Exception:
            # Non-JSON or fenced output – fall back to full content for this chunk
            return {"full_content": content}

        if not isinstance(sections, dict) or not sections:
            return {"full_content": content}

        # Ensure values are strings
        normalized = {str(k): (str(v) if v is not None else "") for k, v in sections.items()}
        return normalized

    async def process(self, context: DocumentContext) -> AgentResult:
        if not self.llm_model:
            raise RuntimeError("Gemini API key not configured.")

        try:
            content = context.content or ""
            chunks = _chunk(content, max_chars=9000)

            merged_sections: Dict[str, str] = {}
            for ch in chunks:
                part = await self._analyze_one(ch)
                merged_sections = _merge_sections(merged_sections, part)

            if not merged_sections:
                merged_sections = {"full_content": content}

            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={"sections": merged_sections, "llm_model_used": MODEL_NAME},
                confidence=1,
                processing_time=0.0,  # will be filled by timing wrapper upstream
            )
        except Exception as e:
            self.logger.error(f"Document layout analysis failed: {e}", exc_info=True)
            return AgentResult(
                agent_type=self.agent_type,
                success=True,  # keep pipeline moving with a safe fallback
                data={"sections": {"full_content": context.content}, "llm_model_used": MODEL_NAME},
                confidence=1,
                processing_time=0.0,
            )

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "name": "LLM-Powered Document Layout Analyzer",
            "description": "Intelligently splits a document into logical sections using a fast LLM.",
            "input_requirements": ["Full text content of a document"],
            "output_format": "JSON object of document sections",
            "model": MODEL_NAME,
        }
