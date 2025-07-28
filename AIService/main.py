# AIService/main.py

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any, Union
from jose import jwt, JWTError
import logging
import os
import uuid

# Load environment variables
from dotenv import load_dotenv  
load_dotenv()

# Import your orchestrator
from agents.orchestrator import DocumentAnalysisOrchestrator

from fastapi.middleware.cors import CORSMiddleware

# --- 1. Setup Authentication ---
# This scheme will look for an "Authorization: Bearer <token>" header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") 

# Use the same secret as your NextAuth
NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET")
if not NEXTAUTH_SECRET:
    raise RuntimeError("NEXTAUTH_SECRET is not set in environment variables")

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """
    Decode JWT token and extract the user_id (sub claim)
    """
    try:
        # Decode using the same secret and algorithm as NextAuth
        payload = jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=["HS256"]
        )
        
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: User ID not found"
            )
        return user_id
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {e}"
        )
    

# --- 2. Define the Simplified Request Body ---
class JobMatchRequest(BaseModel):
    job_title: str = Field(..., description="The title of the job.")
    company_name: Optional[str] = Field(None, description="The name of the company.")
    job_description_text: str = Field(..., description="The main text content of the job description.")
    resume_id: str = Field(..., description="The ID of the resume to analyze")  # Add this
    job_url: Optional[HttpUrl] = Field(None, description="The original URL of the job posting.")
    
class OptimizationRequest(BaseModel):
    # This model will contain all the data from the first analysis
    user_id: str
    resume_id: str
    resume_content: str
    job_description: Dict[str, Any]
    relationship_map: Dict[str, Any]
    job_match_analysis: Dict[str, Any]


# --- FastAPI App Initialization ---
app = FastAPI(
    title="LexIQ Career AI Service",
    description="Analyzes resumes against job descriptions."
)
orchestrator = DocumentAnalysisOrchestrator()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze-application")
async def analyze_application(
    request: JobMatchRequest,
    user_id: str = Depends(get_current_user_id),
    token: str = Depends(oauth2_scheme)
):
    """
    Performs the initial, fast analysis of a resume against a job description.
    """
    logger.info(f"Received analysis request for user_id: {user_id}, resume_id: {request.resume_id}")
    
    try:
        analysis_results = await orchestrator.orchestrate_initial_analysis(
            user_id=user_id,
            resume_id=request.resume_id,  # Pass the resume_id
            job_title=request.job_title,
            company_name=request.company_name,
            jd_content=request.job_description_text,
            auth_token=token  # Pass the auth token for FileService calls
        )

        return JSONResponse(status_code=status.HTTP_200_OK, content=analysis_results)

    except Exception as e:
        logger.error(f"Error during application analysis for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    
# --- NEW: The Second, On-Demand Endpoint ---
@app.post("/optimize-resume")
async def optimize_resume(request: OptimizationRequest):
    """
    Takes the context from an initial analysis and generates resume suggestions.
    """
    logger.info(f"Received optimization request for user_id: {request.user_id}")
    try:
        # Call the new optimization-only method
        optimization_results = await orchestrator.orchestrate_resume_optimization(
            analysis_context=request.dict()
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=optimization_results)
    except Exception as e:
        logger.error(f"Error during resume optimization for user {request.user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
