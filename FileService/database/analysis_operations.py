# FileService/database/analysis_operations.py

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import boto3
from botocore.exceptions import ClientError
import config

logger = logging.getLogger(__name__)
dynamodb = boto3.resource('dynamodb', region_name=config.AWS_REGION)
table = dynamodb.Table('Analysis')

async def save_analysis_summary(
    user_id: str,
    analysis_id: str,
    job_title: str,
    company_name: str,
    match_percentage: int,
    resume_id: str,
    full_analysis_s3_path: str
) -> Dict[str, Any]:
    """
    Save analysis summary to DynamoDB
    """
    try:
        item = {
            'PK': f"USER#{user_id}",
            'SK': f"ANALYSIS#{analysis_id}",
            'user_id': user_id,
            'analysis_id': analysis_id,
            'created_at': datetime.utcnow().isoformat(),
            'job_title': job_title,
            'company_name': company_name,
            'match_percentage': match_percentage,
            'resume_id': resume_id,
            'status': 'completed',
            'full_analysis_s3_path': full_analysis_s3_path,
            'entity_type': 'ANALYSIS'
        }
            
        table.put_item(Item=item)
        logger.info(f"Saved analysis summary for user {user_id}, analysis {analysis_id}")
        return item
        
    except ClientError as e:
        logger.error(f"Error saving analysis summary: {e}")
        raise

async def get_user_analyses(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Get all analyses for a user using GSI, sorted by creation date
    """
    try:
        # Query using the GSI 'user_id-created_at-index'
        response = table.query(
            IndexName='user_id-created_at-index',  # Your GSI name
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            },
            ScanIndexForward=False,  # Sort descending (newest first)
            Limit=limit
        )
        
        return response.get('Items', [])
        
    except ClientError as e:
        logger.error(f"Error fetching user analyses: {e}")
        raise

async def get_analysis_by_id(user_id: str, analysis_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific analysis by ID
    """
    try:
        response = table.get_item(
            Key={
                'PK': f"USER#{user_id}",
                'SK': f"ANALYSIS#{analysis_id}"
            }
        )
        
        return response.get('Item')
        
    except ClientError as e:
        logger.error(f"Error fetching analysis: {e}")
        raise