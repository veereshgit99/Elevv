# In FileService/routes/users.py

from fastapi import APIRouter, Depends, HTTPException
from security import get_current_user_id
from database.user_operations import get_user_profile

router = APIRouter()

@router.get("/users/me", tags=["Users"])
async def get_my_profile(user_id: str = Depends(get_current_user_id)):
    """
    Retrieves the profile for the currently authenticated user.
    """
    user_profile = await get_user_profile(user_id)
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found.")
    return user_profile