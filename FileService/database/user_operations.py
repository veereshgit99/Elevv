# FileService/database/user_operations.py

import boto3
import os
import logging
from datetime import datetime
from botocore.exceptions import ClientError
from typing import Dict, Any, Optional

import config
from database.resume_operations import get_resumes_for_user, _get_resume_table
from database.analysis_operations import get_user_analyses, _get_analysis_table

logger = logging.getLogger(__name__)

DYNAMODB_USER_TABLE_NAME = os.getenv("DYNAMODB_USER_TABLE_NAME", "Users")

# --- NEW: Initialize clients needed for deletion ---
cognito_client = boto3.client('cognito-idp', region_name=config.AWS_REGION)
s3_client = boto3.client('s3', region_name=config.AWS_REGION)

def _get_user_table():
    """Helper function to get the DynamoDB User table instance."""
    try:
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_REGION", "us-east-2"))
        table = dynamodb.Table(DYNAMODB_USER_TABLE_NAME)
        table.load() # Check if table exists
        return table
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.error(f"DynamoDB table '{DYNAMODB_USER_TABLE_NAME}' not found. Please create it.")
            raise RuntimeError(f"DynamoDB table '{DYNAMODB_USER_TABLE_NAME}' not found.")
        else:
            logger.error(f"Could not connect to DynamoDB: {e}", exc_info=True)
            raise
    except Exception as e:
        logger.error(f"Unexpected error getting DynamoDB user table: {e}", exc_info=True)
        raise

async def create_user_profile(
    user_id: str, 
    name: str, 
    email: str, 
    profile_summary: Optional[str] = None,
    primary_resume_id: Optional[str] = None # Link to user's primary resume
) -> bool:
    """
    Creates a new user profile in the Users table.
    """
    table = _get_user_table()
    try:
        item = {
            'user_id': user_id,
            'name': name,
            'email': email,
            'profile_summary': profile_summary if profile_summary else '',
            'primary_resume_id': primary_resume_id if primary_resume_id else 'None',
            'created_at': datetime.utcnow().isoformat(),
            'last_login': datetime.utcnow().isoformat()
        }
        table.put_item(Item=item)
        logger.info(f"User profile created: {user_id}")
        return True
    except ClientError as e:
        logger.error(f"Error creating user profile {user_id}: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Unexpected error creating user profile {user_id}: {e}", exc_info=True)
        return False

async def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a user profile from the Users table.
    """
    table = _get_user_table()
    try:
        response = table.get_item(Key={'user_id': user_id})
        item = response.get('Item')
        if item:
            logger.info(f"User profile retrieved: {user_id}")
            return item
        logger.info(f"User profile not found: {user_id}")
        return None
    except ClientError as e:
        logger.error(f"Error retrieving user profile {user_id}: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"Unexpected error retrieving user profile {user_id}: {e}", exc_info=True)
        return None

async def update_user_profile(
    user_id: str, 
    updates: Dict[str, Any]
) -> bool:
    """
    Updates specific attributes of an existing user profile.
    Updates dictionary should contain attribute names as keys and new values.
    """
    table = _get_user_table()
    try:
        update_expression_parts = []
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        for key, value in updates.items():
            if key == 'user_id':
                continue
            
            attr_name_placeholder = f"#{key}"
            attr_value_placeholder = f":{key}"
            
            update_expression_parts.append(f"{attr_name_placeholder} = {attr_value_placeholder}")
            expression_attribute_values[attr_value_placeholder] = value
            expression_attribute_names[attr_name_placeholder] = key

        attr_name_placeholder = "#last_login"
        attr_value_placeholder = ":last_login"
        update_expression_parts.append(f"{attr_name_placeholder} = {attr_value_placeholder}")
        expression_attribute_values[attr_value_placeholder] = datetime.utcnow().isoformat()
        expression_attribute_names[attr_name_placeholder] = "last_login"

        update_expression = "SET " + ", ".join(update_expression_parts)
        
        response = table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="UPDATED_NEW"
        )
        logger.info(f"User profile updated: {user_id}")
        return True
    except ClientError as e:
        logger.error(f"Error updating user profile {user_id}: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Unexpected error updating user profile {user_id}: {e}", exc_info=True)
        return False
    
    
# --- NEW: The complete delete_user_account function ---
async def delete_user_account(user_id: str):
    """
    Deletes a user and all their data from Cognito, DynamoDB (Users, Resumes, Analyses), and S3.
    """
    logger.info(f"Initiating account deletion for user_id: {user_id}")
    
    user_profile = await get_user_profile(user_id)
    if not user_profile:
        logger.warning(f"User profile {user_id} not found for deletion. Proceeding to clean up any remaining data.")
    
    # 1. Delete user from Cognito
    if user_profile and 'email' in user_profile:
        try:
            cognito_client.admin_delete_user(
                UserPoolId=config.COGNITO_USER_POOL_ID,
                Username=user_profile['email']
            )
            logger.info(f"Successfully deleted user from Cognito: {user_profile['email']}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'UserNotFoundException':
                logger.warning(f"User {user_profile['email']} not found in Cognito. Already deleted.")
            else:
                logger.error(f"Could not delete user {user_id} from Cognito: {e}")
                # We continue the process to delete other data even if Cognito fails

    # 2. Get all associated resumes and analyses
    user_resumes = await get_resumes_for_user(user_id)
    user_analyses = await get_user_analyses(user_id, limit=1000) # Get all analyses

    # --- THIS IS THE NEW, CORRECTED S3 DELETION LOGIC ---
    # 3. Delete the entire user folder from S3
    try:
        user_prefix = f"users/{user_id}/"
        s3_bucket = config.S3_BUCKET
        
        # List all objects under the user's prefix
        objects_to_delete = []
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=s3_bucket, Prefix=user_prefix)
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    objects_to_delete.append({'Key': obj['Key']})
        
        # If objects were found, delete them in a batch operation
        if objects_to_delete:
            s3_client.delete_objects(
                Bucket=s3_bucket,
                Delete={'Objects': objects_to_delete}
            )
            logger.info(f"Deleted {len(objects_to_delete)} files from S3 prefix '{user_prefix}'")
        else:
            logger.info(f"No files found in S3 for user {user_id}. Nothing to delete.")

    except ClientError as e:
        logger.error(f"Could not delete S3 files for user {user_id}: {e}")
    # --- END OF NEW S3 LOGIC ---

    # 4. Batch delete all DynamoDB records
    users_table = _get_user_table()
    resumes_table = _get_resume_table()
    analyses_table = _get_analysis_table()
    
    try:
        # Delete from Users table
        users_table.delete_item(Key={'user_id': user_id})

        # Batch delete from Resumes table
        if user_resumes:
            with resumes_table.batch_writer() as batch:
                for resume in user_resumes:
                    batch.delete_item(Key={'resume_id': resume['resume_id']})
        
        # Batch delete from Analyses table
        if user_analyses:
            with analyses_table.batch_writer() as batch:
                for analysis in user_analyses:
                    batch.delete_item(Key={'analysis_id': analysis['analysis_id']})
        
        logger.info(f"All DynamoDB records for user {user_id} have been deleted.")
    except ClientError as e:
        logger.error(f"Could not delete DynamoDB records for user {user_id}: {e}")
        
    logger.info(f"Account deletion process completed for user_id: {user_id}")
