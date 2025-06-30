import boto3
import os

dynamodb = boto3.client("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-2"))

def store_summary(file_id: str, summary: str):
    dynamodb.update_item(
        TableName="Files",
        Key={ "fileId": { "S": file_id } },
        UpdateExpression="SET #sum = :s",
        ExpressionAttributeNames={ "#sum": "summary" },
        ExpressionAttributeValues={ ":s": { "S": summary } }
    )
