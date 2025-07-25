import os
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from functools import lru_cache

# Load environment variables
from dotenv import load_dotenv  
load_dotenv()

# --- Configuration ---
# You need to add COGNITO_USER_POOL_ID to your .env file
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
COGNITO_JWKS_URL = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login") # Points to your login endpoint

@lru_cache(maxsize=1)
def get_jwks():
    """
    Fetches the JSON Web Key Set (JWKS) from Cognito.
    The keys are cached to avoid repeated HTTP requests.
    """
    try:
        response = requests.get(COGNITO_JWKS_URL)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch JWKS: {e}")

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """
    Decodes and validates a Cognito JWT token and returns the user's ID.
    This is the core security dependency for your application.
    """
    jwks = get_jwks()
    
    try:
        # Get the unverified header from the token
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
        
        if rsa_key:
            # Decode and validate the token
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                # The audience must match your Cognito App Client ID
                audience=os.getenv("COGNITO_APP_CLIENT_ID"),
                # The issuer must match your Cognito User Pool URL
                issuer=f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
            )
            # The 'sub' claim in the token is the user's unique ID
            return payload.get("sub")
        
        raise HTTPException(status_code=401, detail="Could not find a matching key.")

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))