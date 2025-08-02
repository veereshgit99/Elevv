# AIService/agents/entity_extractor_agent.py

from typing import Dict, Any
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import os
import json
import logging

from dotenv import load_dotenv
load_dotenv()

#Google Generative AI client
import google.generativeai as genai

logger = logging.getLogger(__name__)

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

class EntityExtractorAgent(BaseAgent):
    """
    Agent responsible for extracting entities from documents using a Large Language Model.
    """
    
    def __init__(self):
        super().__init__(AgentType.ENTITY_EXTRACTOR)
        
        if genai:
            self.llm_model = genai.GenerativeModel("gemini-2.5-flash")
        else:
            self.llm_model = None
        self.logger.info("LLM-based EntityExtractorAgent initialized with model: Gemini 2.5 Flash")

        
    async def process(self, context: DocumentContext) -> AgentResult:
        """Extract entities from the document using an LLM."""
        try:
            # Define the schema for the desired JSON output from the LLM.
            # This helps the LLM understand what structured data you expect.
            entity_schema = {
                "type": "object",
                "properties": {
                    "companies": {"type": "array", "items": {"type": "string", "description": "Companies, institutions, or other organizations"}},
                    "dates": {"type": "array", "items": {"type": "string", "description": "Dates or time periods (e.g., 'Jan 2024 - Dec 2025', '2023')"}},
                    "skills": {"type": "array", "items": {"type": "string", "description": "Technical and soft skills (e.g., 'Python', 'Machine Learning', 'Agile')"}},
                    "job_titles": {"type": "array", "items": {"type": "string", "description": "Titles of positions held or sought"}},
                    "technologies": {"type": "array", "items": {"type": "string", "description": "Specific tools, frameworks, libraries (e.g., 'YOLOv8', 'React', 'ChromaDB')"}},
                    "education_degrees": {"type": "array", "items": {"type": "string", "description": "Academic degrees obtained (e.g., 'Master\'s in Computer Science', 'B.Tech')"}},
                    "universities": {"type": "array", "items": {"type": "string", "description": "Educational institutions"}},
                    "achievements": {"type": "array", "items": {"type": "string", "description": "Quantifiable accomplishments or significant contributions"}},
                    "requirements": {"type": "array", "items": {"type": "string", "description": "Specific requirements extracted from a Job Description"}},
                },
                "required": ["skills", "job_titles", "companies", "dates"] # Ensure these common ones are always present
            }
            
            # --- NEW: Get the job title and company from the context metadata ---
            # The orchestrator will place this information here.
            doc_type = context.metadata.get("doc_type", "professional document") # Default value
            job_title = context.metadata.get("job_title", "the job")
            company_name = context.metadata.get("company_name", "the company")

            # Construct the prompt for the LLM
            # We provide a clear role and instructions for structured extraction.
            system_prompt = (
                "You are an expert entity extraction AI, specialized in analyzing professional documents. "
                "Your goal is to accurately identify and extract various types of entities from the provided text "
                "according to the specified JSON schema. Ensure all extracted entities are clean, relevant, and deduplicated. "
                "Do not include any conversational text outside the JSON output."
                "Output ONLY a single valid JSON object. Follow the 'entity_schema' structure. Do NOT include any explanation, code fences, or preamble."
            )
            
            # Add more specific context if we know it's a JD
            if doc_type == "Job Description" and job_title:
                 system_prompt += f" You are analyzing a job description for the role of '{job_title}' at '{company_name}'."
            
            user_prompt = (
                f"Extract entities from the following document. "
                "If the document is a resume, focus on the candidate's experiences, skills, projects, and education. "
                "If it's a job description, focus on required skills, responsibilities, and company details. "
                "Provide all extracted entities in a JSON object strictly following this schema:\n"
                f"{json.dumps(entity_schema, indent=2)}\n\n"
                f"Document content:\n```\n{context.content}\n```"
            )
            
            
            # Make the LLM API call, enforcing JSON output
            response = await self.llm_model.generate_content_async(
                [system_prompt, user_prompt],  # Pass prompts as a list
                generation_config={"response_mime_type": "application/json", "temperature": 0.0, "max_output_tokens": 5000},
                safety_settings=GEMINI_SAFETY_SETTINGS
            )
            llm_output = json.loads(response.text)
            
            # Basic validation of extracted data (can be expanded)
            if not isinstance(llm_output, dict):
                raise ValueError("LLM did not return a valid JSON object.")
            
            # Fill missing keys with empty lists/objects if not present in LLM output
            extracted_entities = {}
            for prop, details in entity_schema['properties'].items():
                if prop == "contact_info":
                    extracted_entities[prop] = llm_output.get(prop, {})
                    for sub_prop in details['properties']:
                        if sub_prop not in extracted_entities[prop]:
                            extracted_entities[prop][sub_prop] = []
                else:
                    extracted_entities[prop] = llm_output.get(prop, [])
            
            # Calculate summary statistics (can be refined based on specific needs)
            total_entities = sum(len(v) for k, v in extracted_entities.items() if k not in ["contact_info", "achievements", "requirements"])
            
            # Check document classification from previous agent (if available)
            doc_classification = None
            if AgentType.CLASSIFIER in context.previous_results:
                doc_classification = context.previous_results[AgentType.CLASSIFIER].data.get("primary_classification")
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "entities": extracted_entities,
                    "summary": {
                        "total_extracted_entities": total_entities,
                        "entity_counts": {k: len(v) for k, v in extracted_entities.items() if k not in ["contact_info", "achievements", "requirements"]},
                        "has_contact_info": bool(extracted_entities.get("contact_info", {}).get("emails") or extracted_entities.get("contact_info", {}).get("phones")),
                        "technical_skills_found": len(extracted_entities.get("skills", [])) > 0,
                        "achievements_found": len(extracted_entities.get("achievements", [])) > 0,
                        "requirements_found": len(extracted_entities.get("requirements", [])) > 0
                    },
                    "document_classification": doc_classification,
                    "llm_model_used": "gemini-2.5-flash"
                },
                confidence=0.95, # Higher confidence as LLMs are generally more robust
                processing_time=0.0 # Will be updated by _execute_with_timing in BaseAgent
            )
            
        except json.JSONDecodeError as e:
            self.logger.error(f"LLM returned invalid JSON for Entity Extraction: {e}", exc_info=True)
            raise ValueError(f"Failed to parse LLM response: Invalid JSON. {e}")
        except Exception as e:
            self.logger.error(f"LLM-based entity extraction failed: {str(e)}", exc_info=True)
            raise

    # Removed _is_tech_term, _is_education_term, _is_education_degree,
    # _extract_pattern, _extract_skills, _deduplicate_entities as LLM handles these.
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "LLM-Powered Entity Extractor",
            "description": "Extracts various named entities and structured data from documents using advanced LLM semantic understanding.",
            "entity_types": list(self.entity_schema['properties'].keys()), # Dynamically list based on schema
            "features": [
                "LLM-based semantic entity extraction",
                "Structured JSON output",
                "Dynamic entity type support through prompt engineering",
                "High accuracy for diverse document types (resumes, JDs)",
                "No reliance on manual regex or pre-trained spaCy models for core extraction"
            ],
            "model": self.llm_model,
            "confidence_level": 0.95 # Reflects expected LLM performance
        }