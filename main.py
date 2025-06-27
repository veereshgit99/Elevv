# file-service/main.py

from fastapi import FastAPI
from routes.files import router as files_router

app = FastAPI(
    title="File Service",
    description="Handles file upload, metadata, and AI summary processing",
    version="1.0"
)
app.include_router(files_router, prefix="/users/files")