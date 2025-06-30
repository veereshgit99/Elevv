### ai-service/models/request_schema.py
from pydantic import BaseModel
from typing import Optional

class FileProcessRequest(BaseModel):
    fileId: str
    preSignedUrl: str
    userEmail: Optional[str] = None