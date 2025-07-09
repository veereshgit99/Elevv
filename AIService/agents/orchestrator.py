# AIService/agents/orchestrator.py

from typing import Dict, List, Optional, Any
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
from agents.classifier_agent import DocumentClassifierAgent
from agents.entity_extractor_agent import EntityExtractorAgent
import asyncio
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class OrchestrationStrategy:
    """Defines how agents should be executed"""
    parallel_groups: List[List[AgentType]]  # Groups of agents that can run in parallel
    dependencies: Dict[AgentType, List[AgentType]]  # Agent dependencies
    conditional_agents: Dict[AgentType, callable]  # Agents that run conditionally

class DocumentAnalysisOrchestrator:
    """Orchestrates multiple agents for comprehensive document analysis"""
    
    def __init__(self):
        self.agents: Dict[AgentType, BaseAgent] = {}
        self.logger = logger
        
        # Initialize available agents
        self._initialize_agents()
        
        # Define orchestration strategy
        self.strategy = self._define_strategy()
    
    def _initialize_agents(self):
        """Initialize all available agents"""
        # Start with implemented agents
        self.agents[AgentType.CLASSIFIER] = DocumentClassifierAgent()
        self.agents[AgentType.ENTITY_EXTRACTOR] = EntityExtractorAgent()
        
        # TODO: Add other agents as they are implemented
        # self.agents[AgentType.ACTION_ITEM_EXTRACTOR] = ActionItemExtractorAgent()
        # self.agents[AgentType.TOPIC_ANALYZER] = TopicAnalyzerAgent()
        # self.agents[AgentType.SENTIMENT_ANALYZER] = SentimentAnalyzerAgent()
        # self.agents[AgentType.STRUCTURE_ANALYZER] = StructureAnalyzerAgent()
    
    def _define_strategy(self) -> OrchestrationStrategy:
        """Define the orchestration strategy"""
        return OrchestrationStrategy(
            # Agents that can run in parallel
            parallel_groups=[
                [AgentType.CLASSIFIER],  # Classification runs first
                [AgentType.ENTITY_EXTRACTOR],  # These can run in parallel after classification
                # Future parallel groups:
                # [AgentType.ACTION_ITEM_EXTRACTOR, AgentType.TOPIC_ANALYZER],
                # [AgentType.SENTIMENT_ANALYZER, AgentType.STRUCTURE_ANALYZER]
            ],
            
            # Dependencies between agents
            dependencies={
                AgentType.ENTITY_EXTRACTOR: [AgentType.CLASSIFIER],
                # Future dependencies:
                # AgentType.ACTION_ITEM_EXTRACTOR: [AgentType.CLASSIFIER],
                # AgentType.TOPIC_ANALYZER: [AgentType.CLASSIFIER],
            },
            
            # Conditional execution based on document type
            conditional_agents={
                # Example: Only run action item extractor for meeting notes
                # AgentType.ACTION_ITEM_EXTRACTOR: lambda ctx: 
                #     ctx.previous_results.get(AgentType.CLASSIFIER, {}).data.get("primary_classification") == "meeting_notes"
            }
        )
    
    async def analyze_document(
        self, 
        file_id: str, 
        content: str, 
        file_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Orchestrate document analysis across multiple agents"""
        
        # Create document context
        context = DocumentContext(
            file_id=file_id,
            content=content,
            file_type=file_type,
            metadata=metadata or {}
        )
        
        results = {}
        errors = []
        
        try:
            # Execute agents according to strategy
            for group in self.strategy.parallel_groups:
                # Filter agents based on availability and conditions
                available_agents = [
                    agent_type for agent_type in group 
                    if agent_type in self.agents
                ]
                
                if not available_agents:
                    continue
                
                # Check if agents should run based on conditions
                agents_to_run = []
                for agent_type in available_agents:
                    if agent_type in self.strategy.conditional_agents:
                        condition_fn = self.strategy.conditional_agents[agent_type]
                        if not condition_fn(context):
                            self.logger.info(f"Skipping {agent_type.value} based on condition")
                            continue
                    agents_to_run.append(agent_type)
                
                # Run agents in parallel within the group
                if agents_to_run:
                    group_results = await self._run_agent_group(agents_to_run, context)
                    
                    # Update context with results for next group
                    for agent_type, result in group_results.items():
                        results[agent_type] = result
                        if result.success:
                            context.previous_results[agent_type] = result
                        else:
                            errors.append({
                                "agent": agent_type.value,
                                "error": result.error
                            })
            
            # Generate comprehensive analysis summary
            analysis_summary = self._generate_analysis_summary(results)
            
            return {
                "file_id": file_id,
                "success": len(errors) == 0,
                "agents_run": [agent_type.value for agent_type in results.keys()],
                "results": {
                    agent_type.value: {
                        "success": result.success,
                        "data": result.data,
                        "confidence": result.confidence,
                        "processing_time": result.processing_time,
                        "error": result.error
                    }
                    for agent_type, result in results.items()
                },
                "summary": analysis_summary,
                "errors": errors,
                "total_processing_time": sum(r.processing_time for r in results.values())
            }
            
        except Exception as e:
            self.logger.error(f"Orchestration failed: {str(e)}", exc_info=True)
            return {
                "file_id": file_id,
                "success": False,
                "error": str(e),
                "results": {},
                "errors": [{"agent": "orchestrator", "error": str(e)}]
            }
    
    async def _run_agent_group(
        self, 
        agent_types: List[AgentType], 
        context: DocumentContext
    ) -> Dict[AgentType, AgentResult]:
        """Run a group of agents in parallel"""
        tasks = []
        
        for agent_type in agent_types:
            agent = self.agents[agent_type]
            task = agent._execute_with_timing(context)
            tasks.append((agent_type, task))
        
        # Execute all tasks in parallel
        results = {}
        for agent_type, task in tasks:
            try:
                result = await task
                results[agent_type] = result
            except Exception as e:
                self.logger.error(f"Agent {agent_type.value} failed: {str(e)}")
                results[agent_type] = AgentResult(
                    agent_type=agent_type,
                    success=False,
                    data={},
                    confidence=0.0,
                    processing_time=0.0,
                    error=str(e)
                )
        
        return results
    
    def _generate_analysis_summary(self, results: Dict[AgentType, AgentResult]) -> Dict[str, Any]:
        """Generate a comprehensive summary of all agent analyses"""
        summary = {
            "document_type": "unknown",
            "key_findings": [],
            "entity_summary": {},
            "confidence_scores": {}
        }
        
        # Extract classification results
        if AgentType.CLASSIFIER in results and results[AgentType.CLASSIFIER].success:
            classifier_data = results[AgentType.CLASSIFIER].data
            summary["document_type"] = classifier_data.get("primary_classification", "unknown")
            summary["confidence_scores"]["classification"] = classifier_data.get("confidence", 0)
            
            # Add secondary classifications if present
            if classifier_data.get("secondary_classifications"):
                summary["secondary_types"] = classifier_data["secondary_classifications"]
        
        # Extract entity results
        if AgentType.ENTITY_EXTRACTOR in results and results[AgentType.ENTITY_EXTRACTOR].success:
            entity_data = results[AgentType.ENTITY_EXTRACTOR].data
            summary["entity_summary"] = entity_data.get("summary", {})
            summary["confidence_scores"]["entities"] = results[AgentType.ENTITY_EXTRACTOR].confidence
            
            # Highlight key entities
            entities = entity_data.get("entities", {})
            if entities.get("people"):
                summary["key_findings"].append(f"Found {len(entities['people'])} people mentioned")
            if entities.get("organizations"):
                summary["key_findings"].append(f"Found {len(entities['organizations'])} organizations")
            if entities.get("money"):
                summary["key_findings"].append(f"Contains {len(entities['money'])} monetary values")
            if entities.get("dates"):
                summary["key_findings"].append(f"References {len(entities['dates'])} dates")
        
        # TODO: Add summaries from other agents as they are implemented
        
        return summary
    
    def get_available_agents(self) -> Dict[str, Any]:
        """Get information about available agents"""
        return {
            agent_type.value: {
                "available": True,
                "capabilities": agent.get_capabilities()
            }
            for agent_type, agent in self.agents.items()
        }