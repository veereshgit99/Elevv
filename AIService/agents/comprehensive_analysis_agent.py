# AIService/agents/comprehensive_analysis_agent.py

import os
import json
import logging
from typing import Dict, Any

from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext

logger = logging.getLogger(__name__)

# --- Configure the Gemini client ---
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise KeyError("GOOGLE_API_KEY not found in environment variables.")
    genai.configure(api_key=api_key)
except KeyError as e:
    logger.warning(f"{e} The agent will not work.")
    genai = None

GEMINI_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]


class ComprehensiveAnalysisAgent(BaseAgent):
    """
    A single, powerful agent that combines relationship mapping and job matching
    to perform a full analysis in one efficient step.
    """

    def __init__(self):
        super().__init__(AgentType.COMPREHENSIVE_ANALYSIS)
        if genai:
            # Use the most capable model for this complex, multi-part task
            self.llm_model = genai.GenerativeModel("gemini-2.5-flash")
        else:
            self.llm_model = None
        self.logger.info("ComprehensiveAnalysisAgent initialized with model: Gemini 2.5 Flash")

    async def process(self, context: DocumentContext) -> AgentResult:
        """
        Performs relationship mapping and job matching in a single API call.
        """
        if not self.llm_model:
            raise RuntimeError("Gemini client not initialized.")

        try:
            # Get the extracted entities from the lean context
            resume_entities = context.metadata.get("resume_entities")
            jd_entities = context.metadata.get("jd_entities")

            if not resume_entities or not jd_entities:
                raise ValueError("ComprehensiveAnalysisAgent requires resume and JD entities in its context.")

            # Define the combined schema for the desired output
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
            
            match_score_schema = {
                "type": "object",
                "properties": {
                    "match_percentage": {"type": "number", "minimum": 0, "maximum": 100},
                    "strength_summary": {"type": "string"},
                    "areas_for_improvement": {"type": "array", "items": {"type": "string"}},
                    # ... other properties
                },
                "required": ["match_percentage", "strength_summary", "areas_for_improvement"]
            }
            
            
            combined_schema = {
                "type": "object",
                "properties": {
                    "relationship_map": relationship_schema,
                    "job_match_analysis": match_score_schema
                },
                "required": ["relationship_map", "job_match_analysis"]
            }

            # --- SYSTEM PROMPT ---
            system_prompt = (
                "You are an expert talent analyst AI and seasoned executive recruiter, tasked with two consecutive and interrelated jobs:\n\n"
                "1. Analyze a candidate's professional background and job description entities to identify precise semantic matches, significant gaps, and meaningful connections.\n"
                "2. Using that relationship map, calculate a realistic overall match percentage and provide expert, evidence-based feedback on strengths and areas for improvement.\n\n"
                "--- CORE ANALYSIS PRINCIPLES ---\n\n"
                "A) Relationship Mapping:\n"
                "1. Go Beyond Keywords: Understand semantic equivalences where different phrases refer to the same skills or qualifications.\n"
                "2. Context is Critical: A skill referenced within a professional achievement or project counts as strong evidence. Items listed standalone count as weak evidence.\n"
                "3. Direct Relevance Only: Skills and experiences must directly map to job description requirements to count as a match.\n"
                "4. Use strict confidence scores:\n"
                "   - 1.00 for explicit mentions plus strong supporting evidence\n"
                "   - 0.7-0.9 for conceptual semantic matches\n"
                "   - 0.6 or below for weak or inferred matches\n"
                "5. Identify only core, mandatory gaps—avoid minor or preferred qualifications.\n"
                "6. Confidence scores must be rounded to two decimals.\n"
                "7. Cite in the reasoning field the resume or job description element that supports the match or gap.\n"
                "8. Analyze with available context; note that input may be truncated.\n\n"
                
                "B) Job Matching:\n"
                "1. Prioritize full-time roles, internships, projects, and coursework hierarchically.\n"
                "2. Value quantified, results-oriented achievements over simple keyword matches.\n"
                "3. Match percentage must be data-driven, based solely on the relationship map and job description.\n"
                "4. Increase match with more high-confidence, core skills and experiences.\n"
                "5. Decrease match based on severity of gaps—'experience_gap' count more than 'skill_gap'.\n"
                "6. Match percentage must be rounded to the nearest whole number between 0 and 100.\n"
                "7. Provide a concise strength summary and actionable areas for improvement, each citing specific gaps from the relationship map.\n"
                "8. Be realistic and conservative—do not inflate scores or feedback if data is partial or weak.\n\n"
                "--- OUTPUT INSTRUCTIONS ---\n\n"
                "- Output exactly one single JSON object containing two top-level keys: 'relationship_map' and 'job_match_analysis'.\n"
                "- The 'relationship_map' value must strictly follow the relationship schema, and 'job_match_analysis' must strictly follow the match score schema.\n"
                "- Your output must be valid JSON only — no extra text, explanations, or markdown formatting.\n"
                "- Ensure all required keys and arrays are present, empty if no data exists.\n"
                "- Verify formatting before outputting.\n\n"
                "CRITICAL: Your response must be well-formed JSON matching the schemas exactly, with no extra characters or explanation."
            )

            user_prompt = (
                f"Analyze the following resume and job description entities to map relationships, matches, and gaps, then calculate an overall match percentage and provide structured feedback.\n\n"
                f"--- Candidate's Resume Entities ---\n{json.dumps(resume_entities, indent=2)}\n\n"
                f"--- Job Description Entities ---\n{json.dumps(jd_entities, indent=2)}\n\n"
                f"Output the combined relationship mapping and match analysis as a JSON object strictly following this combined schema:\n\n"
                f"{json.dumps(combined_schema, indent=2)}\n\n"
                f"Remember: Your response must be ONLY valid JSON with the two top-level keys 'relationship_map' and 'job_match_analysis'."
            )

            response = await self.llm_model.generate_content_async(
                [system_prompt, user_prompt],
                generation_config={"response_mime_type": "application/json", "temperature": 0.0},
                safety_settings=GEMINI_SAFETY_SETTINGS
            )
            
            # Debug: Print raw response
            print(f"\n{'='*60}")
            print(f"🤖 COMPREHENSIVE ANALYSIS AGENT - RAW RESPONSE")
            print(f"{'='*60}")
            print(f"Response length: {len(response.text) if response.text else 0} characters")
            print(f"Raw response:", response.text)
            print(f"{'='*60}\n")
            
            # Use the self-healing JSON parser for robustness
            try:
                llm_output = json.loads(response.text)
            except json.JSONDecodeError:
                self.logger.warning("Initial JSON parsing failed. Attempting to self-correct.")
                fix_prompt = (
                    "The following text is not a valid JSON object. Please correct any errors and return ONLY the perfectly formatted JSON object.\n\n"
                    f"--- BROKEN TEXT ---\n{response.text}\n--- END BROKEN TEXT ---"
                )
                correction_response = await self.llm_model.generate_content_async(
                    f"The following text is not a valid JSON object. Please correct any errors and return ONLY the perfectly formatted JSON object.\n\n--- BROKEN TEXT ---\n{response.text}\n--- END BROKEN TEXT ---",
                    generation_config={"response_mime_type": "application/json", "temperature": 0.0},
                    safety_settings=GEMINI_SAFETY_SETTINGS
                )
                llm_output = json.loads(correction_response.text)

            if not isinstance(llm_output, dict) or "relationship_map" not in llm_output or "job_match_analysis" not in llm_output:
                raise ValueError("LLM returned incomplete JSON for comprehensive analysis.")
            
            # Extract match percentage from the correct location
            match_percentage = llm_output.get("job_match_analysis", {}).get("match_percentage", 0)
            match_percentage = max(0, min(100, int(match_percentage)))
            
            # Debug: Print final parsed output
            print(f"\n{'='*60}")
            print(f"🎯 COMPREHENSIVE ANALYSIS AGENT - FINAL OUTPUT")
            print(f"{'='*60}")
            print(f"✅ Successfully parsed JSON with keys: {list(llm_output.keys())}")
            print(f"📊 Match Percentage: {match_percentage}%")
            
            # Print relationship map summary
            rel_map = llm_output.get("relationship_map", {})
            print(f"\n📋 RELATIONSHIP MAP SUMMARY:")
            print(f"   • Matched Skills: {len(rel_map.get('matched_skills', []))}")
            print(f"   • Matched Experience: {len(rel_map.get('matched_experience_to_responsibilities', []))}")
            print(f"   • Identified Gaps: {len(rel_map.get('identified_gaps_in_resume', []))}")
            print(f"   • Strong Points: {len(rel_map.get('strong_points_in_resume', []))}")
            
            # Print job match analysis summary
            job_analysis = llm_output.get("job_match_analysis", {})
            print(f"\n🎯 JOB MATCH ANALYSIS SUMMARY:")
            print(f"   • Match Percentage: {job_analysis.get('match_percentage', 'N/A')}%")
            print(f"   • Strength Summary: {job_analysis.get('strength_summary', 'N/A')[:100]}...")
            print(f"   • Areas for Improvement: {len(job_analysis.get('areas_for_improvement', []))}")
            
            # Print full JSON (truncated)
            print(f"\n📄 FULL OUTPUT (first 1000 chars):")
            print(json.dumps(llm_output, indent=2)[:1000] + "...")
            print(f"{'='*60}\n")
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "match_analysis": llm_output,
                    "overall_match_percentage": match_percentage,
                    "llm_model_used": "gemini-2.5-flash"
                }, # The data now contains both the map and the analysis
                confidence=0.95,
                processing_time=0.0  # Processing time can be calculated if needed
            )

        except Exception as e:
            self.logger.error(f"Comprehensive analysis failed: {str(e)}", exc_info=True)
            raise

    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "Comprehensive Analysis Agent (Gemini)",
            "description": "Performs a full relationship mapping and job match analysis in a single, efficient step.",
            "model": "gemini-2.5-flash",
        }