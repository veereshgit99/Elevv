import requests
import mimetypes # Add this import to infer MIME type

upload_url = input("Enter the S3 upload URL: ")
file_path = "./Veeresh_Koliwad_Resume.pdf" # Or your current test file path

# Infer content type based on file extension
# This is a good way to get the correct MIME type automatically
content_type, _ = mimetypes.guess_type(file_path)
if content_type is None:
    # Fallback if mimetypes can't guess (e.g., for unknown extensions)
    # Be explicit if you know the type, or default to a safe text type
    print(f"Warning: Could not infer MIME type for {file_path}. Defaulting to application/octet-stream.")
    content_type = "application/octet-stream" # Still generic, but better than none

print(f"Inferred Content-Type for {file_path}: {content_type}")

headers = {
    "Content-Type": content_type
}

with open(file_path, "rb") as f:
    response = requests.put(upload_url, data=f, headers=headers) # <-- Added headers=headers

print("Status code:", response.status_code)
print("Success!" if response.ok else "Failed.")