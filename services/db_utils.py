# file-service/services/db_utils.py

from database.dynamodb_client import put_file_metadata

def store_file_metadata(file_id, name, mime_type, size, s3_path, uploaded_by):
    result = put_file_metadata(file_id, name, mime_type, size, s3_path, uploaded_by)
    return result.get("success", False)
