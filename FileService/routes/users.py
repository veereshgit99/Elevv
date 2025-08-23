# In FileService/routes/users.py

from fastapi import APIRouter, Depends, HTTPException
from security import get_current_user_id
from database.user_operations import get_user_profile
import logging
from database.user_operations import _get_user_table, delete_user_account

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

@router.put("/users/profile", tags=["Users"])
async def update_user_profile(
    profile_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update user profile information
    """
    table = _get_user_table()
    
    try:
        # Combine first and last name
        full_name = f"{profile_data.get('firstName', '')} {profile_data.get('lastName', '')}".strip()
        
        # Update in DynamoDB
        update_expression = "SET #name = :name"
        expression_attribute_values = {":name": full_name}
        expression_attribute_names = {"#name": "name"}
        
        # Add optional fields if provided
        if profile_data.get('phone'):
            update_expression += ", phone = :phone"
            expression_attribute_values[":phone"] = profile_data['phone']
            
        if profile_data.get('location'):
            update_expression += ", #location = :location"
            expression_attribute_values[":location"] = profile_data['location']
            expression_attribute_names["#location"] = "location"
            
        if profile_data.get('linkedin'):
            update_expression += ", linkedin = :linkedin"
            expression_attribute_values[":linkedin"] = profile_data['linkedin']
            
        if profile_data.get('website'):
            update_expression += ", website = :website"
            expression_attribute_values[":website"] = profile_data['website']
        
        response = table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ExpressionAttributeNames=expression_attribute_names,
            ReturnValues='ALL_NEW'
        )
        
        return response['Attributes']
        
    except Exception as e:
        logging.error(f"Error updating user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
# --- ADD THIS NEW ENDPOINT AT THE BOTTOM ---
@router.delete("/users/me", tags=["Users"])
async def delete_my_account(user_id: str = Depends(get_current_user_id)):
    """
    Handles the complete deletion of the currently authenticated user's account and data.
    """
    try:
        await delete_user_account(user_id)
        return {"message": "Account and all associated data deleted successfully."}
    except Exception as e:
        logging.error(f"Error during account deletion for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete account.")