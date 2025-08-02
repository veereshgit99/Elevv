# AIService/services/analysis_storage.py

import json
import gzip
import uuid
import boto3
import logging
from datetime import datetime
from typing import Dict, Any
import os

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

s3_client = boto3.client('s3', region_name=os.getenv("AWS_REGION", "us-east-2"))
S3_BUCKET = os.getenv("S3_BUCKET", "awsbucket288518840771-files")

async def store_analysis_complete(
    user_id: str,
    analysis_data: Dict[str, Any],
    auth_token: str
) -> Dict[str, Any]:
    """
    Store complete analysis results - summary in DynamoDB, full data in S3
    """
    try:
        # Generate analysis ID
        analysis_id = str(uuid.uuid4())
        
        # 1. Store full data in S3 (compressed)
        s3_key = f"users/{user_id}/analysis/{analysis_id}/full.json.gz"
        
        # Compress the data
        json_str = json.dumps(analysis_data)
        compressed_data = gzip.compress(json_str.encode('utf-8'))
        
        # Upload to S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=compressed_data,
            ContentType='application/json',
            ContentEncoding='gzip',
            Metadata={
                'user_id': user_id,
                'analysis_id': analysis_id,
                'created_at': datetime.utcnow().isoformat()
            }
        )
        
        # 2. Create summary for DynamoDB
        summary = {
            "user_id": user_id,
            "analysis_id": analysis_id,
            "created_at": datetime.utcnow().isoformat(),
            "job_title": analysis_data.get("job_title", "Unknown"),
            "company_name": analysis_data.get("company_name", "Unknown"),
            "match_percentage": analysis_data.get("overall_match_percentage", 0),
            "resume_id": analysis_data.get("resume_id", ""),
            "status": "completed",
            "full_analysis_s3_path": s3_key
        }

        # 3. Store summary in DynamoDB via FileService API
        # Call this FileService API '@router.post("/analyses", tags=["Analysis"])' 
        import httpx

        async with httpx.AsyncClient() as client:
            # You'll need the auth token passed from the main endpoint
            headers = {
                "Authorization": f"Bearer {auth_token}"  # Pass this from main.py
            }

            response = await client.post(
                "http://localhost:8001/analyses",
                headers=headers,
                json=summary
            )

            if response.status_code != 200:
                logger.error(f"Failed to store analysis summary in DynamoDB: {response.text}")
                raise Exception("Failed to store analysis summary")

            return summary

    except Exception as e:
        logger.error(f"Error storing analysis: {e}")
        raise

async def retrieve_full_analysis(user_id: str, analysis_id: str) -> Dict[str, Any]:
    """
    Retrieve full analysis data from S3
    """
    try:
        s3_key = f"users/{user_id}/analysis/{analysis_id}/full.json.gz"
        
        # Get object from S3
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        
        # Decompress and parse
        compressed_data = response['Body'].read()
        json_str = gzip.decompress(compressed_data).decode('utf-8')
        
        return json.loads(json_str)
        
    except Exception as e:
        logger.error(f"Error retrieving analysis from S3: {e}")
        raise

def generate_presigned_url_for_analysis(user_id: str, analysis_id: str, expiration: int = 3600) -> str:
    """
    Generate a presigned URL for downloading analysis data
    """
    s3_key = f"users/{user_id}/analysis/{analysis_id}/full.json.gz"
    
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        raise
    
async def update_analysis_with_enhancement(
    user_id: str,
    analysis_id: str,
    match_after_enhancement: int,
    auth_token: str
) -> Dict[str, Any]:
    """
    Update analysis record with the enhanced match score
    """
    try:
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as client:  # Add timeout
            headers = {
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"  # Explicit content type
            }

            # Validate input
            if not isinstance(match_after_enhancement, int) or not (0 <= match_after_enhancement <= 100):
                raise ValueError("match_after_enhancement must be an integer between 0 and 100")

            # Update the analysis record in DynamoDB
            update_data = {
                "match_after_enhancement": match_after_enhancement,
                "enhancement_generated_at": datetime.utcnow().isoformat(),
                "enhancement_status": "completed"  # Track enhancement status
            }

            logger.info(f"Updating analysis {analysis_id} with enhancement score: {match_after_enhancement}%")

            response = await client.patch(
                f"http://localhost:8001/analyses/{analysis_id}",
                headers=headers,
                json=update_data
            )

            # More detailed error handling
            if response.status_code == 404:
                logger.error(f"Analysis {analysis_id} not found for user {user_id}")
                raise Exception(f"Analysis {analysis_id} not found")
            elif response.status_code == 403:
                logger.error(f"Access denied for analysis {analysis_id}")
                raise Exception("Access denied to update analysis")
            elif response.status_code != 200:
                logger.error(f"Failed to update analysis with enhancement score: {response.status_code} - {response.text}")
                raise Exception(f"Failed to update analysis (HTTP {response.status_code})")

            result = response.json()
            logger.info(f"Successfully updated analysis {analysis_id} with enhancement data")
            
            return result

    except httpx.TimeoutException:
        logger.error(f"Timeout updating analysis {analysis_id}")
        raise Exception("Request timeout while updating analysis")
    except httpx.RequestError as e:
        logger.error(f"Network error updating analysis {analysis_id}: {e}")
        raise Exception("Network error while updating analysis")
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise
    except Exception as e:
        logger.error(f"Error updating analysis with enhancement: {e}")
        raise