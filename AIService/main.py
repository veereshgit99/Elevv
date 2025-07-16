# AIService/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Union
import logging
import os
import uuid
import tempfile
import asyncio

# Import your orchestrator and utility services
from agents.orchestrator import DocumentAnalysisOrchestrator
from services.storage import store_enhanced_analysis # To save results to DB

# Initialize FastAPI app
app = FastAPI(
    title="LexIQ Career AI Service",
    description="Backend for AI-powered resume and job description analysis, matching, and enhancement."
)

# Configure CORS (Cross-Origin Resource Sharing)
# IMPORTANT: Adjust origins for production deployment!
origins = [
    "http://localhost",
    "http://localhost:3000", # Example for a React/Vue frontend
    "chrome-extension://<YOUR_CHROME_EXTENSION_ID>" # Replace with your actual Chrome Extension ID
    # Add your actual frontend and extension origins here in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

# Initialize Orchestrator
orchestrator = DocumentAnalysisOrchestrator()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Pydantic Models for Request Body ---
# Define this ideally in AIService/models/request_schema.py and import it
class FileInput(BaseModel):
    file_id: Optional[str] = Field(None, description="Unique ID of the file, if already uploaded to storage (e.g., S3).")
    content: Optional[str] = Field(None, description="Raw text content of the file. Required if file_id is not provided.")
    file_name: str = Field(..., description="Original name of the file (e.g., 'my_resume.pdf').")
    file_type: str = Field(..., description="MIME type or file extension (e.g., 'application/pdf', 'docx', 'txt').")

class AnalyzeApplicationRequest(BaseModel):
    user_id: str = Field(..., description="Unique ID of the user initiating the request.")
    resume: FileInput = Field(..., description="Details for the candidate's resume.")
    job_description: Union[FileInput, str] = Field(..., description="Details for the Job Description. Can be a FileInput object (for uploaded JD) or a string (for JD URL).")
    
    # Custom validator to ensure either content or file_id is provided for FileInput
    # (This logic would be inside FileInput if it were a separate class)
    # For simplicity here, assume it's handled by upstream logic or content is always present.


@app.post("/analyze-application")
async def analyze_application(request: AnalyzeApplicationRequest):
    """
    Analyzes a candidate's resume against a job description,
    performs matching, and generates enhancement suggestions.
    """
    user_id = request.user_id
    
    # --- Process Resume ---
    resume_file_id = request.resume.file_id if request.resume.file_id else str(uuid.uuid4())
    resume_content = request.resume.content

    # If resume content is not directly provided but file_id is, you'd fetch it from S3 here
    # For simplicity, this example assumes content is directly provided for resume.
    if not resume_content:
        logger.error(f"Resume content missing for user {user_id}, resume_file_id {resume_file_id}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume content is required.")
    
    # --- Process Job Description ---
    jd_file_id: Optional[str] = None
    jd_content: Optional[str] = None
    jd_url: Optional[str] = None

    if isinstance(request.job_description, str):
        # JD is provided as a URL
        jd_url = request.job_description
        jd_file_id = str(uuid.uuid4()) # Generate a new ID for the JD fetched from URL
        logger.info(f"JD provided as URL: {jd_url} for user {user_id}")
    else:
        # JD is provided as file content
        jd_file_id = request.job_description.file_id if request.job_description.file_id else str(uuid.uuid4())
        jd_content = request.job_description.content
        if not jd_content:
             logger.error(f"JD content missing for user {user_id}, jd_file_id {jd_file_id}")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job Description content is required.")
        logger.info(f"JD provided as file content for user {user_id}")


    try:
        # Call the orchestrator to run the full analysis workflow
        analysis_results = await orchestrator.orchestrate_resume_jd_analysis(
            user_id=user_id,
            resume_file_id=resume_file_id,
            resume_content=resume_content,
            resume_file_type=request.resume.file_type,
            jd_file_id=jd_file_id,
            jd_content=jd_content,
            jd_url=jd_url
        )

        # Store the comprehensive analysis results in your database
        # You'll need to adapt store_enhanced_analysis in services/storage.py
        # to handle the new complex structure of analysis_results.
        await store_enhanced_analysis(
            user_id=user_id,
            resume_id=resume_file_id,
            job_description_id=jd_file_id,
            analysis_data=analysis_results
        )

        logger.info(f"Analysis complete for user {user_id}. Match: {analysis_results.get('overall_match_percentage')}%")
        return JSONResponse(status_code=status.HTTP_200_OK, content=analysis_results)

    except HTTPException: # Re-raise FastAPI HTTP exceptions directly
        raise
    except Exception as e:
        logger.error(f"Error during application analysis for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "LexIQ Career AI Service is running"}