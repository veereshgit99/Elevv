# AIService/main.py

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any, Union
from jose import jwt, JWTError
from services.analysis_storage import store_analysis_complete, get_resume_parsed_json, get_full_analysis
from services.document_generator import auto_apply_suggestions, generate_word_document
import logging
import os
import uuid
import io
from services.analysis_storage import update_analysis_with_enhancement
import asyncio

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
    analysis_id: str
    job_title: str
    resume_id: str
    resume_content: str
    job_description: Dict[str, Any]
    relationship_map: Dict[str, Any]
    job_match_analysis: Dict[str, Any]


# --- FastAPI App Initialization ---
app = FastAPI(
    title="Elevv Career AI Service",
    description="Analyzes resumes against job descriptions."
)
orchestrator = DocumentAnalysisOrchestrator()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://elevv.net", "chrome-extension://cfbjpbpglpenbmlndohaldffnjfncjfm", "chrome-extension://hdlkdocilmllfboionmjpekkjjfpdfjm"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In AIService/main.py, update the analyze_application endpoint
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
            resume_id=request.resume_id,
            job_title=request.job_title,
            company_name=request.company_name,
            jd_content=request.job_description_text,
            auth_token=token
        )
        
        # Add request data to results for storage
        analysis_results["job_title"] = request.job_title
        analysis_results["company_name"] = request.company_name
        
        # Store the analysis
        storage_summary = await store_analysis_complete(user_id, analysis_results, auth_token=token)
        
        # Add the analysis_id to the response
        analysis_results["analysis_id"] = storage_summary["analysis_id"]
        
        return JSONResponse(status_code=status.HTTP_200_OK, content=analysis_results)

    except Exception as e:
        logger.error(f"Error during application analysis for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    
@app.post("/optimize-resume")
async def optimize_resume(
    request: OptimizationRequest,
    user_id: str = Depends(get_current_user_id),
    token: str = Depends(oauth2_scheme)
):
    """
    Takes the context from an initial analysis and generates resume suggestions.
    Updates the analysis record with the predicted match score after enhancement.
    """
    logger.info(f"Received optimization request for user_id: {user_id}")
    
    try:
        # Call the optimization method
        optimization_results = await orchestrator.orchestrate_resume_optimization(
            analysis_context=request.dict()
        )
        
        # Extract the predicted match score
        match_after_enhancement = optimization_results.get("match_after_enhancement")
        
        # Prepare the response immediately
        response_data = {
            "enhancement_suggestions": optimization_results.get("enhancement_suggestions", []),
            "overall_feedback": optimization_results.get("overall_feedback", ""),
            "match_after_enhancement": match_after_enhancement,
            "llm_model_used": optimization_results.get("llm_model_used", "")
        }
        
        # Update analysis record asynchronously (fire-and-forget)
        if request.analysis_id and match_after_enhancement is not None:
            # Create a background task to update the analysis
            async def update_analysis_background():
                try:
                    await update_analysis_with_enhancement(
                        user_id=user_id,
                        analysis_id=request.analysis_id,
                        match_after_enhancement=int(match_after_enhancement),
                        enhancement_suggestions=optimization_results.get("enhancement_suggestions", []),
                        auth_token=token
                    )
                    logger.info(f"✅ Updated analysis {request.analysis_id} with enhanced match score: {match_after_enhancement}%")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to update analysis record {request.analysis_id}: {e}")
                    # Don't fail the whole request if this update fails
            
            # Fire the background task without awaiting
            asyncio.create_task(update_analysis_background())
            logger.info(f"🚀 Background task started to update analysis {request.analysis_id}")
        else:
            logger.warning("⚠️ No analysis_id provided or match_after_enhancement is None - skipping database update")
        
        # Return response immediately
        return JSONResponse(status_code=status.HTTP_200_OK, content=response_data)
        
    except Exception as e:
        logger.error(f"Error during resume optimization for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/download-enhanced-resume")
async def download_enhanced_resume(
    analysis_id: str,
    user_id: str = Depends(get_current_user_id),
    token: str = Depends(oauth2_scheme)
):
    """
    Generate and download enhanced Word resume with applied AI suggestions.
    
    This endpoint:
    1. Fetches enhancement suggestions from the analysis record
    2. Fetches the original resume parsed JSON
    3. Applies the suggestions to enhance the resume
    4. Generates a professional Word document
    5. Returns it as a downloadable file
    """
    logger.info(f"Received download request for analysis_id: {analysis_id}, user_id: {user_id}")
    
    try:
        # 1. Get complete analysis data (includes both suggestions and resume_id)
        logger.info(f"Fetching complete analysis data for analysis: {analysis_id}")
        analysis_data = await get_full_analysis(user_id, analysis_id, token)
        
        # Extract enhancement suggestions
        enhancement_suggestions = analysis_data.get("enhancement_suggestions", [])
        if not enhancement_suggestions:
            raise HTTPException(
                status_code=404, 
                detail="No enhancement suggestions found for this analysis"
            )
        
        # Extract resume_id
        resume_id = analysis_data.get("resume_id")
        if not resume_id:
            raise HTTPException(
                status_code=400,
                detail="Resume ID not found in analysis record"
            )
        
        logger.info(f"Found {len(enhancement_suggestions)} enhancement suggestions for resume {resume_id}")
        
        # 2. Get original resume parsed JSON
        logger.info(f"Fetching parsed resume JSON for resume: {resume_id}")
        resume_json = await get_resume_parsed_json(user_id, resume_id, token)
        
        # 3. Apply enhancement suggestions to resume
        logger.info("Applying enhancement suggestions to resume...")
        enhanced_resume = auto_apply_suggestions(resume_json, enhancement_suggestions)
        
        # 4. Generate Word document
        logger.info("Generating Word document...")
        doc_bytes = generate_word_document(enhanced_resume)
        
        # 5. Create filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"enhanced_resume_{timestamp}.docx"
        
        logger.info(f"Successfully generated enhanced resume document: {filename}")
        
        # 6. Return as downloadable file
        return StreamingResponse(
            io.BytesIO(doc_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(doc_bytes))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating enhanced resume for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to generate enhanced resume: {str(e)}"
        )
