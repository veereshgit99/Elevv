# file-service/services/s3_utils.py

import boto3
import os
from config import S3_BUCKET

s3_client = boto3.client("s3")

def generate_presigned_url(s3_key):
    url = s3_client.generate_presigned_url(
        ClientMethod='put_object',
        Params={
            'Bucket': S3_BUCKET,
            'Key': s3_key
        },
        ExpiresIn=3600  # 1 hour
    )
    return url
