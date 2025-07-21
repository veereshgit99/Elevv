# AIService/agents/relationship_mapper_agent.py

from typing import Dict, Any
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import os
import json
import logging

import google.generativeai as genai

logger = logging.getLogger(__name__)

from dotenv import load_dotenv
load_dotenv()

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

class RelationshipMapperAgent(BaseAgent):
    """
    Agent responsible for mapping relationships between entities extracted from
    a resume and a job description using a Large Language Model.
    """
    
    def __init__(self):
        super().__init__(AgentType.RELATIONSHIP_MAPPER)
        
        if genai:
            self.llm_model = genai.GenerativeModel("gemini-1.5-pro")
        else:
            self.llm_model = None
        self.logger.info("LLM-based RelationshipMapperAgent initialized with model: Gemini 1.5 Pro")

    async def process(self, context: DocumentContext) -> AgentResult:
        """
        Maps relationships between entities in a resume and a job description.
        Requires entity extraction results for both documents from previous agents.
        """
        try:
            # Ensure we have classification and entity extraction results for both resume and JD
            if not context.previous_results:
                raise ValueError("RelationshipMapperAgent requires previous agent results (Classifier, EntityExtractor).")
            
            # Retrieve extracted entities for the resume (assume it's the primary content)
            resume_entities_result = context.previous_results.get(AgentType.ENTITY_EXTRACTOR)
            if not resume_entities_result or not resume_entities_result.success:
                raise ValueError("Failed to get entity extraction results for resume.")
            resume_entities = resume_entities_result.data.get("entities", {})
            
            # We need the JD content and its entities.
            # In your orchestrator, you'll pass both resume and JD through the pipeline.
            # For now, let's assume JD content/entities are available in context.metadata
            # This design needs the orchestrator to manage multiple document contexts.
            
            # --- IMPORTANT ORCHESTRATOR NOTE ---
            # For multi-document processing (resume vs. JD), your orchestrator needs
            # to collect results for BOTH the resume AND the JD before calling this agent.
            # This example assumes the JD's data is passed in `context.metadata` for simplicity,
            # but a more robust orchestrator design might create a combined context or
            # process them sequentially and then pass specific entity results.
            #
            # A common pattern:
            # 1. Process Resume -> get resume_entities
            # 2. Process JD -> get jd_entities
            # 3. Call RelationshipMapperAgent with (resume_entities, jd_entities, resume_content, jd_content)
            #
            # For this example, let's assume JD data is under `context.metadata['job_description']`
            
            job_description_data = context.metadata.get('job_description', {})
            if not job_description_data:
                 raise ValueError("Job Description content/entities missing from context metadata for relationship mapping.")
            
            jd_content = job_description_data.get('content', '')
            jd_entities = job_description_data.get('entities', {})

            if not jd_content or not jd_entities:
                raise ValueError("Job Description content or entities are empty for relationship mapping.")
            
            # Define the schema for the desired relationship output
            relationship_schema = {
                "type": "object",
                "properties": {
                    "matched_skills": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "resume_skill": {"type": "string", "description": "Skill found in resume"},
                                "jd_requirement": {"type": "string", "description": "Corresponding requirement/skill in Job Description"},
                                "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0, "description": "Confidence of the match"},
                                "reasoning": {"type": "string", "description": "Explanation of why this skill matches"}
                            },
                            "required": ["resume_skill", "jd_requirement", "confidence", "reasoning"]
                        }
                    },
                    "matched_experience_to_responsibilities": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "resume_experience_summary": {"type": "string", "description": "Summarized relevant experience from resume"},
                                "jd_responsibility": {"type": "string", "description": "Corresponding responsibility from Job Description"},
                                "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0, "description": "Confidence of the match"},
                                "reasoning": {"type": "string", "description": "Explanation of why this experience matches"}
                            },
                            "required": ["resume_experience_summary", "jd_responsibility", "confidence", "reasoning"]
                        }
                    },
                    "identified_gaps_in_resume": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "jd_requirement": {"type": "string", "description": "Requirement from JD not clearly met by resume"},
                                "type": {"type": "string", "description": "Type of gap (e.g., 'skill_gap', 'experience_gap')"}
                            },
                            "required": ["jd_requirement", "type"]
                        }
                    },
                    "strong_points_in_resume": {
                        "type": "array",
                        "items": {
                            "type": "string", "description": "Key achievements or skills in resume that are highly relevant to JD"
                        }
                    }
                },
                "required": ["matched_skills", "matched_experience_to_responsibilities", "identified_gaps_in_resume", "strong_points_in_resume"]
            }

            # Construct the prompt for the LLM
            system_prompt = (
                "You are an expert talent analyst AI. Your task is to analyze a candidate's professional background and a role description to identify precise semantic matches, gaps, and connections. You must adhere to the following principles of talent analysis:\n\n"
                
                "--- CORE ANALYSIS PRINCIPLES ---\n"
                "1.  **Go Beyond Keywords**: Understand the underlying semantic meaning of the text. Identify when different phrases refer to the same underlying skill, responsibility, or qualification.\n\n"
                "2.  **Context is Critical**: A skill demonstrated within a professional achievement is a much stronger match to a requirement than a skill simply listed on its own. Your analysis must reflect this distinction.\n"
                        "A skill listed on its own is weak evidence. A skill is only a strong match if it is substantiated by a corresponding project or professional experience. Your confidence score must reflect the strength of this evidence.\n\n"
                "3.  **Direct Relevance is Mandatory**: A connection is only valid if the SKILL and the DOMAIN are directly related. Do not make tenuous connections between different areas of expertise. The action and outcome on the resume must directly map to the responsibility in the job description.\n\n"
                "4.  **Confidence Score Integrity**: Your confidence score must reflect true confidence. Use the following scale strictly:\n"
                "    * **1.0**: ONLY for skills that are explicitly mentioned AND backed by strong evidence (a project or work experience).\n"
                "    * **0.7 - 0.9**: For strong semantic matches where the concepts are the same but the wording is different.\n"
                "    * **0.6 or below**: For skills that are listed but have no direct proof, or for inferred potential matches. Be very conservative with these scores.\n\n"
                "5.  **Identify True Gaps**: A gap is the absence of a core competency. Report only the most significant gaps related to mandatory qualifications or essential domain experience.\n\n"

                "--- OUTPUT INSTRUCTIONS ---\n"
                "Based on these principles, provide your analysis. For every match, you must provide a confidence score and a clear, concise reasoning. The output must strictly follow the JSON schema."
                "CRITICAL FINAL CHECK: Before you output the response, you must validate it to ensure it is a single, perfectly formatted JSON object with no extra text, comments, or characters outside of the main JSON structure."
            )

            
            user_prompt = (
                f"Analyze the following resume and job description to map relationships, matches, and gaps.\n\n"
                f"--- Candidate's Resume Entities ---\n{json.dumps(resume_entities, indent=2)}\n\n"
                f"--- Candidate's Resume Content (Partial for context) ---\n{context.content[:5000]}\n\n" # Pass relevant parts
                f"--- Job Description Entities ---\n{json.dumps(jd_entities, indent=2)}\n\n"
                f"--- Job Description Content ---\n{jd_content[:5000]}\n\n" # Pass relevant parts
                f"Output the relationships as a JSON object strictly following this schema:\n"
                f"{json.dumps(relationship_schema, indent=2)}"
            )
            
            # Make the LLM API call
            response = await self.llm_model.generate_content_async(
                [system_prompt, user_prompt],  # Pass prompts as a list
                generation_config={"response_mime_type": "application/json", "temperature": 0.0},
                safety_settings=GEMINI_SAFETY_SETTINGS
            )
            
            try:
                # First, try to parse the response directly
                llm_output = json.loads(response.text)
            except json.JSONDecodeError:
                self.logger.warning("Initial JSON parsing failed for Relationship Mapper. Attempting to self-correct.")
                # If it fails, ask the LLM to fix the broken JSON
                fix_prompt = (
                    "The following text is not a valid JSON object because it contains extra data or formatting errors. "
                    "Please analyze the text, correct any errors, and return ONLY the perfectly formatted JSON object. "
                    "Do not include any other text or explanation outside of the JSON itself.\n\n"
                    f"--- BROKEN TEXT ---\n{response.text}\n--- END BROKEN TEXT ---"
                )
                
                correction_response = await self.llm_model.generate_content_async(
                    fix_prompt,
                    generation_config={"response_mime_type": "application/json", "temperature": 0.0},
                    safety_settings=GEMINI_SAFETY_SETTINGS
                )
                llm_output = json.loads(correction_response.text) # Try parsing the fixed version
            
            # Basic validation to ensure all required fields are present
            for key in relationship_schema['required']:
                if key not in llm_output:
                    raise ValueError(f"LLM output missing required field: {key}")

            # Calculate an overall confidence score for the mapping
            # This could be an average of match confidences, or a subjective score from the LLM
            overall_confidence = 0.9 # Placeholder, can be refined based on LLM output
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "relationship_map": llm_output,
                    "resume_id": context.file_id,
                    "jd_id": job_description_data.get('file_id'), # Assuming JD also has a file_id
                    "llm_model_used": "gemini-1.5-pro"
                },
                confidence=overall_confidence,
                processing_time=0.0 # Will be updated by _execute_with_timing
            )
            
        except json.JSONDecodeError as e:
            self.logger.error(f"LLM returned invalid JSON for Relationship Mapping: {e}", exc_info=True)
            raise ValueError(f"Failed to parse LLM response: Invalid JSON. {e}")
        except ValueError as e:
            self.logger.error(f"Data validation error in RelationshipMapperAgent: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Relationship mapping failed: {str(e)}", exc_info=True)
            raise

    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "LLM-Powered Relationship Mapper",
            "description": "Identifies semantic relationships, matches, and gaps between a candidate's resume and a job description.",
            "input_requirements": [
                "Classification Agent result (for document types)",
                "Entity Extractor Agent result (for both resume and JD)",
                "Full text content of both resume and JD"
            ],
            "output_format": "Structured JSON map of skills, experiences, matches, and gaps",
            "model": self.llm_model,
            "confidence_level": 0.9 # Reflects expected LLM performance
        }