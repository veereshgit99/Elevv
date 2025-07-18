from dotenv import load_dotenv
import os

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION")
S3_BUCKET = os.getenv("S3_BUCKET")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
S3_BUCKET = os.getenv("S3_BUCKET", "awsbucket288518840771-files")
DYNAMODB_USER_TABLE_NAME = os.getenv("DYNAMODB_USER_TABLE_NAME", "Users")
DYNAMODB_RESUMES_TABLE_NAME = os.getenv("DYNAMODB_RESUMES_TABLE_NAME", "Resumes")
DYNAMODB_JOBS_TABLE_NAME = os.getenv("DYNAMODB_JOBS_TABLE_NAME", "Jobs")
DYNAMODB_ANALYSIS_TABLE_NAME = os.getenv("DYNAMODB_ANALYSIS_TABLE_NAME", "Analysis")
