# main.py
from fastapi import FastAPI, Response, Request
from fastapi.middleware.cors import CORSMiddleware
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Elevv File & User Service",
    description="Handles user authentication, profile management, and file uploads.",
    version="1.0"
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Received {request.method} request to {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", 
                   "https://elevv.net", 
                   "chrome-extension://cfbjpbpglpenbmlndohaldffnjfncjfm"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Catch-all OPTIONS handler (fallback)
@app.api_route("/{full_path:path}", methods=["OPTIONS"])
async def options_handler(full_path: str):
    return Response(
        content=None,
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
        }
    )

@app.get("/")
def read_root():
    return {"status": "ok", "message": "FileService is running"}

# Include routers
from routes.auth import router as auth_router
from routes.files import router as files_router
from routes.users import router as users_router
from routes.analysis import router as analysis_router

app.include_router(auth_router, prefix="/auth")
app.include_router(files_router)
app.include_router(users_router)
app.include_router(analysis_router)

# Debug: Print all routes on startup
if __name__ == "__main__":
    import uvicorn
    print("=== Registered Routes ===")
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            print(f"{route.methods} -> {route.path}")
    print("========================")
    uvicorn.run(app, host="0.0.0.0", port=8000)