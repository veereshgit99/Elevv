# AIService/agents/entity_extractor_agent.py

from typing import Dict, Any, List, Optional
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import os
import json
import logging

# Import the LLM client (example using OpenAI)
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class EntityExtractorAgent(BaseAgent):
    """
    Agent responsible for extracting entities from documents using a Large Language Model.
    Replaces spaCy and regex with LLM's semantic understanding.
    """
    
    def __init__(self):
        super().__init__(AgentType.ENTITY_EXTRACTOR)
        
        # Initialize LLM client
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.llm_model = "gpt-4o" # Choose your desired LLM model
        self.logger.info(f"LLM-based EntityExtractorAgent initialized with model: {self.llm_model}")
        
    async def process(self, context: DocumentContext) -> AgentResult:
        """Extract entities from the document using an LLM."""
        try:
            # Define the schema for the desired JSON output from the LLM.
            # This helps the LLM understand what structured data you expect.
            entity_schema = {
                "type": "object",
                "properties": {
                    "people": {"type": "array", "items": {"type": "string", "description": "Names of individuals"}},
                    "organizations": {"type": "array", "items": {"type": "string", "description": "Companies, institutions, or other organizations"}},
                    "locations": {"type": "array", "items": {"type": "string", "description": "Geographical locations"}},
                    "dates": {"type": "array", "items": {"type": "string", "description": "Dates or time periods (e.g., 'Jan 2024 - Dec 2025', '2023')"}},
                    "money": {"type": "array", "items": {"type": "string", "description": "Monetary values (e.g., '$50K', '20%)"}}, # Including percentages here as they often relate to metrics
                    "skills": {"type": "array", "items": {"type": "string", "description": "Technical and soft skills (e.g., 'Python', 'Machine Learning', 'Agile')"}},
                    "job_titles": {"type": "array", "items": {"type": "string", "description": "Titles of positions held or sought"}},
                    "technologies": {"type": "array", "items": {"type": "string", "description": "Specific tools, frameworks, libraries (e.g., 'YOLOv8', 'React', 'ChromaDB')"}},
                    "education_degrees": {"type": "array", "items": {"type": "string", "description": "Academic degrees obtained (e.g., 'Master\'s in Computer Science', 'B.Tech')"}},
                    "universities": {"type": "array", "items": {"type": "string", "description": "Educational institutions"}},
                    "contact_info": {
                        "type": "object",
                        "properties": {
                            "emails": {"type": "array", "items": {"type": "string", "format": "email"}},
                            "phones": {"type": "array", "items": {"type": "string"}},
                            "urls": {"type": "array", "items": {"type": "string", "format": "uri"}}
                        }
                    },
                    "achievements": {"type": "array", "items": {"type": "string", "description": "Quantifiable accomplishments or significant contributions"}},
                    "requirements": {"type": "array", "items": {"type": "string", "description": "Specific requirements extracted from a Job Description"}},
                    "gpa": {"type": "array", "items": {"type": "string", "description": "GPA values (e.g., '3.9 GPA')"}}
                },
                "required": ["skills", "job_titles", "companies", "dates"] # Ensure these common ones are always present
            }

            # Construct the prompt for the LLM
            # We provide a clear role and instructions for structured extraction.
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert entity extraction AI, specialized in analyzing professional documents "
                        "like resumes and job descriptions. Your goal is to accurately identify and extract "
                        "various types of entities from the provided text according to the specified JSON schema. "
                        "Ensure all extracted entities are clean, relevant, and deduplicated. "
                        "Do not include any conversational text outside the JSON output."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Extract entities from the following document. "
                        "If the document is a resume, focus on the candidate's experiences, skills, projects, and education. "
                        "If it's a job description, focus on required skills, responsibilities, and company details. "
                        "Provide all extracted entities in a JSON object strictly following this schema:\n"
                        f"{json.dumps(entity_schema, indent=2)}\n\n"
                        f"Document content:\n```\n{context.content[:10000]}\n```" # Truncate for LLM context, adjust as needed
                    )
                }
            ]
            
            # Make the LLM API call, enforcing JSON output
            response = await self.openai_client.chat.completions.create(
                model=self.llm_model,
                messages=messages,
                response_format={"type": "json_object"}, # Ensures JSON output
                temperature=0.0 # Keep temperature low for precise extraction
            )
            
            # Parse the LLM's JSON response
            llm_extracted_data = json.loads(response.choices[0].message.content)
            
            # Basic validation of extracted data (can be expanded)
            if not isinstance(llm_extracted_data, dict):
                raise ValueError("LLM did not return a valid JSON object.")
            
            # Fill missing keys with empty lists/objects if not present in LLM output
            extracted_entities = {}
            for prop, details in entity_schema['properties'].items():
                if prop == "contact_info":
                    extracted_entities[prop] = llm_extracted_data.get(prop, {})
                    for sub_prop in details['properties']:
                        if sub_prop not in extracted_entities[prop]:
                            extracted_entities[prop][sub_prop] = []
                else:
                    extracted_entities[prop] = llm_extracted_data.get(prop, [])
            
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
                    "llm_model_used": self.llm_model
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