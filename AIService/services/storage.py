# AIService/services/enhanced_storage.py

import boto3
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

dynamodb = boto3.client("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-2"))

def store_enhanced_analysis(file_id: str, analysis_data: Dict[str, Any]) -> bool:
    """
    Store enhanced analysis results including multi-agent outputs
    """
    try:
        # Prepare the item for DynamoDB
        item = {
            "fileId": {"S": file_id},
            "summary": {"S": analysis_data.get("summary", "")},
            "analysisTimestamp": {"S": datetime.utcnow().isoformat()},
            "analysisVersion": {"S": "2.0"}  # Version tracking for schema evolution
        }
        
        # Add multi-agent analysis if present
        if analysis_data.get("multi_agent_analysis"):
            multi_agent = analysis_data["multi_agent_analysis"]
            
            # Store overall success status
            item["multiAgentSuccess"] = {"BOOL": multi_agent.get("success", False)}
            
            # Store document classification
            if "summary" in multi_agent and "document_type" in multi_agent["summary"]:
                item["documentType"] = {"S": multi_agent["summary"]["document_type"]}
            
            # Store agent results
            if "results" in multi_agent:
                # Classification results
                if "classifier" in multi_agent["results"]:
                    classifier_data = multi_agent["results"]["classifier"]["data"]
                    item["classification"] = {
                        "M": {
                            "primaryType": {"S": classifier_data.get("primary_classification", "unknown")},
                            "confidence": {"N": str(classifier_data.get("confidence", 0))},
                            "metadata": {"S": json.dumps(classifier_data.get("metadata", {}))}
                        }
                    }
                    
                    # Secondary classifications
                    if classifier_data.get("secondary_classifications"):
                        item["secondaryClassifications"] = {
                            "L": [
                                {
                                    "M": {
                                        "type": {"S": sc["type"]},
                                        "confidence": {"N": str(sc["confidence"])}
                                    }
                                }
                                for sc in classifier_data["secondary_classifications"]
                            ]
                        }
                
                # Entity extraction results
                if "entity_extractor" in multi_agent["results"]:
                    entity_data = multi_agent["results"]["entity_extractor"]["data"]
                    entities = entity_data.get("entities", {})
                    
                    # Store entity counts
                    item["entityCounts"] = {
                        "M": {
                            entity_type: {"N": str(len(entities.get(entity_type, [])))}
                            for entity_type in ["people", "organizations", "locations", 
                                              "dates", "money", "emails", "phones"]
                        }
                    }
                    
                    # Store actual entities (limited to avoid item size issues)
                    stored_entities = {}
                    for entity_type in ["people", "organizations", "money", "dates"]:
                        if entities.get(entity_type):
                            # Store up to 10 entities of each type
                            stored_entities[entity_type] = {
                                "L": [
                                    {"S": entity["text"]} 
                                    for entity in entities[entity_type][:10]
                                ]
                            }
                    
                    if stored_entities:
                        item["entities"] = {"M": stored_entities}
                
                # Store processing metrics
                item["processingMetrics"] = {
                    "M": {
                        "totalProcessingTime": {"N": str(multi_agent.get("total_processing_time", 0))},
                        "agentsRun": {"L": [{"S": agent} for agent in multi_agent.get("agents_run", [])]}
                    }
                }
            
            # Store any errors
            if multi_agent.get("errors"):
                item["analysisErrors"] = {
                    "L": [
                        {
                            "M": {
                                "agent": {"S": error.get("agent", "unknown")},
                                "error": {"S": error.get("error", "unknown error")}
                            }
                        }
                        for error in multi_agent["errors"]
                    ]
                }
        
        # Update the item in DynamoDB
        dynamodb.update_item(
            TableName="Files",
            Key={"fileId": {"S": file_id}},
            UpdateExpression="SET " + ", ".join([f"#{k} = :{k}" for k in item.keys() if k != "fileId"]),
            ExpressionAttributeNames={f"#{k}": k for k in item.keys() if k != "fileId"},
            ExpressionAttributeValues={f":{k}": v for k, v in item.items() if k != "fileId"}
        )
        
        logger.info(f"Successfully stored enhanced analysis for fileId: {file_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to store enhanced analysis for fileId {file_id}: {e}", exc_info=True)
        return False

def get_enhanced_analysis(file_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve enhanced analysis results for a file
    """
    try:
        response = dynamodb.get_item(
            TableName="Files",
            Key={"fileId": {"S": file_id}}
        )
        
        if "Item" not in response:
            return None
        
        item = response["Item"]
        
        # Parse the DynamoDB item into a more usable format
        result = {
            "file_id": file_id,
            "summary": item.get("summary", {}).get("S", ""),
            "analysis_timestamp": item.get("analysisTimestamp", {}).get("S"),
            "analysis_version": item.get("analysisVersion", {}).get("S", "1.0")
        }
        
        # Extract classification data
        if "classification" in item:
            classification = item["classification"]["M"]
            result["classification"] = {
                "primary_type": classification.get("primaryType", {}).get("S"),
                "confidence": float(classification.get("confidence", {}).get("N", 0)),
                "metadata": json.loads(classification.get("metadata", {}).get("S", "{}"))
            }
        
        # Extract entity data
        if "entityCounts" in item:
            result["entity_counts"] = {
                k: int(v.get("N", 0)) 
                for k, v in item["entityCounts"]["M"].items()
            }
        
        if "entities" in item:
            result["entities"] = {}
            for entity_type, entity_list in item["entities"]["M"].items():
                result["entities"][entity_type] = [
                    entity["S"] for entity in entity_list["L"]
                ]
        
        # Extract processing metrics
        if "processingMetrics" in item:
            metrics = item["processingMetrics"]["M"]
            result["processing_metrics"] = {
                "total_time": float(metrics.get("totalProcessingTime", {}).get("N", 0)),
                "agents_run": [agent["S"] for agent in metrics.get("agentsRun", {}).get("L", [])]
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to retrieve enhanced analysis for fileId {file_id}: {e}", exc_info=True)
        return None

def query_by_document_type(document_type: str, limit: int = 10) -> list[Dict[str, Any]]:
    """
    Query files by document type (requires GSI on documentType)
    """
    try:
        # Note: This requires a Global Secondary Index on documentType
        response = dynamodb.query(
            TableName="Files",
            IndexName="DocumentTypeIndex",  # You'll need to create this GSI
            KeyConditionExpression="documentType = :dtype",
            ExpressionAttributeValues={
                ":dtype": {"S": document_type}
            },
            Limit=limit
        )
        
        items = []
        for item in response.get("Items", []):
            items.append({
                "file_id": item["fileId"]["S"],
                "document_type": item["documentType"]["S"],
                "summary": item.get("summary", {}).get("S", ""),
                "analysis_timestamp": item.get("analysisTimestamp", {}).get("S")
            })
        
        return items
        
    except Exception as e:
        logger.error(f"Failed to query by document type {document_type}: {e}", exc_info=True)
        return []