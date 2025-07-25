# FileService/routes/auth.py

import os
import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import boto3
from botocore.exceptions import ClientError

# Client Secret
import hmac
import hashlib
import base64

# Import your config and DB operations
import config
from database.user_operations import create_user_profile



router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize the Cognito client
cognito_client = boto3.client('cognito-idp', region_name=config.AWS_REGION)

def get_secret_hash(username: str) -> str:
    """Calculates the SecretHash for a given user."""
    msg = username + config.COGNITO_APP_CLIENT_ID
    dig = hmac.new(
        str(config.COGNITO_APP_CLIENT_SECRET).encode('UTF-8'),
        msg=msg.encode('UTF-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

# --- Pydantic Models for User Authentication ---
class ConfirmSignupRequest(BaseModel):
    email: str
    confirmation_code: str
    
# --- Pydantic Models for Auth ---
class UserSignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class UserLoginRequest(BaseModel):
    email: str
    password: str

# --- User Authentication Endpoints ---

@router.post("/signup", tags=["Authentication"])
async def signup_user(request: UserSignupRequest):
    """
    Handles user signup. First creates the user in Cognito,
    then creates a corresponding profile in DynamoDB.
    """
    try:
        response = cognito_client.sign_up(
            ClientId=config.COGNITO_APP_CLIENT_ID,
            SecretHash=get_secret_hash(request.email),
            Username=request.email,
            Password=request.password,
            UserAttributes=[
                {'Name': 'given_name', 'Value': request.first_name},
                {'Name': 'family_name', 'Value': request.last_name},
                {'Name': 'email', 'Value': request.email}
            ]
        )
        cognito_user_id = response['UserSub']
        
        full_name = f"{request.first_name} {request.last_name}"
        await create_user_profile(
            user_id=cognito_user_id,
            name=full_name,
            email=request.email
        )
        return {"message": "User signed up successfully. Please check email for confirmation.", "user_id": cognito_user_id}
        
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response['Error']['Message'])

@router.post("/login", tags=["Authentication"])
async def login_user(request: UserLoginRequest):
    """
    Handles user login. Authenticates against Cognito and returns JWT tokens.
    """
    try:
        response = cognito_client.initiate_auth(
            ClientId=config.COGNITO_APP_CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': request.email,
                'PASSWORD': request.password,
                'SECRET_HASH': get_secret_hash(request.email),
            }
        )
        return response['AuthenticationResult']
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response['Error']['Message'])
    
# --- NEW: Endpoint to handle email confirmation ---
@router.post("/confirm-signup", tags=["Authentication"])
async def confirm_signup(request: ConfirmSignupRequest):
    """
    Confirms a new user's account with the code sent to their email.
    """
    try:
        cognito_client.confirm_sign_up(
            ClientId=config.COGNITO_APP_CLIENT_ID,
            SecretHash=get_secret_hash(request.email), # Required if you have a client secret
            Username=request.email,
            ConfirmationCode=request.confirmation_code
        )
        return {"message": "User account confirmed successfully. You can now log in."}
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response['Error']['Message'])