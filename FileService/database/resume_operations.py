# FileService/database/resume_operations.py

import boto3
import os
import logging
from datetime import datetime
from botocore.exceptions import ClientError
from typing import Dict, Any, Optional

from boto3.dynamodb.conditions import Key

logger = logging.getLogger(__name__)

DYNAMODB_RESUME_TABLE_NAME = os.getenv("DYNAMODB_RESUME_TABLE_NAME", "Resumes")

def _get_resume_table():
    """Helper function to get the DynamoDB Resume table instance."""
    try:
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_REGION", "us-east-2"))
        table = dynamodb.Table(DYNAMODB_RESUME_TABLE_NAME)
        table.load()
        return table
    except ClientError as e:
        logger.error(f"Could not connect to DynamoDB: {e}", exc_info=True)
        raise

async def save_resume_metadata(
    user_id: str,
    resume_id: str,
    s3_path: str,
    file_name: str,
    mime_type: str,
    status: str = "pending_upload",
    is_primary: bool = False
) -> bool:
    """
    Saves or updates resume metadata in the Resumes table.
    """
    table = _get_resume_table()
    try:
        # This is correct. put_item includes all attributes.
        item = {
            'resume_id': resume_id,
            'user_id': user_id,
            's3_path': s3_path,
            'file_name': file_name,
            'mime_type': mime_type,
            'upload_timestamp': datetime.utcnow().isoformat(),
            'status': status,
            'is_primary': is_primary
        }
        table.put_item(Item=item)
        logger.info(f"Resume metadata saved: {resume_id} for user {user_id}")
        return True
    except ClientError as e:
        logger.error(f"Error saving resume metadata {resume_id}: {e}", exc_info=True)
        return False

async def get_resume_metadata(user_id: str, resume_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves resume metadata from the Resumes table using its primary key.
    """
    table = _get_resume_table()
    try:
        # --- CORRECTED LINE ---
        # The Key must only contain the primary key of the table.
        response = table.get_item(Key={'resume_id': resume_id})
        item = response.get('Item')
        if item:
            logger.info(f"Resume metadata retrieved: {resume_id}")
            return item
        logger.info(f"Resume metadata not found: {resume_id}")
        return None
    except ClientError as e:
        logger.error(f"Error retrieving resume metadata {resume_id} for user {user_id}: {e}", exc_info=True)
        return None

async def set_primary_resume(user_id: str, resume_id: str) -> bool:
    """
    Sets a specific resume as the primary one for a user.
    """
    table = _get_resume_table()
    try:
        # --- CORRECTED LINE ---
        # The Key for update_item must also match the table's primary key.
        response = table.update_item(
            Key={'resume_id': resume_id},
            UpdateExpression="SET #is_primary = :true_val",
            ExpressionAttributeNames={"#is_primary": "is_primary"},
            ExpressionAttributeValues={":true_val": True},
            ReturnValues="UPDATED_NEW"
        )
        if response['ResponseMetadata']['HTTPStatusCode'] == 200:
            logger.info(f"Resume {resume_id} set as primary for user {user_id}")
            return True
        return False
    except ClientError as e:
        logger.error(f"Error setting primary resume {resume_id} for user {user_id}: {e}", exc_info=True)
        return False


async def get_primary_resume_metadata(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the primary resume metadata for a given user.
    Requires a GSI on 'user_id' with 'is_primary' as a filter/sort key,
    or scanning all user's resumes and filtering, which is inefficient.
    Assuming a GSI on user_id, which can be filtered by is_primary=True.
    """
    table = _get_resume_table()
    try:
        # Query GSI by user_id and filter for is_primary=True
        response = table.query(
            IndexName='user_id-is_primary-index', # You'll need to create this GSI
            KeyConditionExpression=boto3.dynamodb.conditions.Key('user_id').eq(user_id),
            FilterExpression=boto3.dynamodb.conditions.Attr('is_primary').eq(True)
        )
        items = response.get('Items', [])
        if items:
            # A user should ideally have only one primary resume
            logger.info(f"Primary resume retrieved for user {user_id}")
            return items[0]
        logger.info(f"No primary resume found for user {user_id}")
        return None
    except ClientError as e:
        logger.error(f"Error retrieving primary resume for user {user_id}: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"Unexpected error retrieving primary resume for user {user_id}: {e}", exc_info=True)
        return None

async def get_resumes_for_user(user_id: str) -> list[Dict[str, Any]]:
    """
    Retrieves all resume metadata for a given user by querying the GSI.
    Requires a GSI on the 'user_id' attribute.
    """
    table = _get_resume_table()
    try:
        # A GSI is needed to efficiently query by user_id
        # We assume the GSI is named 'user_id-index'
        response = table.query(
            IndexName='user_id-index',
            KeyConditionExpression=Key('user_id').eq(user_id)
        )
        items = response.get('Items', [])
        logger.info(f"Found {len(items)} resumes for user {user_id}")
        return items
    except ClientError as e:
        # This error often means the GSI doesn't exist.
        if e.response['Error']['Code'] == 'ValidationException':
             logger.error(f"Error querying resumes for user {user_id}: The required GSI 'user_id-index' may be missing.", exc_info=True)
             raise RuntimeError("A database index required for this operation is missing.")
        logger.error(f"Error retrieving resumes for user {user_id}: {e}", exc_info=True)
        return []
    except Exception as e:
        logger.error(f"Unexpected error retrieving resumes for user {user_id}: {e}", exc_info=True)
        return []