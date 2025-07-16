# FileService/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import files # Import the router from files.py
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Profile and File Service", # Renamed title to reflect new role
    description="Manages user profiles, resume uploads, and document metadata."
)

origins = [
    "http://localhost",
    "http://localhost:3000", # Example for your frontend
    "chrome-extension://<YOUR_CHROME_EXTENSION_ID>" # Replace with your actual Chrome Extension ID
    # Add your actual frontend and extension origins here in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router from files.py
app.include_router(files.router, tags=["Profile & Files"])


@app.get("/health")
async def health_check():
    logger.info("Health check endpoint hit.")
    return {"status": "ok", "message": "Profile and File Service is running"}