# AIService/agents/classifier_agent.py

import os
import json
import logging
from typing import Dict, Any

# Load environment variables at the start
from dotenv import load_dotenv
load_dotenv()

# Import the Google Generative AI client
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

class DocumentClassifierAgent(BaseAgent):
    """
    Agent responsible for classifying document types using Google Gemini.
    """
    def __init__(self):
        super().__init__(AgentType.CLASSIFIER)
        # Initialize the Gemini model. Use 'gemini-1.5-flash' for speed.
        if genai:
            self.llm_model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.llm_model = None
        self.supported_doc_types = ["Resume", "Job Description", "Other"]

    async def process(self, context: DocumentContext) -> AgentResult:
        """Classify the document using Gemini based on its content."""
        if not self.llm_model:
            raise RuntimeError("Gemini client not initialized. Check GOOGLE_API_KEY.")

        try:
            system_prompt = (
                "You are an expert document classification AI. Your task is to accurately "
                "classify the provided text into one of the predefined categories. "
                "Return your answer as a JSON object with 'primary_classification' (string), "
                "'confidence' (float between 0.0 and 1.0), and 'reasoning' (string explaining your choice).\n"
                f"The allowed categories are: {', '.join(self.supported_doc_types)}.\n"
                "If the content doesn't clearly fit, classify it as 'Other'."
            )
            user_prompt = f"Please classify the following document:\n\n```\n{context.content}\n```"

            response = await self.llm_model.generate_content_async(
                [system_prompt, user_prompt],  # Pass prompts as a list
                generation_config={"response_mime_type": "application/json"},
                safety_settings=GEMINI_SAFETY_SETTINGS
            )
            llm_output = json.loads(response.text)
            if not llm_output:
                raise ValueError("Empty response from Gemini.")

            classification = llm_output.get("primary_classification", "Other")
            confidence = max(0.0, min(1.0, float(llm_output.get("confidence", 0.0))))
            reasoning = llm_output.get("reasoning", "")

            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "primary_classification": classification,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "file_type": context.file_type
                },
                confidence=confidence,
                processing_time=0.0
            )
        except Exception as e:
            self.logger.error(f"Gemini-based classification failed: {str(e)}", exc_info=True)
            raise

    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
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