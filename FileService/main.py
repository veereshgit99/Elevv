# FileService/main.py

from fastapi import FastAPI
# Import both routers
from routes.files import router as files_router
from routes.auth import router as auth_router

app = FastAPI(
    title="LexIQ File & User Service",
    description="Handles user authentication, profile management, and file uploads.",
    version="1.0"
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "FileService is running"}

# Include both routers in your application
app.include_router(auth_router, prefix="/auth") # e.g., /auth/signup
app.include_router(files_router) # e.g., /users/{user_id}/...