# file-service/services/s3_utils.py

import boto3
from config import S3_BUCKET
from botocore.exceptions import ClientError
import logging
import config

s3_client = boto3.client("s3")

def generate_presigned_url(s3_key: str) -> dict:
    """
    Generate a presigned POST URL for S3 upload
    """
    s3_client = boto3.client('s3', region_name=config.AWS_REGION)
    
    try:
        # Generate the presigned POST data without Content-Type restrictions
        response = s3_client.generate_presigned_post(
            Bucket=config.S3_BUCKET,
            Key=s3_key,
            Conditions=[
                ["content-length-range", 0, 10485760],  # 0-10MB
            ],
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        logging.info(f"Generated presigned URL for key: {s3_key}")
        return response
        
    except ClientError as e:
        logging.error(f"Error generating presigned URL: {e}")
        return None
