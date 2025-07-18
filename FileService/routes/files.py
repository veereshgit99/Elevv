# FileService/routes/files.py

import json
import uuid
import logging
import os
from typing import Dict, Any, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Form, Body, Depends
from pydantic import BaseModel, Field, ValidationError

# Import S3 utility for presigned URLs
from services.s3_utils import generate_presigned_url

# Import the new DB operations for users and resumes
from database.user_operations import create_user_profile, update_user_profile, get_user_profile
from database.resume_operations import save_resume_metadata, get_resume_metadata, set_primary_resume

import config 

# Load S3 bucket name from environment variable
from dotenv import load_dotenv
load_dotenv()
S3_BUCKET = os.getenv("S3_BUCKET", "awsbucket288518840771-files")

router = APIRouter()
logger = logging.getLogger(__name__)
logger.info(f"Using S3 Bucket: {S3_BUCKET}")

# --- Pydantic Models for Combined Request ---
class ProfileCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="User's full name.")
    email: str = Field(..., min_length=1, max_length=255, description="User's email address (must be unique).")
    profile_summary: Optional[str] = Field(None, max_length=1000, description="Optional brief summary of user's profile.")

class ProfileCreateResponse(BaseModel):
    user_id: str = Field(..., description="Unique ID of the newly created user.")
    resume_id: str = Field(..., description="Unique ID for the uploaded resume.")
    s3_upload_url: str = Field(..., description="Pre-signed URL for direct upload of the resume file to S3.")
    s3_form_fields: Dict[str, str] = Field(..., description="Form fields to include in the S3 direct POST upload.")
    message: str = "User profile created and resume upload initiated."

# --- Helper function to parse JSON from form data ---
def profile_data_parser(profile_data_str: str = Form(...)) -> ProfileCreateRequest:
    try:
        return ProfileCreateRequest.parse_raw(profile_data_str)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=json.loads(e.json()),
        )

# --- Combined Endpoint: Create Profile and Initiate Resume Upload ---
@router.post("/profile/create-and-upload-resume", response_model=ProfileCreateResponse)
async def create_profile_and_initiate_resume_upload(
    profile_data: ProfileCreateRequest = Depends(profile_data_parser),
    resume_file: UploadFile = File(..., description="The resume file to upload (PDF, DOCX, etc.)"),
):
    """
    Creates a new user profile and generates a pre-signed URL for direct resume upload to S3.
    Client should then use the provided URL and fields to upload the file.
    """
    user_id = str(uuid.uuid4())
    resume_id = str(uuid.uuid4())
    
    # Extract file name and type directly from the UploadFile object
    resume_file_name = resume_file.filename
    resume_file_type = resume_file.content_type

    if not resume_file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume file name is missing.")
    if not resume_file_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume file type could not be determined.")

    try:
        # Step 1: Create User Profile
        user_created = await create_user_profile(
            user_id=user_id,
            name=profile_data.name,
            email=profile_data.email,
            profile_summary=profile_data.profile_summary
        )
        if not user_created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user profile.")
        
        # Step 2: Generate S3 Presigned URL for Resume
        s3_key = f"users/{user_id}/resumes/{resume_id}/{resume_file_name}"
        s3_upload_details = generate_presigned_url(s3_key)

        if not s3_upload_details:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate S3 presigned URL.")

        # Step 3: Save Resume Metadata with Pending Status
        resume_saved = await save_resume_metadata(
            user_id=user_id,
            resume_id=resume_id,
            s3_path=s3_key,
            file_name=resume_file_name,
            mime_type=resume_file_type,
            status="pending_upload",
            is_primary=True
        )
        if not resume_saved:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save resume metadata.")
            
        # Step 4: Update user profile with primary resume ID
        user_updated = await update_user_profile(
            user_id=user_id,
            updates={"primary_resume_id": resume_id}
        )
        if not user_updated:
             logger.warning(f"Failed to set primary_resume_id for user {user_id}. Manual update might be needed.")

        return ProfileCreateResponse(
            user_id=user_id,
            resume_id=resume_id,
            s3_upload_url=s3_upload_details['url'],
            s3_form_fields=s3_upload_details['fields']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_profile_and_initiate_resume_upload for email {profile_data.email}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


# ... (rest of the file remains the same) ...


# --- Optional: Endpoint to Get User's Primary Resume S3 Link ---
# This would be called by the AI Service if it needs to fetch a user's resume
@router.get("/users/{user_id}/primary-resume-s3-link")
async def get_user_primary_resume_s3_link(user_id: str):
    """
    Retrieves the S3 path for the user's primary resume.
    """
    try:
        user_profile = await get_user_profile(user_id)
        if not user_profile or user_profile.get('primary_resume_id') == 'None':
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or no primary resume set.")
        
        primary_resume_id = user_profile['primary_resume_id']
        resume_metadata = await get_resume_metadata(user_id, primary_resume_id)
        
        if not resume_metadata or resume_metadata.get('status') != 'uploaded':
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Primary resume not found or not fully uploaded.")
        
        # Print S3 bucket
        logger.info(f"S3 Bucket: {S3_BUCKET}")
        
        return {"s3_bucket": S3_BUCKET, "s3_path": resume_metadata['s3_path'], "file_name": resume_metadata['file_name'], "mime_type": resume_metadata['mime_type'], "resume_id": primary_resume_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting primary resume S3 link for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")