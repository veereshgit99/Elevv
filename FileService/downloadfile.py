import boto3

s3_client = boto3.client('s3', region_name='us-east-2') # Your region
bucket_name = 'awsbucket288518840771-files'
file_key = 'fce8a59f-fcb1-4f54-8222-da2f62baf530' # This is your fileId

try:
    presigned_url = s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket_name, 'Key': file_key},
        ExpiresIn=3600 # URL valid for 1 hour
    )
    print(presigned_url)
except Exception as e:
    print(f"Error generating presigned URL: {e}")