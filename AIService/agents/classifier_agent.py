# AIService/agents/classifier_agent.py

from typing import Dict, Any, List
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import re
from collections import Counter

class DocumentClassifierAgent(BaseAgent):
    """Agent responsible for classifying document types"""
    
    def __init__(self):
        super().__init__(AgentType.CLASSIFIER)
        
        # Define document type patterns and keywords
        self.document_patterns = {
            "meeting_notes": {
                "keywords": ["meeting", "agenda", "minutes", "attendees", "action items", 
                            "discussion", "next steps", "follow up", "participants"],
                "patterns": [
                    r"(?i)(meeting|minutes)\s*(notes|summary)",
                    r"(?i)attendees?:?\s*",
                    r"(?i)agenda:?\s*",
                    r"(?i)action\s*items?:?\s*"
                ],
                "confidence_threshold": 3
            },
            "legal_contract": {
                "keywords": ["whereas", "agreement", "party", "parties", "shall", "hereby",
                            "witness", "obligations", "terms", "conditions", "liability",
                            "indemnify", "governing law", "termination"],
                "patterns": [
                    r"(?i)this\s+agreement",
                    r"(?i)between.*and.*\(.*parties",
                    r"(?i)whereas",
                    r"(?i)now,?\s+therefore"
                ],
                "confidence_threshold": 4
            },
            "financial_report": {
                "keywords": ["revenue", "profit", "loss", "balance sheet", "income statement",
                            "cash flow", "assets", "liabilities", "equity", "fiscal",
                            "quarter", "annual", "earnings"],
                "patterns": [
                    r"(?i)(financial|earnings)\s*report",
                    r"(?i)balance\s*sheet",
                    r"(?i)income\s*statement",
                    r"\$[\d,]+\.?\d*"
                ],
                "confidence_threshold": 3
            },
            "technical_documentation": {
                "keywords": ["api", "function", "method", "class", "implementation",
                            "parameters", "returns", "example", "usage", "installation",
                            "configuration", "documentation"],
                "patterns": [
                    r"(?i)(api|technical)\s*documentation",
                    r"(?i)installation\s*guide",
                    r"(?i)function\s*\w+\s*\(",
                    r"(?i)class\s*\w+\s*[:{]"
                ],
                "confidence_threshold": 3
            },
            "email": {
                "keywords": ["from:", "to:", "subject:", "date:", "sent:", "cc:", "bcc:",
                            "regards", "sincerely", "best", "thanks"],
                "patterns": [
                    r"(?i)from:\s*",
                    r"(?i)to:\s*",
                    r"(?i)subject:\s*",
                    r"[\w\.-]+@[\w\.-]+\.\w+"
                ],
                "confidence_threshold": 2
            },
            "research_paper": {
                "keywords": ["abstract", "introduction", "methodology", "results",
                            "conclusion", "references", "bibliography", "hypothesis",
                            "literature review", "findings"],
                "patterns": [
                    r"(?i)abstract:?\s*",
                    r"(?i)\d+\.\s*introduction",
                    r"(?i)references:?\s*",
                    r"\[\d+\]"  # Citation pattern
                ],
                "confidence_threshold": 3
            }
        }
    
    async def process(self, context: DocumentContext) -> AgentResult:
        """Classify the document based on content analysis"""
        try:
            content_lower = context.content.lower()
            scores = {}
            
            # Analyze each document type
            for doc_type, config in self.document_patterns.items():
                score = 0
                matches = []
                
                # Check keywords
                for keyword in config["keywords"]:
                    if keyword.lower() in content_lower:
                        score += 1
                        matches.append(f"keyword: {keyword}")
                
                # Check patterns
                for pattern in config["patterns"]:
                    if re.search(pattern, context.content):
                        score += 2  # Patterns are weighted higher
                        matches.append(f"pattern: {pattern}")
                
                scores[doc_type] = {
                    "score": score,
                    "matches": matches,
                    "confidence": min(score / config["confidence_threshold"], 1.0)
                }
            
            # Determine primary classification
            primary_type = max(scores.items(), key=lambda x: x[1]["score"])
            
            # Check if we have sufficient confidence
            if primary_type[1]["score"] < 2:
                classification = "general_document"
                confidence = 0.5
            else:
                classification = primary_type[0]
                confidence = primary_type[1]["confidence"]
            
            # Find secondary classifications
            secondary_types = []
            for doc_type, data in scores.items():
                if doc_type != classification and data["score"] >= 2:
                    secondary_types.append({
                        "type": doc_type,
                        "confidence": data["confidence"]
                    })
            
            # Additional metadata extraction
            metadata = self._extract_metadata(context.content, classification)
            
            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "primary_classification": classification,
                    "confidence": confidence,
                    "secondary_classifications": secondary_types,
                    "scores": scores,
                    "metadata": metadata,
                    "file_type": context.file_type
                },
                confidence=confidence,
                processing_time=0.0
            )
            
        except Exception as e:
            self.logger.error(f"Classification failed: {str(e)}", exc_info=True)
            raise
    
    def _extract_metadata(self, content: str, doc_type: str) -> Dict[str, Any]:
        """Extract type-specific metadata"""
        metadata = {
            "word_count": len(content.split()),
            "line_count": len(content.split('\n')),
            "has_tables": bool(re.search(r'\|.*\|.*\|', content)),
            "has_lists": bool(re.search(r'(?m)^\s*[\-\*\d+\.]\s+', content))
        }
        
        # Type-specific metadata
        if doc_type == "email":
            # Extract email headers
            from_match = re.search(r'(?i)from:\s*(.+)', content)
            to_match = re.search(r'(?i)to:\s*(.+)', content)
            subject_match = re.search(r'(?i)subject:\s*(.+)', content)
            
            if from_match:
                metadata["from"] = from_match.group(1).strip()
            if to_match:
                metadata["to"] = to_match.group(1).strip()
            if subject_match:
                metadata["subject"] = subject_match.group(1).strip()
        
        elif doc_type == "meeting_notes":
            # Extract meeting date if present
            date_patterns = [
                r'(?i)date:\s*(.+)',
                r'(?i)meeting\s+date:\s*(.+)',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            ]
            for pattern in date_patterns:
                match = re.search(pattern, content)
                if match:
                    metadata["meeting_date"] = match.group(1).strip()
                    break
        
        return metadata
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "Document Classifier",
            "description": "Classifies documents into predefined categories",
            "supported_types": list(self.document_patterns.keys()) + ["general_document"],
            "features": [
                "Pattern-based classification",
                "Confidence scoring",
                "Secondary classification detection",
                "Type-specific metadata extraction"
            ]
        }