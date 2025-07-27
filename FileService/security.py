# FileService/security.py

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv() # Ensure environment variables are loaded

# We now use the same secret as our next-auth backend
NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET")
if not NEXTAUTH_SECRET:
    raise RuntimeError("NEXTAUTH_SECRET is not set in the environment variables.")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """
    Decodes and validates a JWT token issued by our own next-auth backend.
    """
    try:
        # Decode the token using the shared secret and HS256 algorithm
        payload = jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=["HS256"]
        )
        
        # The user's Cognito ID is in the 'sub' claim of the next-auth token
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: User ID not found.")
        
        return user_id

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )