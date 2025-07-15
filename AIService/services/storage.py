# AIService/services/storage.py

import boto3
import logging
import os
import json # Import json for potential serialization/deserialization if needed for complex types
from botocore.exceptions import ClientError
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# DynamoDB Table Name - get from environment variables
DYNAMODB_TABLE_NAME = os.getenv("DYNAMODB_ANALYSIS_TABLE_NAME", "Analysis") # Default for development

def _get_dynamodb_table():
    """Helper function to get the DynamoDB table instance."""
    try:
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_REGION", "us-east-2"))
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        # Optional: Test table existence (can add latency)
        table.load()
        return table
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.error(f"DynamoDB table '{DYNAMODB_TABLE_NAME}' not found. Please create it.")
            raise RuntimeError(f"DynamoDB table '{DYNAMODB_TABLE_NAME}' not found.")
        else:
            logger.error(f"Could not connect to DynamoDB: {e}", exc_info=True)
            raise
    except Exception as e:
        logger.error(f"Unexpected error getting DynamoDB table: {e}", exc_info=True)
        raise

async def store_enhanced_analysis(
    user_id: str,
    resume_id: str,
    job_description_id: str,
    analysis_data: Dict[str, Any]
) -> bool:
    """
    Stores comprehensive analysis results (from orchestrator) in DynamoDB.
    
    Args:
        user_id (str): Unique ID of the user.
        resume_id (str): Unique ID of the resume document.
        job_description_id (str): Unique ID of the job description document.
        analysis_data (Dict[str, Any]): The full, structured results from the orchestrator.
                                        This includes classifications, entities, relationship map,
                                        job match analysis, and resume optimization suggestions.
    
    Returns:
        bool: True if storage was successful, False otherwise.
    """
    table = _get_dynamodb_table()
    
    try:
        # DynamoDB supports nested dictionaries and lists directly.
        # Ensure analysis_data is a JSON-serializable Python dictionary.
        # You might want to add a unique composite key if a user can analyze same resume/JD multiple times
        # For simplicity, using resume_id and job_description_id as sort key for user_id.
        
        item = {
            'user_id': user_id,
            'analysis_id': f"{resume_id}-{job_description_id}", # Composite sort key for primary partition key
            'resume_id': resume_id,
            'job_description_id': job_description_id,
            'timestamp': int(os.time()), # Unix timestamp
            'analysis_data': analysis_data # Stores the entire complex dictionary
        }
        
        # DynamoDB has item size limits (400KB). Ensure analysis_data doesn't exceed this.
        # If it does, consider storing parts of it in S3 and linking.
        
        response = table.put_item(Item=item)
        
        if response['ResponseMetadata']['HTTPStatusCode'] == 200:
            logger.info(f"Successfully stored analysis for user {user_id}, resume {resume_id}, JD {job_description_id}")
            return True
        else:
            logger.error(f"Failed to store analysis for user {user_id}: {response}")
            return False
            
    except ClientError as e:
        logger.error(f"DynamoDB ClientError storing analysis for {user_id}: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Unexpected error storing analysis for {user_id}: {e}", exc_info=True)
        return False

async def get_enhanced_analysis(user_id: str, resume_id: str, job_description_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a specific enhanced analysis result from DynamoDB.
    
    Args:
        user_id (str): Unique ID of the user.
        resume_id (str): Unique ID of the resume document.
        job_description_id (str): Unique ID of the job description document.
        
    Returns:
        Optional[Dict[str, Any]]: The stored analysis data if found, None otherwise.
    """
    table = _get_dynamodb_table()
    
    try:
        response = table.get_item(
            Key={
                'user_id': user_id,
                'analysis_id': f"{resume_id}-{job_description_id}"
            }
        )
        
        item = response.get('Item')
        if item:
            logger.info(f"Successfully retrieved analysis for user {user_id}, resume {resume_id}, JD {job_description_id}")
            return item.get('analysis_data')
        else:
            logger.info(f"No analysis found for user {user_id}, resume {resume_id}, JD {job_description_id}")
            return None
            
    except ClientError as e:
        logger.error(f"DynamoDB ClientError retrieving analysis for {user_id}: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"Unexpected error retrieving analysis for {user_id}: {e}", exc_info=True)
        return None