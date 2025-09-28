# FileService/routes/files.py

import uuid
import logging
from typing import Dict, Any
import os
import boto3

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel, Field

# Import the new security dependency
from security import get_current_user_id

from database.resume_operations import get_resumes_for_user, _get_resume_table # New function

# Import S3 utility, config, and DB operations
from services.s3_utils import generate_presigned_url
import config
from database.user_operations import update_user_profile, get_user_profile
from database.resume_operations import save_resume_metadata, get_resume_metadata, update_resume_status
from datetime import datetime  # Add this import

router = APIRouter()
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()


# --- Pydantic Models for Resume Operations ---
class ResumeUploadResponse(BaseModel):
    resume_id: str
    s3_upload_url: str
    s3_form_fields: Dict[str, str]

# --- Resume Management Endpoints ---

@router.get("/resumes", tags=["Resumes"])
async def list_my_resumes(user_id: str = Depends(get_current_user_id)):
    """
    Retrieves a list of all resumes for the currently authenticated user.
    """
    resumes = await get_resumes_for_user(user_id)
    return resumes

@router.get("/resumes/{resume_id}/parsed-json", tags=["Resumes"])
async def get_resume_parsed_json(
    resume_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get the parsed JSON for a specific resume.
    Returns the parsed_json field from the resume record.
    """
    try:
        # Get resume metadata to verify ownership and get parsed_json
        resume_data = await get_resume_metadata(user_id, resume_id)
        
        if not resume_data:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Verify the resume belongs to the user
        if resume_data.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if resume has been parsed
        parsed_json = resume_data.get("parsed_json")
        if not parsed_json:
            raise HTTPException(status_code=404, detail="Resume has not been parsed yet")
        
        # Return the parsed JSON (parse it if it's stored as string)
        if isinstance(parsed_json, str):
            import json
            return json.loads(parsed_json)
        else:
            return parsed_json
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving parsed JSON for resume {resume_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

class ResumeUploadRequest(BaseModel):
    filename: str
    content_type: str
    job_title: str = Field(..., description="Job title for this resume")

@router.post("/resumes/upload-url", response_model=ResumeUploadResponse, tags=["Resumes"])
async def get_resume_upload_url(
    request: ResumeUploadRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Generates a presigned URL for a logged-in user to upload their resume.
    """
    resume_id = str(uuid.uuid4())
    s3_key = f"users/{user_id}/resumes/{resume_id}/{request.filename}"

    try:
        # Check if user already has resumes
        existing_resumes = await get_resumes_for_user(user_id)
        is_first_resume = len(existing_resumes) == 0
        
        s3_upload_details = generate_presigned_url(s3_key, request.content_type)
        if not s3_upload_details:
            raise HTTPException(status_code=500, detail="Failed to generate S3 presigned URL.")

        # Save metadata with job_title
        await save_resume_metadata(
            user_id=user_id,
            resume_id=resume_id,
            s3_path=s3_key,
            file_name=request.filename,
            mime_type=request.content_type,
            status="pending_upload",
            is_primary=is_first_resume,  # Only first resume is primary
            job_title=request.job_title   # Add job title
        )
        
        # Only update primary_resume_id if this is the first resume
        if is_first_resume:
            await update_user_profile(user_id, updates={"primary_resume_id": resume_id})

        return ResumeUploadResponse(
            resume_id=resume_id,
            s3_upload_url=s3_upload_details['url'],
            s3_form_fields=s3_upload_details['fields']
        )
    except Exception as e:
        logger.error(f"Error generating upload URL for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
    
    
@router.get("/users/{user_id}/resume/{resume_id}/s3-link", tags=["Resumes"])
async def get_resume_s3_link(
    user_id: str,
    resume_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Retrieves the S3 location for a specific resume.
    Verifies that the user owns this resume.
    """
    try:
        # Security check: ensure the requesting user owns this resume
        if user_id != current_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        
        # Get the specific resume metadata
        resume_metadata = await get_resume_metadata(user_id, resume_id)
        
        if not resume_metadata:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        if resume_metadata.get('status') != 'uploaded':
            raise HTTPException(status_code=400, detail="Resume not fully uploaded")
        
        return {
            "s3_bucket": config.S3_BUCKET,
            "s3_path": resume_metadata['s3_path'],
            "file_name": resume_metadata['file_name'],
            "mime_type": resume_metadata['mime_type'],
            "resume_id": resume_id,
            "is_primary": resume_metadata.get('is_primary', False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting resume link for user {user_id}, resume {resume_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
    
# Add this endpoint to your FileService
@router.delete("/resumes/{resume_id}", tags=["Resumes"])
async def delete_resume(
    resume_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Delete a resume (only if not primary)
    """
    table = _get_resume_table()
    S3_BUCKET = os.getenv("S3_BUCKET")
    s3_client = boto3.client('s3', region_name='us-east-2') # Your region
    try:
        # Check if resume exists and belongs to user
        resume = table.get_item(Key={'resume_id': resume_id})
        
        if 'Item' not in resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        if resume['Item'].get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Check if it's primary
        if resume['Item'].get('is_primary', False):
            raise HTTPException(status_code=400, detail="Cannot delete primary resume")
        
        # Delete from S3
        s3_client.delete_object(
            Bucket=S3_BUCKET,
            Key=resume['Item']['s3_path']
        )
        
        # Delete from DynamoDB
        table.delete_item(Key={'resume_id': resume_id})
        
        return {"message": "Resume deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/resumes/{resume_id}/make-primary", tags=["Resumes"])
async def make_resume_primary(
    resume_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Make a resume the primary resume for the user
    """
    table = _get_resume_table()
    
    try:
        # Verify the resume exists and belongs to the user
        resume = table.get_item(Key={'resume_id': resume_id})
        
        if 'Item' not in resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        if resume['Item'].get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all user's resumes
        all_resumes = await get_resumes_for_user(user_id)
        
        # Update all resumes: set is_primary to False except for the selected one
        for r in all_resumes:
            table.update_item(
                Key={'resume_id': r['resume_id']},
                UpdateExpression="SET is_primary = :is_primary",
                ExpressionAttributeValues={
                    ':is_primary': r['resume_id'] == resume_id
                }
            )
        
        # Update user profile with new primary resume
        await update_user_profile(user_id, updates={"primary_resume_id": resume_id})
        
        return {"message": "Primary resume updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating primary resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
class ResumeUpdateRequest(BaseModel):
    name: str = Field(..., description="Resume file name")
    job_title: str = Field(..., description="Job title for this resume")

@router.put("/resumes/{resume_id}", tags=["Resumes"])
async def update_resume(
    resume_id: str,
    update_request: ResumeUpdateRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update resume metadata (name and job title)
    """
    table = _get_resume_table()
    
    try:
        # Verify the resume exists and belongs to the user
        resume = table.get_item(Key={'resume_id': resume_id})
        
        if 'Item' not in resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        if resume['Item'].get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update the resume metadata
        response = table.update_item(
            Key={'resume_id': resume_id},
            UpdateExpression="SET file_name = :name, job_title = :job_title, updated_at = :updated_at",
            ExpressionAttributeValues={
                ':name': update_request.name,
                ':job_title': update_request.job_title,
                ':updated_at': datetime.utcnow().isoformat()
            },
            ReturnValues='ALL_NEW'
        )
        
        return {
            "message": "Resume updated successfully",
            "resume": response['Attributes']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))