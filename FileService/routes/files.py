from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
from services.s3_utils import generate_presigned_url
from services.db_utils import store_file_metadata
from database.dynamodb_client import update_file_status
from pydantic import BaseModel

router = APIRouter()

@router.post("/upload")
async def upload_and_prepare(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    s3_key = file_id

    # Generate URL
    upload_url = generate_presigned_url(s3_key)

    # Store metadata in DynamoDB
    success = store_file_metadata(
        file_id=file_id,
        name=file.filename,
        mime_type=file.content_type,
        size=None,  # optional: await file.read() and len()
        s3_path=s3_key,
        uploaded_by="anonymous"
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to store metadata")

    return {
        "fileId": file_id,
        "uploadUrl": upload_url
    }

class UploadCompleteRequest(BaseModel):
    fileId: str

@router.post("/internal/uploadComplete")
def upload_complete(req: UploadCompleteRequest):
    success = update_file_status(req.fileId, "uploaded")

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update file status")

    return {
        "message": "File status updated to uploaded",
        "fileId": req.fileId
    }