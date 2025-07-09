# AIService/main.py - Enhanced version with multi-agent support

from fastapi import FastAPI, HTTPException
from mangum import Mangum
from typing import Dict, Any, Optional
import json
import logging
import asyncio

# Set up logging for better visibility in CloudWatch
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from models.request_schema import FileProcessRequest

# Import your core service functions
from services.summarizer import generate_summary
from services.emailer import send_summary_email
from services.storage import store_enhanced_analysis
from services.utils import download_file_to_tmp, extract_text_content

# Import multi-agent components
from agents.orchestrator import DocumentAnalysisOrchestrator

# Initialize FastAPI app
app = FastAPI()

# Initialize the orchestrator
orchestrator = DocumentAnalysisOrchestrator()

# --- Enhanced Core Processing Logic Function ---
async def _process_file_core(
    file_id: str, 
    pre_signed_url: str, 
    user_email: str = None,
    enable_multi_agent: bool = True  # Feature flag for gradual rollout
):
    try:
        logger.info(f"Starting core processing for fileId: {file_id}")
        
        # 1. Download file to /tmp and get its type
        file_path, content_type = download_file_to_tmp(pre_signed_url)
        logger.info(f"File downloaded to {file_path} with Content-Type: {content_type}")

        # 2. Extract text content
        content = extract_text_content(file_path, content_type)
        logger.info(f"Extracted text content for fileId: {file_id}. Length: {len(content)} characters.")

        # Check if the extracted content is an error message
        if content.startswith("Cannot generate summary:"):
            summary = content
            multi_agent_results = None
            logger.error(f"Processing skipped for fileId {file_id} due to content extraction error: {summary}")
        else:
            # 3. Generate traditional summary (keep existing functionality)
            summary = generate_summary(content)
            logger.info(f"Summary generated for fileId: {file_id}")
            
            # 4. Run multi-agent analysis if enabled
            multi_agent_results = None
            if enable_multi_agent:
                try:
                    logger.info(f"Starting multi-agent analysis for fileId: {file_id}")
                    multi_agent_results = await orchestrator.analyze_document(
                        file_id=file_id,
                        content=content,
                        file_type=content_type,
                        metadata={
                            "file_path": file_path,
                            "original_content_type": content_type
                        }
                    )
                    logger.info(f"Multi-agent analysis completed for fileId: {file_id}")
                except Exception as e:
                    logger.error(f"Multi-agent analysis failed for fileId {file_id}: {e}", exc_info=True)
                    # Continue with traditional processing even if multi-agent fails

        # 5. Store results in DynamoDB
        # Enhanced storage to include multi-agent results
        storage_data = {
            "file_id": file_id,
            "summary": summary,
            "multi_agent_analysis": multi_agent_results
        }
        store_enhanced_analysis(file_id=file_id, analysis_data=storage_data)  # Keep existing storage
        
        # TODO: Store multi-agent results in enhanced DynamoDB schema
        # store_enhanced_analysis(file_id=file_id, analysis_data=storage_data)
        
        # 6. Send enhanced email with both summary and analysis
        if multi_agent_results and multi_agent_results.get("success"):
            enhanced_email_content = _format_enhanced_email(
                summary=summary,
                analysis=multi_agent_results,
                file_id=file_id
            )
            send_summary_email(to_email=user_email, summary=enhanced_email_content, file_id=file_id)
        else:
            # Fallback to original email format
            send_summary_email(to_email=user_email, summary=summary, file_id=file_id)
        
        logger.info(f"Email sent for fileId: {file_id} to {user_email}")

        return {
            "status": "success", 
            "summary": summary,
            "multi_agent_analysis": multi_agent_results
        }

    except Exception as e:
        logger.error(f"Core processing failed for fileId {file_id}: {e}", exc_info=True)
        raise

