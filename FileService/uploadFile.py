import requests

upload_url = input()  # replace with your URL
file_path = "./QuikPAY(R).pdf"

with open(file_path, "rb") as f:
    response = requests.put(upload_url, data=f)

print("Status code:", response.status_code)
print("Success!" if response.ok else "Failed.")
