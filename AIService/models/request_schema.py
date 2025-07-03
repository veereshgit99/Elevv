from pydantic import BaseModel
from typing import Optional

class FileProcessRequest(BaseModel):
    fileId: str
    preSignedUrl: str
    # Add mimeType and size as they are available in the SQS message
    mimeType: Optional[str] = None
    size: Optional[str] = None  # Assuming size is a string
    userEmail: Optional[str] = None