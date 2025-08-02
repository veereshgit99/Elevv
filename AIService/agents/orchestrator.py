# AIService/agents/orchestrator.py

import logging
import uuid, json
import fitz # PyMuPDF for PDF text extraction
import asyncio # For async operations - parallel processing
import io
import time
from typing import Any, Dict, Optional

# Add imports for making HTTP requests and handling S3
import httpx  # A modern, async-friendly HTTP client
import boto3
from botocore.exceptions import ClientError

from agents.base import AgentType, DocumentContext, BaseAgent, AgentResult
from agents.classifier_agent import DocumentClassifierAgent
from agents.entity_extractor_agent import EntityExtractorAgent
from agents.job_matching_agent import JobMatchingAgent
from agents.relationship_mapper_agent import RelationshipMapperAgent
from agents.resume_optimizer_agent import ResumeOptimizerAgent
from agents.web_scraper_agent import WebScraperAgent

logger = logging.getLogger(__name__)


class DocumentAnalysisOrchestrator:
    """
    Orchestrates the execution of various document analysis agents
    for resume-job description matching and enhancement
    """

    def __init__(self):
        self.agents: Dict[AgentType, BaseAgent] = {}
        self._initialize_agents()
        # Initialize an async HTTP client to communicate with FileService
        self.http_client = httpx.AsyncClient()
        # Initialize S3 client for downloading
        self.s3_client = boto3.client("s3")
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
        
    def _extract_text_from_content(self, file_content: bytes, mime_type: str) -> str:
        """
        Extracts plain text from file content (bytes) based on its MIME type.
        Currently supports PDF.
        """
        self.logger.info(f"Extracting text from content with MIME type: {mime_type}")
        if "pdf" in mime_type:
            try:
                # Open the PDF from the in-memory bytes
                pdf_document = fitz.open(stream=io.BytesIO(file_content), filetype="pdf")
                text = "".join(page.get_text() for page in pdf_document)
                pdf_document.close()
                return text
            except Exception as e:
                self.logger.error(f"Failed to extract text from PDF: {e}")
                raise ValueError("Could not extract text from the provided PDF file.")
        else:
            # For now, assume other types are plain text. You can add more handlers here.
            # (e.g., for DOCX files using python-docx)
            try:
                return file_content.decode('utf-8')
            except UnicodeDecodeError:
                self.logger.warning("Could not decode content as UTF-8. Returning as is.")
                return str(file_content)

    async def _get_resume_details(self, user_id: str, resume_id: str, auth_token: str) -> Dict[str, Any]:
        """
        Calls the FileService to get the metadata for a specific resume.
        """
        file_service_url = f"http://localhost:8001/users/{user_id}/resume/{resume_id}/s3-link"
        try:
            self.logger.info(f"Fetching resume details for user {user_id}, resume {resume_id}")
            
            # Add the Authorization header
            headers = {
                "Authorization": f"Bearer {auth_token}"
            }
            
            response = await self.http_client.get(file_service_url, headers=headers, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            self.logger.error(f"FileService returned an error: {e.response.status_code} {e.response.text}")
            raise ValueError(f"Could not find resume {resume_id} for user {user_id}")
        except httpx.RequestError as e:
            self.logger.error(f"Could not connect to FileService: {e}")
            raise ConnectionError("Failed to connect to the FileService.")

    # --- NEW: Helper method to download resume content from S3 ---
    # In AIService/agents/orchestrator.py

# ... (inside the DocumentAnalysisOrchestrator class)

    def _download_resume_from_s3(self, bucket_name: str, key: str) -> str:
        """
        Downloads the resume content from S3 given its bucket and key.
        """
        try:
            # The line that split the path has been removed, as we now get the bucket and key directly.
            self.logger.info(f"Downloading resume from S3: bucket={bucket_name}, key={key}")
            response = self.s3_client.get_object(Bucket=bucket_name, Key=key)
            return response['Body'].read()
        except ClientError as e:
            self.logger.error(f"S3 ClientError downloading s3://{bucket_name}/{key}: {e}")
            raise FileNotFoundError(f"Could not download resume from S3 path: s3://{bucket_name}/{key}")
        except Exception as e:
            self.logger.error(f"Unexpected error downloading from S3: {e}")
            raise

    # --- REFACTORED: Main orchestration method for parallel running of the agents---
    # Need to add console logging to track the response times of each agent
    async def orchestrate_initial_analysis(
        self,
        user_id: str,
        resume_id: str,
        job_title: str,
        jd_content: str,
        auth_token: str,
        company_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main orchestration method that now fetches the resume internally.
        """
        self.logger.info(f"Starting orchestration for user {user_id}")
        final_results = {}
        
        # --- PHASE 1: Resume Processing ---
        response_time = time.time()
        print(f"\n📄 PHASE 1: RESUME PROCESSING")
        print(f"{'─'*40}")

        # --- PHASE 1 & 2: Process Resume and JD in Parallel ---
        # Get resume details first
        resume_details = await self._get_resume_details(user_id, resume_id, auth_token)
        resume_s3_bucket = resume_details.get("s3_bucket")
        resume_s3_key = resume_details.get("s3_path")
        resume_file_id = resume_details.get("resume_id")
        resume_mime_type = resume_details.get("mime_type", "application/pdf")
        
        if not resume_s3_bucket or not resume_s3_key:
            raise ValueError("Missing S3 bucket or key from FileService response.")
        
        # Download the raw binary content from S3
        resume_binary_content = self._download_resume_from_s3(resume_s3_bucket, resume_s3_key)

        print("Resume details fetched successfully. Time: ",  response_time)

        # --- NEW: Extract text from the binary content ---
        resume_content = self._extract_text_from_content(resume_binary_content, resume_mime_type)

        # Process resume and JD in parallel
        print(f"\n🔄 PHASE 2: PARALLEL PROCESSING")
        print(f"{'─'*40}")
        
        # Now that we have the resume content, proceed with analysis
        resume_task = asyncio.create_task(self.process_document_for_analysis(
            user_id=user_id,
            file_id=resume_file_id,
            content=resume_content,
            file_type=resume_details.get("mime_type", "application/pdf")
        ))
        
        # Process JD now
        if not jd_content:
            raise ValueError("Job Description content is missing or could not be scraped.")
        
        jd_doc_id = f"jd-text-{uuid.uuid4()}"
        
        jd_metadata = {
            "job_title": job_title,
            "company_name": company_name,
            "doc_type": "Job Description"
        }

        jd_task = asyncio.create_task(self.process_document_for_analysis(
            user_id=user_id,
            file_id=jd_doc_id,
            content=jd_content,
            file_type="text",
            initial_metadata=jd_metadata # <-- Pass the metadata here
        ))

        # Run both tasks concurrently
        resume_context, jd_context = await asyncio.gather(resume_task, jd_task)
        
        print("parallel processing completed. Time: ", response_time)
        
        final_results["resume_classification"] = resume_context.previous_results[AgentType.CLASSIFIER].data
        final_results["resume_entities"] = resume_context.previous_results[AgentType.ENTITY_EXTRACTOR].data
        self.logger.info(f"Resume {resume_file_id} processed: {final_results['resume_classification']['primary_classification']}")
        
        final_results["jd_classification"] = jd_context.previous_results[AgentType.CLASSIFIER].data
        
        jd_entity_data = jd_context.previous_results[AgentType.ENTITY_EXTRACTOR].data
        final_results["jd_entities"] = jd_entity_data
        
        resume_context.metadata['job_description'] = {
            'file_id': jd_doc_id,
            'content': jd_content,
            'entities': jd_entity_data.get("entities", {})
        }
        
        # --- PHASE 3: Cross-Document Analysis ---
        print(f"\n🔗 PHASE 3: CROSS-DOCUMENT ANALYSIS")
        print(f"{'─'*40}")
        # --- OPTIMIZATION 1: Create a lean context for the Relationship Mapper ---
        # Instead of sending the full original documents again, we only send the extracted entities.
        # This drastically reduces the token count.
        mapper_context = DocumentContext(
            user_id=user_id,
            file_id=resume_context.file_id,
            content="", # We no longer need the raw content
            file_type="application/json",
            metadata={
                'resume_entities': final_results["resume_entities"]["entities"],
                'jd_entities': final_results["jd_entities"]["entities"]
            },
            previous_results={}
        )
        relationship_map_result = await self._run_agent(AgentType.RELATIONSHIP_MAPPER, mapper_context)
        final_results["relationship_map"] = relationship_map_result.data
        
        print("Relationship mapping completed. Time: ", response_time)
        
        
        # --- Job Matching ---
        # --- OPTIMIZATION 2: Create a lean context for the Job Matcher ---
        # The matcher doesn't need the full resume or JD text. It only needs the
        # high-level map of connections that the previous agent created.
        matcher_context = DocumentContext(
            user_id=user_id,
            file_id=resume_context.file_id,
            content="", # No raw content needed
            file_type="application/json",
            metadata={
                'relationship_map': final_results["relationship_map"]
            },
            previous_results={}
        )
        job_match_result = await self._run_agent(AgentType.JOB_MATCHER, matcher_context)
        final_results["job_match_analysis"] = job_match_result.data
        final_results["overall_match_percentage"] = job_match_result.data.get("overall_match_percentage")
        
        final_results["resume content"] = resume_content  # Store the resume content for later use
        
        print("Job matching completed. Time: ", response_time)
        
        # --- ADD THESE LINES ---
        # Add the necessary IDs and content to the final results so they can be
        # passed to the next endpoint.
        final_results["user_id"] = user_id
        final_results["resume_id"] = resume_file_id
        final_results["resume_content"] = resume_content # Use "resume_content" (no space)
        final_results["job_description"] = resume_context.metadata['job_description']
        final_results["resume_file_type"] = resume_mime_type
        
        return final_results

    # In AIService/agents/orchestrator.py

    async def orchestrate_resume_optimization(self, analysis_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs only the resume optimization agent.
        """
        self.logger.info("Starting on-demand resume optimization")
        
        # --- CORRECTED: Re-create the DocumentContext with all required fields ---
        resume_context = DocumentContext(
            user_id=analysis_context.get("user_id"),
            file_id=analysis_context.get("resume_id"),
            content=analysis_context.get("resume_content"),
            file_type=analysis_context.get("resume_file_type"),
            metadata={'job_description': analysis_context.get('job_description', {})},
            # We provide default values for the non-data fields
            previous_results={
                AgentType.RELATIONSHIP_MAPPER: AgentResult(
                    agent_type=AgentType.RELATIONSHIP_MAPPER,
                    success=True,
                    data=analysis_context.get("relationship_map", {}),
                    confidence=1.0, # Assume 100% confidence in previous data
                    processing_time=0.0
                ),
                AgentType.JOB_MATCHER: AgentResult(
                    agent_type=AgentType.JOB_MATCHER,
                    success=True,
                    data=analysis_context.get("job_match_analysis", {}),
                    confidence=1.0,
                    processing_time=0.0
                )
            }
        )

        optimizer_result = await self._run_agent(AgentType.RESUME_OPTIMIZER, resume_context)
        return optimizer_result.data

    async def _run_agent(self, agent_type: AgentType, context: DocumentContext) -> AgentResult:
        """Helper to run a single agent and update context with its result."""
        agent = self.agents.get(agent_type)
        if not agent:
            raise ValueError(f"Agent of type {agent_type.value} not found.")
        
        self.logger.info(f"Running agent: {agent_type.value} for file {context.file_id}")
        result = await agent._execute_with_timing(context)
        
        # --- NEW: Add a debugging check here ---
        try:
            # We try to serialize the agent's data immediately.
            # If it fails, we know this agent is the source of the problem.
            json.dumps(result.data)
        except TypeError as e:
            self.logger.error(f"AGENT ERROR: The result from '{agent_type.value}' is not JSON serializable.")
            # This will raise a new, more specific error that tells us exactly which agent to fix.
            raise TypeError(f"Agent '{agent_type.value}' returned non-serializable data: {e}")
        # --- END of new check ---
            
        context.previous_results[agent_type] = result
        
        if not result.success:
            self.logger.error(f"Agent {agent_type.value} failed: {result.error}")
            raise RuntimeError(f"Agent {agent_type.value} failed: {result.error}")
            
        return result

    async def process_document_for_analysis(self, user_id: str, file_id: str, content: str, file_type: str, initial_metadata: Dict[str, Any] = None) -> DocumentContext:
        """
        Processes a single document through initial analysis agents.
        """
        if initial_metadata is None:
            initial_metadata = {}
            
        context = DocumentContext(
            user_id=user_id,
            file_id=file_id,
            content=content,
            file_type=file_type,
            metadata=initial_metadata,
            previous_results={}
        )

        await self._run_agent(AgentType.CLASSIFIER, context)
        await self._run_agent(AgentType.ENTITY_EXTRACTOR, context)

        return context