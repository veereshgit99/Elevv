# AIService/agents/entity_extractor_agent.py

from typing import Dict, Any, List, Set
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import re
import spacy

class EntityExtractorAgent(BaseAgent):
    """Agent responsible for extracting named entities from documents"""
    
    def __init__(self):
        super().__init__(AgentType.ENTITY_EXTRACTOR)
        
        # Load spaCy model
        try:
            self.nlp = spacy.load("en_core_web_sm")
            self.use_spacy = True
            self.logger.info("spaCy model loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load spaCy model: {e}")
            raise RuntimeError("spaCy model en_core_web_sm not found. Please install with: python -m spacy download en_core_web_sm")
        
        # Regex patterns for structured data that spaCy might miss
        self.patterns = {
            "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "phone": r'(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
            "url": r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)',
            "percentage": r'\b\d+(?:\.\d+)?%\s*(?:KPI)?',
            "time": r'\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*(?:AM|PM|am|pm)?\b',
            "gpa": r'\b\d+(?:\.\d+)?\s*(?:CGPA|GPA)\b'
        }
        
        # Additional date patterns to supplement spaCy
        self.date_patterns = [
            r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b',
            r'\b\d{4}\s*-\s*\d{4}\b',  # Year ranges like "2020 - 2023"
            r'\b(?:fall|spring|summer|winter)\s+\d{4}\b'  # Seasonal dates
        ]
        
        # Filter lists for better accuracy
        self.tech_skills_keywords = {
            'python', 'java', 'javascript', 'c++', 'c/c++', 'html', 'css', 'sql', 'mysql', 
            'git', 'github', 'aws', 'azure', 'google cloud', 'cloud computing', 
            'machine learning', 'ai', 'data structures', 'algorithms', 'problem solving', 
            'agile', 'scrum', 'oops', 'dsa', 'ms office', 'excel'
        }
        
        self.education_keywords = {
            'b.e.', 'b.tech', 'm.s.', 'm.tech', 'ph.d', 'mba', 'bachelor', 'master',
            'computer science', 'software engineering', 'information science',
            'courses', 'education', 'technical skills', 'methodologies'
        }
    
    async def process(self, context: DocumentContext) -> AgentResult:
        """Extract entities from the document"""
        try:
            entities = {
                "people": [],
                "organizations": [],
                "locations": [],
                "dates": [],
                "money": [],
                "emails": [],
                "phones": [],
                "urls": [],
                "percentages": [],
                "times": [],
                "skills": []  # Track technical skills separately
            }
            
            # Process with spaCy
            doc = self.nlp(context.content)
            
            # Extract named entities using spaCy
            for ent in doc.ents:
                entity_data = {
                    "text": ent.text,
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "label": ent.label_
                }
                
                if ent.label_ == "PERSON":
                    # Filter out false positives
                    if not self._is_tech_term(ent.text) and not self._is_education_term(ent.text):
                        entities["people"].append(entity_data)
                
                elif ent.label_ == "ORG":
                    # Keep legitimate organizations
                    if not self._is_education_degree(ent.text) and not self._is_tech_term(ent.text):
                        entities["organizations"].append(entity_data)
                
                elif ent.label_ in ["GPE", "LOC"]:
                    entities["locations"].append(entity_data)
                
                elif ent.label_ == "DATE":
                    entities["dates"].append(entity_data)
                
                elif ent.label_ == "MONEY":
                    entities["money"].append(entity_data)
                
                elif ent.label_ == "PERCENT":
                    entities["percentages"].append(entity_data)
            
            # Extract structured data using regex
            entities["emails"] = self._extract_pattern(context.content, self.patterns["email"])
            entities["phones"] = self._extract_pattern(context.content, self.patterns["phone"])
            entities["urls"] = self._extract_pattern(context.content, self.patterns["url"])
            
            # Extract additional percentages and GPA
            regex_percentages = self._extract_pattern(context.content, self.patterns["percentage"])
            gpa_matches = self._extract_pattern(context.content, self.patterns["gpa"])
            
            # Add regex-found percentages that spaCy might have missed
            for pct in regex_percentages:
                if not any(pct["text"] in ent["text"] for ent in entities["percentages"]):
                    entities["percentages"].append(pct)
            
            # Add GPA to percentages category
            entities["percentages"].extend(gpa_matches)
            
            # Extract times
            entities["times"] = self._extract_pattern(context.content, self.patterns["time"])
            
            # Extract additional date patterns
            for date_pattern in self.date_patterns:
                date_matches = self._extract_pattern(context.content, date_pattern)
                for match in date_matches:
                    if not any(match["text"] in ent["text"] for ent in entities["dates"]):
                        entities["dates"].append(match)
            
            # Extract technical skills mentioned
            entities["skills"] = self._extract_skills(context.content)
            
            # Remove duplicates and clean up
            for entity_type in entities:
                entities[entity_type] = self._deduplicate_entities(entities[entity_type])
            
            # Calculate summary statistics
            total_entities = sum(len(entities[key]) for key in entities if key != "skills")
            
            # Check document classification from previous agent
            doc_classification = None
            if AgentType.CLASSIFIER in context.previous_results:
                doc_classification = context.previous_results[AgentType.CLASSIFIER].data.get("primary_classification")
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "entities": entities,
                    "summary": {
                        "total_entities": total_entities,
                        "entity_counts": {k: len(v) for k, v in entities.items()},
                        "has_contact_info": bool(entities["emails"] or entities["phones"]),
                        "has_financial_data": bool(entities["money"] or entities["percentages"]),
                        "has_temporal_data": bool(entities["dates"] or entities["times"]),
                        "technical_skills_found": len(entities["skills"]) > 0
                    },
                    "document_classification": doc_classification,
                    "spacy_model_used": "en_core_web_sm"
                },
                confidence=0.85,
                processing_time=0.0
            )
            
        except Exception as e:
            self.logger.error(f"Entity extraction failed: {str(e)}", exc_info=True)
            raise
    
    def _is_tech_term(self, text: str) -> bool:
        """Check if text is a technical term"""
        return text.lower() in self.tech_skills_keywords or text.lower().replace(" ", "") in self.tech_skills_keywords
    
    def _is_education_term(self, text: str) -> bool:
        """Check if text is an education-related term"""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.education_keywords)
    
    def _is_education_degree(self, text: str) -> bool:
        """Check if text is an education degree"""
        text_lower = text.lower()
        degree_patterns = ['m.s.', 'b.e.', 'b.tech', 'm.tech', 'bachelor', 'master', 'engineering']
        return any(pattern in text_lower for pattern in degree_patterns)
    
    def _extract_pattern(self, text: str, pattern: str) -> List[Dict[str, Any]]:
        """Extract entities matching a regex pattern"""
        entities = []
        for match in re.finditer(pattern, text, re.IGNORECASE):
            entities.append({
                "text": match.group(),
                "start": match.start(),
                "end": match.end()
            })
        return entities
    
    def _extract_skills(self, text: str) -> List[Dict[str, Any]]:
        """Extract technical skills mentioned in the document"""
        skills = []
        text_lower = text.lower()
        
        # Common skill patterns
        skill_patterns = [
            r'\b(?:python|java|javascript|c\+\+|c/c\+\+|html|css|sql|mysql)\b',
            r'\b(?:react|angular|vue|django|flask|spring|node\.js)\b',
            r'\b(?:aws|azure|gcp|google cloud|docker|kubernetes)\b',
            r'\b(?:git|github|gitlab|bitbucket|jira|confluence)\b',
            r'\b(?:machine learning|deep learning|nlp|computer vision)\b',
            r'\b(?:agile|scrum|kanban|waterfall)\b'
        ]
        
        for pattern in skill_patterns:
            for match in re.finditer(pattern, text_lower):
                skill_text = text[match.start():match.end()]  # Get original case
                skills.append({
                    "text": skill_text,
                    "start": match.start(),
                    "end": match.end()
                })
        
        return skills
    
    def _deduplicate_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate entities based on text"""
        seen = set()
        unique_entities = []
        
        for entity in entities:
            text = entity["text"].strip()
            if text not in seen:
                seen.add(text)
                unique_entities.append(entity)
        
        return unique_entities
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "Entity Extractor",
            "description": "Extracts named entities and structured data from documents using spaCy NLP",
            "entity_types": [
                "people", "organizations", "locations", "dates", "money",
                "emails", "phones", "urls", "percentages", "times", "skills"
            ],
            "features": [
                "spaCy NER with en_core_web_sm model",
                "Regex-based extraction for structured data",
                "Technical skills detection",
                "False positive filtering for tech terms",
                "Duplicate removal",
                "Entity position tracking"
            ],
            "model": "spaCy en_core_web_sm",
            "confidence_level": 0.85
        }