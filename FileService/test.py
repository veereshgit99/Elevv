# test_api.py
import requests

# Test the API directly
base_url = "https://api-files.elevv.net"

# Test root endpoint
response = requests.get(f"{base_url}/")
print(f"Root endpoint: {response.status_code} - {response.text}")

# Test OPTIONS for /users/me
response = requests.options(
    f"{base_url}/users/me",
    headers={
        "Origin": "https://elevv.net",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type"
    }
)
print(f"OPTIONS /users/me: {response.status_code}")
print(f"Headers: {dict(response.headers)}")