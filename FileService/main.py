# FileService/main.py

from fastapi import FastAPI
# Import both routers

# --- NEW: Import CORSMiddleware ---
from fastapi.middleware.cors import CORSMiddleware

from routes.files import router as files_router
from routes.auth import router as auth_router
from routes.users import router as users_router

app = FastAPI(
    title="LexIQ File & User Service",
    description="Handles user authentication, profile management, and file uploads.",
    version="1.0"
)

# --- NEW: Add this CORS middleware block ---
# This tells the backend to allow requests from your frontend (running on port 3000)
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)
# --- End of new block ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "FileService is running"}

# Include both routers in your application
app.include_router(auth_router, prefix="/auth") # e.g., /auth/signup
app.include_router(files_router) # e.g., /users/{user_id}/...
app.include_router(users_router)