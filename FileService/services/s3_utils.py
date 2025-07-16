# file-service/services/s3_utils.py

import boto3
from config import S3_BUCKET
from botocore.exceptions import ClientError
import logging

s3_client = boto3.client("s3")

def generate_presigned_url(s3_key: str):
    """
    Generates a presigned URL and form fields for a client to upload a file to S3.
    """
    try:
        response = s3_client.generate_presigned_post(
            Bucket=S3_BUCKET,
            Key=s3_key,
            ExpiresIn=3600  # URL expires in 1 hour
        )
        # FIX: Return the entire response dictionary
        return response
    except ClientError as e:
        logging.error(f"Failed to generate presigned URL: {e}")
        return None
