# AIService/main.py

from fastapi import FastAPI, HTTPException
from mangum import Mangum
from typing import Dict, Any
import json
import logging
import asyncio

# Set up logging for better visibility in CloudWatch
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from models.request_schema import FileProcessRequest # Assuming this is the correct import path

# Import your core service functions directly
from services.summarizer import generate_summary
from services.emailer import send_summary_email
from services.storage import store_summary
from services.utils import download_file_from_url

# Initialize your FastAPI app
app = FastAPI()

# --- Core Processing Logic Function ---
# This function encapsulates the main steps for processing a file.
# It can be called by both the FastAPI endpoint and the Lambda SQS handler.
async def _process_file_core(file_id: str, pre_signed_url: str, user_email: str = None):
    try:
        logger.info(f"Starting core processing for fileId: {file_id}")
        content = download_file_from_url(pre_signed_url)
        logger.info(f"Content downloaded for fileId: {file_id}")

        summary = generate_summary(content)
        logger.info(f"Summary generated for fileId: {file_id}")

        # Save to DynamoDB
        store_summary(file_id=file_id, summary=summary)
        logger.info(f"Summary stored for fileId: {file_id}")

        # Email to user
        # In a real app, you'd fetch userEmail from your DB based on file_id
        # For now, using the hardcoded one or the provided userEmail from request
        target_email = user_email if user_email else "veereshkoliwad99@gmail.com" # Default or fetch from DB
        send_summary_email(to_email=target_email, summary=summary, file_id=file_id)
        logger.info(f"Summary email sent for fileId: {file_id} to {target_email}")

        return {"status": "success", "summary": summary}

    except Exception as e:
        logger.error(f"Core processing failed for fileId {file_id}: {e}", exc_info=True)
        raise # Re-raise to ensure error is propagated for SQS or HTTP

# --- Modify your FastAPI endpoint to use the core logic ---
# Your existing route will now call the new core function
@app.post("/process-summary") # Changed to /process-summary as per previous discussion for clarity
async def process_file_endpoint(req: FileProcessRequest):
    try:
        # Assuming req.userEmail is part of your FileProcessRequest if you want to pass it
        result = await _process_file_core(req.fileId, req.preSignedUrl, req.userEmail)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AWS Lambda Handler ---
# This is the entry point for AWS Lambda.
# It will differentiate between SQS events and API Gateway events.
def lambda_handler(event: Dict[str, Any], context: Any):
    logger.info(f"Received event: {json.dumps(event)}")

    # Check if the event comes from SQS
    if 'Records' in event and isinstance(event['Records'], list) and event['Records'] and 'eventSource' in event['Records'][0] and event['Records'][0]['eventSource'] == 'aws:sqs':
        logger.info("Processing SQS event...")
        for record in event['Records']:
            try:
                message_body = json.loads(record['body'])
                file_id = message_body.get('fileId')
                pre_signed_url = message_body.get('preSignedUrl')
                user_email = message_body.get('userEmail') # If you include user email in SQS message

                if file_id and pre_signed_url:
                    # Call the core processing logic asynchronously (if not already async)
                    # For Lambda, direct calls are synchronous unless you explicitly use async libraries.
                    # Since generate_summary and download_file_from_url are synchronous, no 'await' needed directly here.
                    # If _process_file_core was truly async (e.g., awaited external APIs), you'd need loop.run_until_complete()
                    # For simplicity, we make _process_file_core async as FastAPI expects, but call directly in handler.
                    # A more robust way for async in handler: import asyncio; asyncio.run(_process_file_core(...))
                    _ = app.dependency_overrides.clear() # Clear any FastAPI dependency overrides before direct call
                    asyncio.run(_process_file_core(file_id, pre_signed_url, user_email)) # Call async core function
                    logger.info(f"SQS message processed successfully for fileId: {file_id}")
                else:
                    logger.warning(f"Invalid SQS message format received: {message_body}")
            except Exception as e:
                logger.error(f"Error processing SQS record: {e}", exc_info=True)
                # Re-raise the exception to signal Lambda that this batch failed.
                # SQS will handle retries and potentially send to DLQ based on source configuration.
                raise e
        return {"statusCode": 200} # SQS event source mapping expects a 200 for successful processing

    # If not an SQS event, assume it's an API Gateway (HTTP) event
    else:
        logger.info("Processing API Gateway event...")
        # Use Mangum to handle the API Gateway event for FastAPI
        asgi_handler = Mangum(app)
        return asgi_handler(event, context)