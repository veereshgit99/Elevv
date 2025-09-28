# FileService/routes/analysis.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from security import get_current_user_id
from database.analysis_operations import save_analysis_summary, get_user_analyses, get_analysis_by_id
import boto3
import config
import logging

router = APIRouter()
dynamodb = boto3.resource('dynamodb', region_name=config.AWS_REGION)
table = dynamodb.Table('Analysis')

class AnalysisSummaryRequest(BaseModel):
    analysis_id: str
    job_title: str
    company_name: str
    match_percentage: int
    resume_id: str
    full_analysis_s3_path: str

@router.post("/analyses", tags=["Analysis"])
async def create_analysis_summary(
    request: AnalysisSummaryRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Save analysis summary to DynamoDB
    """
    try:
        summary = await save_analysis_summary(
            user_id=user_id,
            analysis_id=request.analysis_id,
            job_title=request.job_title,
            company_name=request.company_name,
            match_percentage=request.match_percentage,
            resume_id=request.resume_id,
            full_analysis_s3_path=request.full_analysis_s3_path
        )
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyses", tags=["Analysis"])
async def list_user_analyses(
    user_id: str = Depends(get_current_user_id),
    limit: int = 20
):
    """
    Get all analyses for the current user
    """
    try:
        analyses = await get_user_analyses(user_id, limit)
        return analyses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyses/{analysis_id}", tags=["Analysis"])
async def get_analysis(
    analysis_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get a specific analysis
    """
    try:
        analysis = await get_analysis_by_id(user_id, analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.patch("/analyses/{analysis_id}", tags=["Analysis"])
async def update_analysis(
    analysis_id: str,
    update_data: dict,
    user_id: str = Depends(get_current_user_id)  # This returns a string, not dict
):
    """
    Update an existing analysis record
    """
    try:
        # First, verify the analysis exists and belongs to the user
        try:
            existing_item = table.get_item(
                Key={
                    'analysis_id': analysis_id
                }
            )
            
            if 'Item' not in existing_item:
                raise HTTPException(status_code=404, detail="Analysis not found")

            # Check if the analysis belongs to the user
            if existing_item['Item'].get('user_id') != user_id:
                raise HTTPException(status_code=403, detail="Access denied")
                
        except Exception as get_error:
            logging.error(f"Error checking existing analysis: {get_error}")
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Build update expression for high-level resource API
        update_expression = "SET "
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        # Handle reserved keywords and build expression
        for key, value in update_data.items():
            # Handle reserved DynamoDB keywords
            if key in ['status', 'timestamp', 'data', 'size', 'type']:
                attr_name = f"#{key}"
                expression_attribute_names[attr_name] = key
                update_expression += f"{attr_name} = :{key}, "
            else:
                update_expression += f"{key} = :{key}, "
            
            expression_attribute_values[f":{key}"] = value
        
        # Remove trailing comma and space
        update_expression = update_expression.rstrip(", ")
        
        # Update the item using high-level resource API
        response = table.update_item(
            Key={
                'analysis_id': analysis_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW',
            **({'ExpressionAttributeNames': expression_attribute_names} if expression_attribute_names else {})
        )
        
        return {
            "message": "Analysis updated successfully", 
            "updated_item": response.get("Attributes"),
            "analysis_id": analysis_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating analysis {analysis_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update analysis: {str(e)}")