def _format_enhanced_email(summary: str, analysis: Dict[str, Any], file_id: str) -> str:
    """Format enhanced email content with multi-agent analysis results"""
    email_parts = [
        f"File ID: {file_id}",
        "",
        "=== SUMMARY ===",
        summary,
        "",
        "=== DOCUMENT ANALYSIS ==="
    ]
    
    if analysis.get("summary"):
        analysis_summary = analysis["summary"]
        
        # Document type
        email_parts.append(f"\nDocument Type: {analysis_summary.get('document_type', 'Unknown')}")
        
        # Key findings
        if analysis_summary.get("key_findings"):
            email_parts.append("\nKey Findings:")
            for finding in analysis_summary["key_findings"]:
                email_parts.append(f"  • {finding}")
        
        # Entity summary
        if analysis_summary.get("entity_summary", {}).get("entity_counts"):
            email_parts.append("\nEntities Found:")
            for entity_type, count in analysis_summary["entity_summary"]["entity_counts"].items():
                if count > 0:
                    email_parts.append(f"  • {entity_type.title()}: {count}")
    
    # Add specific entity details if interesting
    if "results" in analysis and "entity_extractor" in analysis["results"]:
        entity_data = analysis["results"]["entity_extractor"]["data"]["entities"]
        
        # Add top people and organizations
        if entity_data.get("people"):
            email_parts.append("\nPeople Mentioned:")
            for person in entity_data["people"][:5]:  # Top 5
                email_parts.append(f"  • {person['text']}")
        
        if entity_data.get("organizations"):
            email_parts.append("\nOrganizations:")
            for org in entity_data["organizations"][:5]:  # Top 5
                email_parts.append(f"  • {org['text']}")
        
        if entity_data.get("money"):
            email_parts.append("\nMonetary Values:")
            for money in entity_data["money"][:5]:  # Top 5
                email_parts.append(f"  • {money['text']}")
    
    return "\n".join(email_parts)

# --- FastAPI Endpoints ---
@app.post("/process-summary")
async def process_file_endpoint(req: FileProcessRequest):
    """Original endpoint - maintains backward compatibility"""
    try:
        # Use multi-agent by default, but can be disabled via header or param
        result = await _process_file_core(
            req.fileId, 
            req.preSignedUrl, 
            req.userEmail,
            enable_multi_agent=True
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents/status")
async def get_agents_status():
    """Get status of available agents"""
    return {
        "available_agents": orchestrator.get_available_agents(),
        "orchestration_strategy": {
            "parallel_groups": [
                [agent.value for agent in group] 
                for group in orchestrator.strategy.parallel_groups
            ]
        }
    }

@app.post("/analyze/{file_id}")
async def analyze_document_endpoint(
    file_id: str,
    content: str,
    file_type: Optional[str] = "text/plain"
):
    """Direct document analysis endpoint for testing"""
    try:
        result = await orchestrator.analyze_document(
            file_id=file_id,
            content=content,
            file_type=file_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AWS Lambda Handler ---
def lambda_handler(event: Dict[str, Any], context: Any):
    logger.info(f"Received event: {json.dumps(event)}")

    # Check if the event comes from SQS
    if 'Records' in event and isinstance(event['Records'], list) and event['Records'] and 'eventSource' in event['Records'][0] and event['Records'][0]['eventSource'] == 'aws:sqs':
        logger.info("Processing SQS event...")
        for record in event['Records']:
            try:
                message_body = json.loads(record['body'])
                file_id = message_body.get('fileId')
                pre_signed_url = message_body.get('preSignedUrl')
                user_email = message_body.get('userEmail')

                if file_id and pre_signed_url:
                    # Process with multi-agent analysis
                    asyncio.run(_process_file_core(
                        file_id, 
                        pre_signed_url, 
                        user_email,
                        enable_multi_agent=True
                    ))
                    logger.info(f"SQS message processed successfully for fileId: {file_id}")
                else:
                    logger.warning(f"Invalid SQS message format received: {message_body}")
            except Exception as e:
                logger.error(f"Error processing SQS record: {e}", exc_info=True)
                raise e
        return {"statusCode": 200}

    # If not an SQS event, assume it's an API Gateway (HTTP) event
    else:
        logger.info("Processing API Gateway event...")
        asgi_handler = Mangum(app)
        return asgi_handler(event, context)