# FileService/routes/files.py

import uuid
import logging
from typing import Dict, Any

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel, Field

# Import the new security dependency
from security import get_current_user_id

# Import S3 utility, config, and DB operations
from services.s3_utils import generate_presigned_url
import config
from database.user_operations import update_user_profile, get_user_profile
from database.resume_operations import save_resume_metadata, get_resume_metadata

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Pydantic Models for Resume Operations ---
class ResumeUploadResponse(BaseModel):
    resume_id: str
    s3_upload_url: str
    s3_form_fields: Dict[str, str]

# --- Resume Management Endpoints ---

@router.post("/resumes/upload-url", response_model=ResumeUploadResponse, tags=["Resumes"])
async def get_resume_upload_url(
    user_id: str = Depends(get_current_user_id), 
    file: UploadFile = File(...)
):
    """
    Generates a presigned URL for a logged-in user to upload their resume.
    In a real app, the user_id would come from a decoded JWT token.
    """
    resume_id = str(uuid.uuid4())
    s3_key = f"users/{user_id}/resumes/{resume_id}/{file.filename}"

    try:
        s3_upload_details = generate_presigned_url(s3_key)
        if not s3_upload_details:
            raise HTTPException(status_code=500, detail="Failed to generate S3 presigned URL.")

        await save_resume_metadata(
            user_id=user_id,
            resume_id=resume_id,
            s3_path=s3_key,
            file_name=file.filename,
            mime_type=file.content_type,
            status="pending_upload",
            is_primary=True
        )
        
        await update_user_profile(user_id, updates={"primary_resume_id": resume_id})

        return ResumeUploadResponse(
            resume_id=resume_id,
            s3_upload_url=s3_upload_details['url'],
            s3_form_fields=s3_upload_details['fields']
        )
    except Exception as e:
        logger.error(f"Error generating upload URL for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/users/{user_id}/primary-resume-s3-link", tags=["Resumes"])
async def get_user_primary_resume_s3_link(user_id: str):
    """
    Retrieves the S3 location for the user's primary resume.
    This is called by the AIService.
    """
    try:
        user_profile = await get_user_profile(user_id)
        if not user_profile or not user_profile.get('primary_resume_id'):
            raise HTTPException(status_code=404, detail="User not found or no primary resume set.")
        
        primary_resume_id = user_profile['primary_resume_id']
        resume_metadata = await get_resume_metadata(user_id, primary_resume_id)
        
        if not resume_metadata or resume_metadata.get('status') != 'uploaded':
            raise HTTPException(status_code=404, detail="Primary resume not found or not fully uploaded.")
        
        return {
            "s3_bucket": config.S3_BUCKET_NAME,
            "s3_path": resume_metadata['s3_path'],
            "file_name": resume_metadata['file_name'],
            "mime_type": resume_metadata['mime_type'],
            "resume_id": primary_resume_id
        }
    except Exception as e:
        logger.error(f"Error getting primary resume link for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")