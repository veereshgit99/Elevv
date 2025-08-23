# AIService/agents/classifier_agent.py

import os
import re
import json
import math
import asyncio
import logging
from typing import Dict, Any
from services.utils import _safe_json

from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai

from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext

logger = logging.getLogger(__name__)

# --- Configure the Gemini client at the module level ---
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

SUPPORTED = ["Resume", "Job Description", "Other"]

def _normalize_label(label: str) -> str:
    """Map model free-form labels back to our canonical set."""
    if not label:
        return "Other"
    l = label.strip().lower()
    if l in {"resume", "cv", "résumé"}:
        return "Resume"
    if l in {"job description", "jd", "job post", "job posting", "posting", "role description"}:
        return "Job Description"
    # fuzzy contains
    if "resume" in l or "curriculum vitae" in l or "cv" == l:
        return "Resume"
    if "job" in l and ("description" in l or "posting" in l or "responsibilit" in l or "requirements" in l):
        return "Job Description"
    return "Other"

def _heuristic_classify(text: str) -> str:
    """Tiny heuristic fallback if LLM returns non-JSON or is blocked."""
    t = (text or "").lower()
    # Heuristics for JD
    jd_signals = sum([
        ("responsibilit" in t),
        ("requirements" in t),
        ("preferred qualifications" in t),
        ("what you will do" in t),
        ("about the role" in t),
        ("job description" in t),
        ("we are looking for" in t),
    ])
    # Heuristics for Resume
    resume_signals = sum([
        ("education" in t),
        ("experience" in t),
        ("skills" in t),
        ("projects" in t),
        ("summary" in t),
        ("work experience" in t),
        ("achievements" in t),
    ])
    if jd_signals >= max(2, resume_signals + 1):
        return "Job Description"
    if resume_signals >= max(2, jd_signals + 1):
        return "Resume"
    return "Other"

class DocumentClassifierAgent(BaseAgent):
    """
    Agent responsible for classifying document types using Google Gemini.
    """
    def __init__(self):
        super().__init__(AgentType.CLASSIFIER)
        if genai:
            # keep your existing fast model
            self.llm_model = genai.GenerativeModel("gemini-2.5-flash-lite")
        else:
            self.llm_model = None
        self.supported_doc_types = SUPPORTED

    async def _call_llm(self, system_prompt: str, user_prompt: str, retries: int = 2) -> Any:
        """
        Call Gemini with small exponential backoff. Keeps your MIME type = JSON.
        """
        last_err = None
        for attempt in range(retries + 1):
            try:
                return await self.llm_model.generate_content_async(
                    [system_prompt, user_prompt],
                    generation_config={
                        "response_mime_type": "application/json",
                        "temperature": 0.0,
                        "max_output_tokens": 1024
                    },
                    safety_settings=GEMINI_SAFETY_SETTINGS
                )
            except Exception as e:
                last_err = e
                # small backoff: 0.2s, 0.4s, 0.8s
                await asyncio.sleep(0.2 * (2 ** attempt))
        raise last_err

    async def process(self, context: DocumentContext) -> AgentResult:
        """Classify the document using Gemini based on its content."""
        if not self.llm_model:
            raise RuntimeError("Gemini client not initialized. Check GOOGLE_API_KEY.")

        try:
            # 1) quick input validation
            if not context.content or len(context.content.strip()) < 50:
                self.logger.warning("Content is too short or empty. Defaulting to 'Other'.")
                return AgentResult(
                    agent_type=self.agent_type,
                    success=True,
                    data={"primary_classification": "Other",
                          "confidence": 0.15,
                          "reasoning": "Input content was empty or too short.",
                          "file_type": getattr(context, "file_type", None),
                          "llm_model_used": "gemini-2.5-flash-lite"}
                )

            system_prompt = (
                "You are an expert document classification AI. Your task is to accurately "
                "classify the provided text into one of the predefined categories. "
                "Return your answer as a JSON object with 'primary_classification' (string), "
                "'confidence' (float between 0.0 and 1.0), and 'reasoning' (string explaining your choice).\n"
                f"The allowed categories are: {', '.join(self.supported_doc_types)}.\n"
                "If the content doesn't clearly fit, classify it as 'Other'."
            )
            user_prompt = f"Please classify the following document:\n\n```\n{context.content}\n```"

            # 2) call LLM with retry
            response = await self._call_llm(system_prompt, user_prompt, retries=2)

            # 3) safety block / empty guards (Gemini can return no parts if blocked)
            #    Some SDK versions expose prompt_feedback or candidates; guard both.
            blocked = False
            try:
                if hasattr(response, "prompt_feedback") and response.prompt_feedback and getattr(response.prompt_feedback, "block_reason", None):
                    blocked = True
            except Exception:
                pass
            if (not getattr(response, "parts", None)) and blocked:
                raise ValueError(f"API call blocked by safety filter.")

            # 4) robust JSON parsing
            raw_text = getattr(response, "text", None) or ""
            try:
                llm_output = _safe_json(raw_text)
            except Exception as parse_err:
                # fallback: heuristic classification instead of failing
                self.logger.warning(f"LLM JSON parse failed, using heuristic fallback: {parse_err}")
                guessed = _heuristic_classify(context.content)
                return AgentResult(
                    agent_type=self.agent_type,
                    success=True,
                    data={
                        "primary_classification": guessed,
                        "confidence": 0.35 if guessed != "Other" else 0.25,
                        "reasoning": "LLM returned non-JSON. Applied heuristic fallback based on document cues.",
                        "file_type": getattr(context, "file_type", None),
                        "llm_model_used": "gemini-2.5-flash-lite",
                        "raw_llm_output": raw_text[:2000],  # truncated for debug
                    },
                    confidence=0.35 if guessed != "Other" else 0.25,
                    processing_time=0.0
                )

            if not llm_output:
                raise ValueError("Empty response from Gemini.")

            # 5) normalize + validate fields
            classification = _normalize_label(llm_output.get("primary_classification", "Other"))
            if classification not in self.supported_doc_types:
                classification = "Other"

            try:
                confidence = float(llm_output.get("confidence", 0.0))
            except Exception:
                confidence = 0.0
            confidence = max(0.0, min(1.0, confidence))

            reasoning = llm_output.get("reasoning", "")

            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "primary_classification": classification,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "file_type": getattr(context, "file_type", None),
                    "llm_model_used": "gemini-2.5-flash-lite"
                },
                confidence=confidence,
                processing_time=0.0
            )

        except Exception as e:
            # Final guard: do not crash the pipeline on JSON/safety/transient errors
            self.logger.error(f"Gemini-based classification failed: {str(e)}", exc_info=True)
            # Soft-land with heuristic to avoid breaking downstream agents
            guessed = _heuristic_classify(getattr(context, "content", "") or "")
            return AgentResult(
                agent_type=self.agent_type,
                success=True,  # keep pipeline moving
                data={
                    "primary_classification": guessed,
                    "confidence": 0.25,
                    "reasoning": f"Fallback due to error: {e}",
                    "file_type": getattr(context, "file_type", None),
                    "llm_model_used": "gemini-2.5-flash-lite"
                },
                confidence=0.25,
                processing_time=0.0
            )

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "name": "LLM-Powered Document Classifier (Gemini)",
            "description": "Classifies documents into predefined categories using advanced LLM semantic understanding.",
            "supported_types": self.supported_doc_types,
            "features": [
                "LLM-based semantic classification",
                "Confidence scoring (LLM-derived)",
                "Transparent reasoning from LLM",
                "Flexible classification across diverse document types"
            ]
        }
