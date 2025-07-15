# AIService/agents/orchestrator.py

from typing import Dict, Any, List, Optional
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
from agents.classifier_agent import DocumentClassifierAgent
from agents.entity_extractor_agent import EntityExtractorAgent
from agents.relationship_mapper_agent import RelationshipMapperAgent
from agents.job_matching_agent import JobMatchingAgent
from agents.resume_optimizer_agent import ResumeOptimizerAgent
from agents.web_scraper_agent import WebScraperAgent
import logging

logger = logging.getLogger(__name__)

class DocumentAnalysisOrchestrator:
    """
    Orchestrates the execution of various document analysis agents
    for resume-job description matching and enhancement.
    """
    
    def __init__(self):
        self.agents: Dict[AgentType, BaseAgent] = {}
        self._initialize_agents()
        self.logger = logging.getLogger(f"{__name__}.Orchestrator")
        self.logger.info("DocumentAnalysisOrchestrator initialized.")

    def _initialize_agents(self):
        """Initializes all available agents."""
        self.agents[AgentType.CLASSIFIER] = DocumentClassifierAgent()
        self.agents[AgentType.ENTITY_EXTRACTOR] = EntityExtractorAgent()
        self.agents[AgentType.WEB_SCRAPER] = WebScraperAgent()
        self.agents[AgentType.RELATIONSHIP_MAPPER] = RelationshipMapperAgent()
        self.agents[AgentType.JOB_MATCHER] = JobMatchingAgent()
        self.agents[AgentType.RESUME_OPTIMIZER] = ResumeOptimizerAgent()
        # Add other agents here as they are implemented
        # self.agents[AgentType.MESSAGE_GENERATOR] = MessageGeneratorAgent()

    async def _run_agent(self, agent_type: AgentType, context: DocumentContext) -> AgentResult:
        """Helper to run a single agent and update context with its result."""
        agent = self.agents.get(agent_type)
        if not agent:
            raise ValueError(f"Agent of type {agent_type.value} not found.")
        
        self.logger.info(f"Running agent: {agent_type.value} for file {context.file_id}")
        result = await agent._execute_with_timing(context) # Use the wrapper for timing and error handling
        
        # Store the result in the context for subsequent agents
        context.previous_results[agent_type] = result
        
        if not result.success:
            self.logger.error(f"Agent {agent_type.value} failed: {result.error}")
            # Depending on severity, you might raise an exception or allow partial results
            # For critical path, raising is often better.
            raise RuntimeError(f"Agent {agent_type.value} failed: {result.error}")
            
        return result

    async def process_document_for_analysis(self, user_id: str, file_id: str, content: str, file_type: str, initial_metadata: Dict[str, Any] = None) -> DocumentContext:
        """
        Processes a single document (either resume or JD) through initial analysis agents.
        Returns the updated DocumentContext.
        """
        if initial_metadata is None:
            initial_metadata = {}
            
        context = DocumentContext(
            user_id=user_id,
            file_id=file_id,
            content=content,
            file_type=file_type,
            metadata=initial_metadata
        )

        # Step 1: Classify the document
        await self._run_agent(AgentType.CLASSIFIER, context)
        
        # Step 2: Extract entities
        await self._run_agent(AgentType.ENTITY_EXTRACTOR, context)

        return context
    
    async def orchestrate_resume_jd_analysis(
        self, 
        user_id: str,
        resume_file_id: str, 
        resume_content: str, 
        resume_file_type: str,
        jd_file_id: Optional[str] = None, # If JD is an uploaded file
        jd_content: Optional[str] = None, # If JD is uploaded content
        jd_url: Optional[str] = None # If JD is a URL
    ) -> Dict[str, Any]:
        """
        Main orchestration method for resume-job description analysis and enhancement.
        """
        self.logger.info(f"Starting orchestration for user {user_id} with resume {resume_file_id}")
        
        final_results = {}
        
        # --- PHASE 1: Process Resume ---
        # Initial processing of the resume document
        resume_context = await self.process_document_for_analysis(
            user_id=user_id, 
            file_id=resume_file_id, 
            content=resume_content, 
            file_type=resume_file_type
        )
        final_results["resume_classification"] = resume_context.previous_results[AgentType.CLASSIFIER].data
        final_results["resume_entities"] = resume_context.previous_results[AgentType.ENTITY_EXTRACTOR].data
        self.logger.info(f"Resume processed: {final_results['resume_classification']['primary_classification']}")

        # Validate resume classification (optional but good practice)
        if resume_context.previous_results[AgentType.CLASSIFIER].data.get("primary_classification") != "Resume":
            self.logger.warning(f"Uploaded file {resume_file_id} classified as {final_results['resume_classification']['primary_classification']}, not 'Resume'. Proceeding but results may vary.")
            # You might choose to raise an error or halt here in a production system

        # --- PHASE 2: Process Job Description ---
        jd_doc_id = jd_file_id if jd_file_id else f"jd-url-{hash(jd_url)}" if jd_url else "jd-uploaded-temp"
        jd_actual_content = jd_content

        if jd_url:
            # Use WebScraperAgent to get JD content from URL
            scraper_context = DocumentContext(
                user_id=user_id,
                file_id=jd_doc_id, # Temporary ID for scraping process
                content="", # Content will be filled by scraper
                file_type="webpage",
                metadata={"url": jd_url}
            )
            scraper_result = await self._run_agent(AgentType.WEB_SCRAPER, scraper_context)
            jd_actual_content = scraper_result.data.get("extracted_content")
            # Store scraper result in final_results if needed
            final_results["jd_web_scrape_result"] = scraper_result.data
            self.logger.info(f"JD content scraped from URL: {jd_url}")

            # Also try to scrape company info from the base URL of the JD
            if scraper_result.data.get("base_url"):
                company_scraper_context = DocumentContext(
                    user_id=user_id,
                    file_id=f"{jd_doc_id}-company-info",
                    content="",
                    file_type="webpage",
                    metadata={"url": scraper_result.data["base_url"]} # Scrape the base domain
                )
                company_scraper_result = await self._run_agent(AgentType.WEB_SCRAPER, company_scraper_context)
                resume_context.metadata['company_info'] = company_scraper_result.data # Add to resume context for optimizer
                self.logger.info(f"Company info scraped from base URL: {scraper_result.data['base_url']}")
        
        if not jd_actual_content:
            raise ValueError("Job Description content is missing or could not be scraped.")

        jd_context = await self.process_document_for_analysis(
            user_id=user_id,
            file_id=jd_doc_id,
            content=jd_actual_content,
            file_type="txt" if not jd_url else "web_scraped_text" # Adjust file_type based on source
        )
        final_results["jd_classification"] = jd_context.previous_results[AgentType.CLASSIFIER].data
        final_results["jd_entities"] = jd_context.previous_results[AgentType.ENTITY_EXTRACTOR].data
        self.logger.info(f"Job Description processed: {final_results['jd_classification']['primary_classification']}")

        # Store JD processing results in resume_context.metadata for cross-document agents
        resume_context.metadata['job_description'] = {
            'file_id': jd_doc_id,
            'content': jd_actual_content,
            'entities': jd_context.previous_results[AgentType.ENTITY_EXTRACTOR].data.get("entities", {}),
            'entity_extractor_result': jd_context.previous_results[AgentType.ENTITY_EXTRACTOR] # Full result object
        }
        
        # --- PHASE 3: Cross-Document Analysis (Resume vs. JD) ---
        
        # Step 3: Relationship Mapping (Resume vs. JD)
        # RelationshipMapper needs resume context, and JD context/entities which are now in resume_context.metadata
        relationship_map_result = await self._run_agent(AgentType.RELATIONSHIP_MAPPER, resume_context)
        final_results["relationship_map"] = relationship_map_result.data
        self.logger.info("Relationship mapping completed.")

        # Step 4: Job Matching
        # JobMatcher needs relationship map, now available in resume_context
        job_match_result = await self._run_agent(AgentType.JOB_MATCHER, resume_context)
        final_results["job_match_analysis"] = job_match_result.data
        final_results["overall_match_percentage"] = job_match_result.data.get("overall_match_percentage")
        self.logger.info(f"Job matching completed with {final_results['overall_match_percentage']}% match.")
        
        # Step 5: Resume Optimization
        # ResumeOptimizer needs all prior context for comprehensive suggestions
        resume_optimizer_result = await self._run_agent(AgentType.RESUME_OPTIMIZER, resume_context)
        final_results["resume_enhancement_suggestions"] = resume_optimizer_result.data
        self.logger.info("Resume optimization suggestions generated.")

        self.logger.info(f"Orchestration complete for user {user_id}.")
        return final_results