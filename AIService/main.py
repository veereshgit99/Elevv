# AIService/main.py

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any, Union
import logging
import os
import uuid

# Import your orchestrator
from agents.orchestrator import DocumentAnalysisOrchestrator

# --- 1. Setup Authentication ---
# This scheme will look for an "Authorization: Bearer <token>" header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") # "token" is a dummy URL

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """
    Dependency to decode JWT token and extract the user_id.
    In a real application, you would use a library like python-jose to decode
    and validate the token.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    # --- Placeholder Logic ---
    # For now, we'll assume the token itself is the user_id.
    # Replace this with your actual JWT decoding logic.
    # Example:
    # from jose import jwt, JWTError
    # try:
    #     payload = jwt.decode(token, YOUR_SECRET_KEY, algorithms=[ALGORITHM])
    #     user_id: str = payload.get("sub") # 'sub' is standard for subject/user_id
    #     if user_id is None:
    #         raise HTTPException(status_code=401, detail="Invalid token")
    #     return user_id
    # except JWTError:
    #     raise HTTPException(status_code=401, detail="Invalid token")
    

# --- 2. Define the Simplified Request Body ---
class JobMatchRequest(BaseModel):
    job_info: Union[HttpUrl, str] = Field(..., description="The URL of the job description, or the full text content of the JD.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="LexIQ Career AI Service",
    description="Analyzes resumes against job descriptions."
)
orchestrator = DocumentAnalysisOrchestrator()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- 3. Update the API Endpoint ---
@app.post("/analyze-application")
async def analyze_application(
    request: JobMatchRequest,
    #user_id: str = Depends(get_current_user_id) # User ID is now securely injected
    
    # for testing, let's just use a dummy user_id, later uncomment the line above
    user_id = "65a4c0a2-5872-4459-9a60-e7a2fadea4d0"  # Dummy user_id for testing purposes
):
    """
    Analyzes the logged-in user's primary resume against a job description.
    The user is identified via the Authorization header.
    """
    logger.info(f"Received analysis request for user_id: {user_id}")
    
    jd_url: Optional[HttpUrl] = None
    jd_content: Optional[str] = None
    
    if isinstance(request.job_info, HttpUrl):
        jd_url = request.job_info
    else:
        jd_content = request.job_info

    try:
        # NOTE: You will need to add the logic inside your orchestrator
        # to fetch the resume content from S3 using the user_id.
        analysis_results = await orchestrator.orchestrate_resume_jd_analysis(
            user_id=user_id,
            # ---
            jd_file_id=str(uuid.uuid4()), # Temporary ID for this JD
            jd_content=jd_content,
            jd_url=jd_url
        )

        return JSONResponse(status_code=status.HTTP_200_OK, content=analysis_results)

    except Exception as e:
        logger.error(f"Error during application analysis for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))