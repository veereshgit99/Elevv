# file-service/services/s3_utils.py

import boto3
from config import S3_BUCKET
from botocore.exceptions import ClientError
import logging
import config

s3_client = boto3.client("s3")

# file-service/services/s3_utils.py
import boto3
from botocore.exceptions import ClientError
import logging
import config

def generate_presigned_url(s3_key: str, content_type: str | None = None) -> dict | None:
    s3_client = boto3.client('s3', region_name=config.AWS_REGION)
    try:
        conditions = [
            ["content-length-range", 0, 10 * 1024 * 1024],  # 0–10MB
            {"success_action_status": "201"},               # ✅ allow this field
        ]
        fields = {
            "success_action_status": "201",                 # ✅ return it in the form
        }

        if content_type:
            conditions.append({"Content-Type": content_type})
            fields["Content-Type"] = content_type

        return s3_client.generate_presigned_post(
            Bucket=config.S3_BUCKET,
            Key=s3_key,
            Fields=fields,
            Conditions=conditions,
            ExpiresIn=3600,
        )
    except ClientError as e:
        logging.error(f"Error generating presigned URL: {e}")
        return None


