# file-service/database/dynamodb_client.py

import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError
from config import DYNAMODB_TABLE

# Load table name from env or default

# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb", region_name="us-east-2")  # Replace with your region
table = dynamodb.Table(DYNAMODB_TABLE)


def put_file_metadata(file_id, name, mime_type, size, s3_path, uploaded_by):
    try:
        item = {
            "fileId": file_id,
            "name": name,
            "mimeType": mime_type,
            "size": size,
            "s3Path": s3_path,
            "status": "pending_upload",
            "uploadedBy": uploaded_by,
            "createdAt": datetime.utcnow().isoformat()
        }
        table.put_item(Item=item)
        return {"success": True, "item": item}
    except ClientError as e:
        print("Error saving to DynamoDB:", e.response['Error']['Message'])
        return {"success": False, "error": e.response['Error']['Message']}


def update_file_status(file_id, new_status):
    try:
        response = table.update_item(
            Key={"fileId": file_id},
            UpdateExpression="SET #s = :s",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": new_status}
        )
        return {"success": True, "response": response}
    except ClientError as e:
        print("Error updating file status:", e.response['Error']['Message'])
        return {"success": False, "error": e.response['Error']['Message']}


def get_file_metadata(file_id):
    try:
        response = table.get_item(Key={"fileId": file_id})
        item = response.get("Item")
        if not item:
            return {"success": False, "error": "File not found"}
        return {"success": True, "item": item}
    except ClientError as e:
        print("Error reading from DynamoDB:", e.response['Error']['Message'])
        return {"success": False, "error": e.response['Error']['Message']}
