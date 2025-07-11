# AIService/agents/classifier_agent.py

from typing import Dict, Any, List
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import os
import json
import logging

# Import the LLM client (example using OpenAI)
from openai import AsyncOpenAI # Using AsyncOpenAI for async operations

logger = logging.getLogger(__name__)

class DocumentClassifierAgent(BaseAgent):
    """
    Agent responsible for classifying document types using a Large Language Model.
    Replaces regex/keyword matching with LLM's semantic understanding.
    """
    
    def __init__(self):
        super().__init__(AgentType.CLASSIFIER)
        
        # Initialize LLM client
        # It's recommended to load API key from environment variables for security
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.llm_model = "gpt-4o" # Or "gpt-4-turbo", "claude-3-5-sonnet-20240620", "gemini-1.5-pro"
        
        # Define the primary document types for classification specific to your project
        # We will explicitly instruct the LLM to choose from these.
        self.supported_doc_types = [
            "Resume",
            "Job Description",
            "Cover Letter",
            "Email",
            "Project Documentation",
            "Meeting Notes",
            "Financial Report",
            "Legal Contract",
            "Research Paper",
            "General Document" # Fallback for unknown types
        ]
    
    async def process(self, context: DocumentContext) -> AgentResult:
        """Classify the document using an LLM based on its content."""
        try:
            # Construct the prompt for the LLM
            # We'll use a system message to define the LLM's role and a user message for the content.
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert document classification AI. Your task is to accurately "
                        "classify the provided text into one of the predefined categories. "
                        "Return your answer as a JSON object with 'primary_classification' (string), "
                        "'confidence' (float between 0.0 and 1.0), and 'reasoning' (string explaining your choice)."
                        f"The allowed categories are: {', '.join(self.supported_doc_types)}."
                        "If the content doesn't clearly fit, classify it as 'General Document'."
                    )
                },
                {
                    "role": "user",
                    "content": f"Please classify the following document:\n\n```\n{context.content[:4000]}\n```" # Truncate large content for prompt
                }
            ]
            
            # Make the LLM API call
            # Use 'response_format={"type": "json_object"}' for stricter JSON output
            response = await self.openai_client.chat.completions.create(
                model=self.llm_model,
                messages=messages,
                response_format={"type": "json_object"}, # Ensure JSON output
                temperature=0.1 # Keep temperature low for consistent classification
            )
            
            # Parse the LLM's JSON response
            llm_output = json.loads(response.choices[0].message.content)
            
            classification = llm_output.get("primary_classification", "General Document")
            confidence = llm_output.get("confidence", 0.0)
            reasoning = llm_output.get("reasoning", "")
            
            # Ensure confidence is within bounds
            confidence = max(0.0, min(1.0, float(confidence)))
            
            # The LLM implicitly handles keyword and pattern matching through its training.
            # We're relying on its semantic understanding for primary classification.
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "primary_classification": classification,
                    "confidence": confidence,
                    "reasoning": reasoning, # Include LLM's reasoning for transparency
                    "file_type": context.file_type # Keep original file type
                },
                confidence=confidence,
                processing_time=response.usage.total_tokens * 0.001 # Simple estimate, actual timing handled by _execute_with_timing
            )
            
        except Exception as e:
            self.logger.error(f"LLM-based classification failed: {str(e)}", exc_info=True)
            # Raise the exception so _execute_with_timing can catch and report it
            raise 
    
    def _extract_metadata(self, content: str, doc_type: str) -> Dict[str, Any]:
        """
        Extract type-specific metadata using LLM if needed, or simple properties.
        NOTE: For a pure LLM approach, this could also be done via a separate LLM call
        or integrated into the main classification prompt using function calling.
        For now, keeping basic properties and noting potential for LLM enhancement.
        """
        metadata = {
            "word_count": len(content.split()),
            "line_count": len(content.split('\n')),
            # LLMs can identify tables/lists too, but it's more complex. Keeping simple for now.
            "has_tables": None, 
            "has_lists": None 
        }
        
        # If you want LLM-driven metadata extraction:
        # You'd send another prompt here or use function calling in the main prompt
        # E.g., asking for 'from', 'to', 'subject' if doc_type is 'email'
        
        return metadata
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "LLM-Powered Document Classifier",
            "description": "Classifies documents into predefined categories using advanced LLM semantic understanding.",
            "supported_types": self.supported_doc_types,
            "features": [
                "LLM-based semantic classification",
                "Confidence scoring (LLM-derived)",
                "Transparent reasoning from LLM",
                "Flexible classification across diverse document types"
            ]
        }