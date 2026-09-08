import os
import uuid
import shutil
import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, status, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from backend.dependencies import get_current_user
from backend.services.cleaner import DatasetCleaner

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Dataset Cleaner"])

# Upload directory configuration
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

# In-memory database to store job details
# Structure: { job_id: { "status": str, "file_path": str, "processed_path": Optional[str], "error": Optional[str] } }
jobs_db: Dict[str, Dict[str, Any]] = {}

# Pydantic schemas
class CleaningStrategies(BaseModel):
    missing_values: str = Field(
        default="none",
        description="Strategy for null variables: 'drop', 'mean', 'median', 'mode', or 'none'"
    )
    remove_duplicates: bool = Field(
        default=False,
        description="Whether duplicate rows should be detected and deleted"
    )
    standardize_types: bool = Field(
        default=False,
        description="Trim whitespace in object columns and convert types automatically"
    )
    standardize_column_names: bool = Field(
        default=False,
        description="Standardize column names to lowercase snake_case"
    )

class ChatMessageRequest(BaseModel):
    job_id: str = Field(..., description="Active dataset ID")
    message: str = Field(..., description="User chat prompt")
    categories: List[str] = Field(default=[], description="Selected task checkboxes")

# Background processing logic
def execute_background_cleaning(job_id: str, file_path: str, strategies: Dict[str, Any], user_email: Optional[str] = None):
    try:
        processed_path = DatasetCleaner.clean_data(file_path, strategies)
        
        # Run Explainable AI insights and Model recommendations
        try:
            is_premium_user = True
            if user_email:
                try:
                    from backend.services.billing import QuotaManager
                    QuotaManager.validate_feature_access(user_email, "xai")
                except ValueError:
                    is_premium_user = False

            if is_premium_user:
                from backend.services.xai import XAIProcessor
                from backend.services.recommender import ModelRecommender
                
                xai_insights = XAIProcessor.analyze_cleaned_dataset(processed_path)
                num_rows = xai_insights.get("num_rows", 0)
                num_cols = xai_insights.get("num_cols", 0)
                analysis_type = xai_insights.get("analysis_type", "Classification")
                
                recommendations = ModelRecommender.recommend(
                    num_rows=num_rows,
                    num_cols=num_cols,
                    analysis_type=analysis_type
                )
                logger.info(f"XAI and Recommender completed successfully for job {job_id}")
            else:
                logger.info(f"Skipping XAI/Recommender logic for job {job_id} — user is not premium.")
                xai_insights = {
                    "correlation_insight": "Explainable AI (XAI) feature correlations are locked on the Free plan. Please upgrade to Plus or Pro.",
                    "summary": "Explainable AI (XAI) and Recommended Models are locked on your plan. Upgrade to a premium plan to gain access to detailed heuristics-driven model recommendations and feature correlations.",
                    "important_features": []
                }
                recommendations = []
        except Exception as ai_err:
            logger.error(f"XAI/Recommender analysis failed for job {job_id}: {ai_err}")
            xai_insights = {
                "correlation_insight": "Could not calculate AI insights due to an internal analyzer error.",
                "summary": f"XAI failed: {str(ai_err)}",
                "important_features": []
            }
            recommendations = []

        jobs_db[job_id].update({
            "status": "Completed",
            "processed_path": processed_path,
            "error": None,
            "xai_insights": xai_insights,
            "recommendations": recommendations
        })
        logger.info(f"Background cleaning for job {job_id} completed successfully.")
    except Exception as e:
        jobs_db[job_id].update({
            "status": "Failed",
            "error": str(e)
        })
        logger.error(f"Background cleaning for job {job_id} failed: {str(e)}")

