# FileService/routes/analysis.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from security import get_current_user_id
from database.analysis_operations import save_analysis_summary, get_user_analyses, get_analysis_by_id

router = APIRouter()

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