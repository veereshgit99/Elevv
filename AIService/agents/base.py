# AIService/agents/base.py

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class AgentType(Enum):
    """Enumeration of available agent types for career-focused AI"""
    CLASSIFIER = "classifier" # Keep for input validation (Resume vs. JD)
    ENTITY_EXTRACTOR = "entity_extractor"
    RELATIONSHIP_MAPPER = "relationship_mapper"
    JOB_MATCHER = "job_matcher" # New: For calculating match score
    RESUME_OPTIMIZER = "resume_optimizer" # New: For generating enhancement suggestions
    WEB_SCRAPER = "web_scraper" # New: For fetching company info from JD URL
    COMPREHENSIVE_ANALYSIS = "comprehensive_analysis" # New: For end-to-end analysis combining all phases
    # Removed: TOPIC_ANALYZER, SENTIMENT_ANALYZER, ACTION_ITEM_EXTRACTOR, STRUCTURE_ANALYZER
    # These can be added back if the project expands to broader document types.

@dataclass
class AgentResult:
    """Standard result format for all agents"""
    agent_type: AgentType
    success: bool
    data: Dict[str, Any]
    confidence: float
    processing_time: float
    error: Optional[str] = None

@dataclass
class DocumentContext:
    """Context passed between agents during document processing"""
    user_id: str # Added to link processing to a specific user
    file_id: str # ID for the specific document (resume or JD) being processed
    content: str # The text content of the document
    file_type: str # Original file type (e.g., 'pdf', 'docx')
    metadata: Dict[str, Any] # Flexible dict for additional context (e.g., JD content/entities when processing a resume)
    previous_results: Dict[AgentType, AgentResult] = None
    
    def __post_init__(self):
        if self.previous_results is None:
            self.previous_results = {}

class BaseAgent(ABC):
    """Abstract base class for all document analysis agents"""
    
    def __init__(self, agent_type: AgentType):
        self.agent_type = agent_type
        self.logger = logging.getLogger(f"{__name__}.{agent_type.value}")
    
    @abstractmethod
    async def process(self, context: DocumentContext) -> AgentResult:
        """Process document and return analysis results"""
        pass
    
    @abstractmethod
    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities and requirements"""
        pass
    
    def should_process(self, context: DocumentContext) -> bool:
        """Determine if this agent should process the document"""
        # Default implementation - can be overridden by specific agents
        return True
    
    async def _execute_with_timing(self, context: DocumentContext) -> AgentResult:
        """Wrapper to execute agent with timing and error handling"""
        import time
        start_time = time.time()
        
        try:
            if not self.should_process(context):
                return AgentResult(
                    agent_type=self.agent_type,
                    success=True,
                    data={"skipped": True, "reason": "Document not suitable for this agent"},
                    confidence=1.0,
                    processing_time=0.0
                )
            
            result = await self.process(context)
            result.processing_time = time.time() - start_time
            return result
            
        except Exception as e:
            self.logger.error(f"Agent {self.agent_type.value} failed: {str(e)}", exc_info=True)
            return AgentResult(
                agent_type=self.agent_type,
                success=False,
                data={},
                confidence=0.0,
                processing_time=time.time() - start_time,
                error=str(e)
            )