# Endpoints
@router.post("/api/upload", status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts a single CSV file, saves it temporarily inside the backend/uploads directory,
    and returns a unique job_id for state tracking.
    """
    # Validate file extension
    filename = file.filename or ""
    if not filename.lower().endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only CSV files (.csv) are supported."
        )
        
    # Generate unique job_id and file name
    job_id = str(uuid.uuid4())
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    unique_filename = f"{job_id}.csv"
    destination_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to local disk: {str(e)}"
        )
    finally:
        await file.close()

    # Generate preview of the first 10 rows
    import pandas as pd
    try:
        df_preview = pd.read_csv(destination_path, nrows=10)
        df_preview = df_preview.fillna("")
        preview_columns = list(df_preview.columns)
        preview_rows = df_preview.to_dict(orient="records")
    except Exception as e:
        logger.warning(f"Failed to generate CSV preview: {str(e)}")
        preview_columns = []
        preview_rows = []

    # Track job status in DB
    jobs_db[job_id] = {
        "status": "Pending",
        "file_path": destination_path,
        "processed_path": None,
        "error": None,
        "filename": filename
    }
    
    logger.info(f"File uploaded. Job created: {job_id}. Saved path: {destination_path}")
    
    return {
        "job_id": job_id,
        "status": "Pending",
        "filename": filename,
        "preview_columns": preview_columns,
        "preview_rows": preview_rows
    }

@router.post("/api/process/{job_id}", status_code=status.HTTP_202_ACCEPTED)
async def process_dataset(
    job_id: str,
    strategies: CleaningStrategies,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers the cleaning logic asynchronously in the background.
    Enforces subscription quota before queuing.
    Returns immediately with HTTP status code 202 (Accepted).
    """
    if job_id not in jobs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found. Check if the job_id is correct or upload file again."
        )

    job_info = jobs_db[job_id]
    if job_info["status"] == "Processing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is already being processed."
        )

    user_email = current_user.get("email")

    # --- Subscription Quota Check ---
    if user_email:
        try:
            from backend.services.billing import QuotaManager
            QuotaManager.validate_user_plan(user_email)
        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=str(ve)
            )
        except Exception as e:
            logger.warning(f"Quota check failed for {user_email}: {e}. Proceeding without enforcement.")

    # Update job state to processing
    job_info["status"] = "Processing"

    # Queue background task
    background_tasks.add_task(
        execute_background_cleaning,
        job_id=job_id,
        file_path=job_info["file_path"],
        strategies=strategies.model_dump(),
        user_email=user_email
    )

    # Record upload against quota (best-effort — doesn't block on failure)
    if user_email:
        try:
            from backend.services.billing import BillingService
            BillingService.record_upload(user_email)
        except Exception as e:
            logger.warning(f"Failed to record upload for {user_email}: {e}")

    logger.info(f"Queued background processing task for job: {job_id} [user: {user_email or 'anonymous'}]")

    return {
        "job_id": job_id,
        "status": "Processing",
        "message": "Dataset processing started in the background."
    }

@router.get("/api/status/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns the processing status (Pending, Processing, Completed, Failed).
    Returns file metadata if completed or error info if failed.
    """
    if job_id not in jobs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
        
    job_info = jobs_db[job_id]
    
    response = {
        "job_id": job_id,
        "status": job_info["status"]
    }
    
    if job_info["status"] == "Completed":
        response["processed"] = True
        response["download_url"] = f"/api/download/{job_id}"
        response["xai_insights"] = job_info.get("xai_insights", {})
        response["recommendations"] = job_info.get("recommendations", [])
    elif job_info["status"] == "Failed":
        response["processed"] = False
        response["error"] = job_info.get("error", "Unknown processing error")
        
    return response

@router.get("/api/download/{job_id}")
async def download_processed_dataset(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Streams back the cleaned CSV file if processing has completed successfully.
    """
    if job_id not in jobs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
        
    job_info = jobs_db[job_id]
    if job_info["status"] != "Completed" or not job_info["processed_path"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Processed file not available. Current status: {job_info['status']}"
        )
        
    processed_path = job_info["processed_path"]
    if not os.path.exists(processed_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cleaned file could not be found on server disk."
        )
        
    # Return processed CSV file
    original_filename = job_info.get("filename", "dataset.csv")
    name_part, ext_part = os.path.splitext(original_filename)
    download_filename = f"{name_part}_cleaned{ext_part}"
    
    logger.info(f"Serving download of cleaned file for job {job_id} -> {download_filename}")
    
    return FileResponse(
        path=processed_path,
        media_type="text/csv",
        filename=download_filename
    )

@router.post("/api/chat/message")
async def chat_message(
    body: ChatMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    State-aware chat endpoint that parses user intent, triggers dataset cleaning
    if requested, recommends models, and provides explainability data.
    """
    user_email = current_user.get("email")
    if user_email and any(c in body.categories for c in ["Regression", "Clustering"]):
        from backend.services.billing import QuotaManager
        try:
            # Check for regression/clustering suggestion lock
            QuotaManager.validate_feature_access(user_email, "regression_suggestions" if "Regression" in body.categories else "clustering_suggestions")
        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=str(ve)
            )

    from backend.services.processor import ProcessingEngine
    try:
        result = ProcessingEngine.process_conversational_task(
            job_id=body.job_id,
            message=body.message,
            checked_types=body.categories,
            user_email=user_email
        )
        return result
    except Exception as e:
        logger.error(f"Chat message processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}"
        )
