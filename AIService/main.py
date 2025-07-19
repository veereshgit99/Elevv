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


# Uncomment this if you want to use OAuth2 for authentication


# --- 1. Setup Authentication ---
# This scheme will look for an "Authorization: Bearer <token>" header
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") # "token" is a dummy URL

# async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
#     """
#     Dependency to decode JWT token and extract the user_id.
#     In a real application, you would use a library like python-jose to decode
#     and validate the token.
#     """
#     if not token:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Not authenticated"
#         )
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
    job_title: str = Field(..., description="The title of the job.")
    company_name: Optional[str] = Field(None, description="The name of the company.")
    job_description_text: str = Field(..., description="The main text content of the job description.")
    # You can add other fields from the UI here, like URL if you want to store it
    job_url: Optional[HttpUrl] = Field(None, description="The original URL of the job posting.")


# --- FastAPI App Initialization ---
app = FastAPI(
    title="LexIQ Career AI Service",
    description="Analyzes resumes against job descriptions."
)
orchestrator = DocumentAnalysisOrchestrator()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Update the API Endpoint ---
@app.post("/analyze-application")
async def analyze_application(
    request: JobMatchRequest,
    #user_id: str = Depends(get_current_user_id) # Or your hardcoded ID for testing
    
    # Hardcode user_id for testing purposes, later uncomment the line above
    #user_id = "2eb8ce01-a735-4f14-a30d-30346a3f76ec" # Anmol's Resume
    #user_id = "65a4c0a2-5872-4459-9a60-e7a2fadea4d0" # Veer's Resume
    user_id = "7a90fc55-ec79-483a-8ba0-84ecab8b8c1d" # Prajwal's Resume
    
):
    """
    Analyzes the logged-in user's primary resume against the provided job description text.
    """
    logger.info(f"Received analysis request for user_id: {user_id}")
    
    try:
        # The call to the orchestrator is now much simpler.
        analysis_results = await orchestrator.orchestrate_resume_jd_analysis(
            user_id=user_id,
            job_title=request.job_title,
            company_name=request.company_name,
            jd_content=request.job_description_text
        )

        return JSONResponse(status_code=status.HTTP_200_OK, content=analysis_results)

    except Exception as e:
        logger.error(f"Error during application analysis for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
