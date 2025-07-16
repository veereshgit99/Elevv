# FileService/database/user_operations.py

import boto3
import os
import logging
from datetime import datetime
from botocore.exceptions import ClientError
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

DYNAMODB_USER_TABLE_NAME = os.getenv("DYNAMODB_USER_TABLE_NAME", "Users")

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