### ai-service/main.py
from fastapi import FastAPI
from routes import process

app = FastAPI()

app.include_router(process.router, prefix="/process", tags=["Process"])


### ai-service/routes/process.py
from fastapi import APIRouter, HTTPException
from models.request_schema import FileProcessRequest
from services.summarizer import generate_summary
from services.emailer import send_summary_email
from services.storage import store_summary
from services.utils import download_file_from_url

router = APIRouter()

@router.post("/")
async def process_file(req: FileProcessRequest):
    try:
        content = download_file_from_url(req.preSignedUrl)
        summary = generate_summary(content)
        
        # Save to DynamoDB (or optionally S3 later)
        store_summary(file_id=req.fileId, summary=summary)

        # Email to user (if email present)
        if req.userEmail:
            send_summary_email(to_email="veereshkoliwad99@gmail.com", summary=summary, file_id=req.fileId)

        return {"status": "success", "summary": summary}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))