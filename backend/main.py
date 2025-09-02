# main.py
from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime

from database import Database
from models import ClassroomSyntheticData
from services import AnalyticsService
from rag_service import get_rag_service
from rag_service_v2 import get_rag_service_v2
from reports_service import reports_service
import json
import logging
import os

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Request/Response models for chat functionality
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    sources: list = []

class ChatResponseV2(BaseModel):
    response: str
    session_id: str
    sources: list = []
    system_used: str = "v2"
    fallback_reason: Optional[str] = None

# Request/Response models for Reports
class GenerateReportRequest(BaseModel):
    report_date: date
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None
    bootcamp_id: Optional[int] = None

class ReportResponse(BaseModel):
    id: str
    title: str
    description: str
    report_date: str
    status: str
    created_at: str

load_dotenv()

db = Database()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()

app = FastAPI(
    title="ClassSight Analytics API",
    description="API for classroom synthetic data",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analytics_service = AnalyticsService(db)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "ClassSight Analytics API is running"}

@app.get("/api/classroom-data", response_model=list[ClassroomSyntheticData])
async def get_classroom_data(limit: int = 100):
    try:
        data = await analytics_service.get_classroom_data(limit)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get classroom data: {str(e)}"
        )

# NEW EDA ENDPOINTS

@app.get("/api/attention-distraction/weekly")
async def get_attention_vs_distraction_weekly():
    # Weekly attention data
    try:
        data = await analytics_service.get_attention_vs_distraction_weekly()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get weekly attention data: {str(e)}"
        )

@app.get("/api/attention-distraction/daily")
async def get_attention_vs_distraction_daily(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    # Daily attention data
    try:
        data = await analytics_service.get_attention_vs_distraction_daily(start_date, end_date)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get daily attention data: {str(e)}"
        )

@app.get("/api/attention-distraction/hourly")
async def get_attention_vs_distraction_hourly(
    date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)")
):
    """Get hourly attention vs distraction data"""
    try:
        data = await analytics_service.get_attention_vs_distraction_hourly(date)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get hourly attention data: {str(e)}"
        )

@app.get("/api/students/weekly")
async def get_students_weekly():
    """Get weekly max vs min students data"""
    try:
        data = await analytics_service.get_students_weekly()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get weekly students data: {str(e)}"
        )

@app.get("/api/students/daily")
async def get_students_daily(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get daily max vs min students data"""
    try:
        data = await analytics_service.get_students_daily(start_date, end_date)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get daily students data: {str(e)}"
        )

@app.get("/api/students/hourly")
async def get_students_hourly(
    date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)")
):
    """Get hourly max vs min students data"""
    try:
        data = await analytics_service.get_students_hourly(date)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get hourly students data: {str(e)}"
        )

@app.get("/api/dashboard-insights")
async def get_dashboard_insights():
    """Get key insights for dashboard cards"""
    try:
        data = await analytics_service.get_dashboard_insights()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get dashboard insights: {str(e)}"
        )

@app.get("/api/student-capacity-trends")
async def get_student_capacity_trends():
    """Get student capacity trends over time"""
    try:
        data = await analytics_service.get_student_capacity_trends()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get capacity trends: {str(e)}"
        )

# -----------------------------------------------------------------------------
# Enhanced EDA Analytics Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/attendance-analytics/hourly")
async def get_attendance_analytics_hourly(
    date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)")
):
    """Get hourly attendance analytics with percentage calculations"""
    try:
        data = await analytics_service.get_attendance_analytics_hourly(date)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get hourly attendance analytics: {str(e)}"
        )

@app.get("/api/attendance-analytics/daily")
async def get_attendance_analytics_daily(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get daily attendance analytics with percentage calculations"""
    try:
        data = await analytics_service.get_attendance_analytics_daily(start_date, end_date)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get daily attendance analytics: {str(e)}"
        )

@app.get("/api/attendance-analytics/weekly")
async def get_attendance_analytics_weekly():
    """Get weekly attendance analytics with percentage calculations"""
    try:
        data = await analytics_service.get_attendance_analytics_weekly()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get weekly attendance analytics: {str(e)}"
        )

@app.get("/api/enhanced-attention/hourly")
async def get_enhanced_attention_metrics_hourly(
    date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)")
):
    """Get hourly attention metrics including max, min, and avg rates"""
    try:
        data = await analytics_service.get_enhanced_attention_metrics_hourly(date)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get hourly enhanced attention metrics: {str(e)}"
        )

@app.get("/api/enhanced-attention/daily")
async def get_enhanced_attention_metrics_daily(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get daily attention metrics including max, min, and avg rates"""
    try:
        data = await analytics_service.get_enhanced_attention_metrics_daily(start_date, end_date)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get daily enhanced attention metrics: {str(e)}"
        )

@app.get("/api/enhanced-attention/weekly")
async def get_enhanced_attention_metrics_weekly():
    """Get weekly attention metrics including max, min, and avg rates"""
    try:
        data = await analytics_service.get_enhanced_attention_metrics_weekly()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get weekly enhanced attention metrics: {str(e)}"
        )

@app.get("/api/correlation-insights")
async def get_correlation_insights():
    """Get correlation analysis between attendance and attention"""
    try:
        data = await analytics_service.get_correlation_insights()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get correlation insights: {str(e)}"
        )

@app.get("/api/performance-summary")
async def get_performance_summary():
    """Get comprehensive performance summary with best/worst performing days and time slots"""
    try:
        data = await analytics_service.get_performance_summary()
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get performance summary: {str(e)}"
        )

# -----------------------------------------------------------------------------
# Authentication Helper for RAG
# -----------------------------------------------------------------------------
async def get_current_user_id(authorization: str = Header(None)) -> str:
    # Just a placeholder for getting user info
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    # For testing: handle user_ prefixed tokens
    if token.startswith("user_"):
        return token[5:]  # Remove "user_" prefix to get UUID part
    
    # For production: decode JWT token here
    return token

# -----------------------------------------------------------------------------
# RAG/Chat Endpoints
# -----------------------------------------------------------------------------
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest
    # Temporarily removed auth: user_id: str = Depends(get_current_user_id)
):
    """Main chat endpoint for RAG conversations"""
    try:
        rag_service = get_rag_service()
        
        # Process chat - the chat method handles session creation internally
        session_id = request.session_id
        user_id = "test-user"  # Temporary test user
        
        result = await rag_service.chat(request.message, session_id, user_id)
        
        return ChatResponse(
            response=result["answer"],
            session_id=result["session_id"],
            sources=result.get("sources", [])
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint failed: {e}")
        raise HTTPException(status_code=500, detail="Chat processing failed")

@app.get("/api/chat/sessions")
async def get_chat_sessions(
    # Temporarily removed auth: user_id: str = Depends(get_current_user_id),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user's chat sessions"""
    try:
        rag_service = get_rag_service()
        user_id = "test-user"  # Temporary test user
        sessions = await rag_service.get_chat_sessions(user_id)
        return sessions
    except Exception as e:
        logger.error(f"Get sessions failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat sessions")

@app.get("/api/chat/history/{session_id}")
async def get_chat_history(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=200)
):
    """Get chat history for a session"""
    try:
        rag_service = get_rag_service()
        history = await rag_service.get_session_messages(session_id)
        return history
    except Exception as e:
        logger.error(f"Get history failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat history")

@app.post("/api/rag/refresh")
async def refresh_rag_data():
    """Manually refresh RAG vector store with latest data"""
    try:
        rag_service = get_rag_service()
        await rag_service.initialize_vector_store()
        return {"message": "RAG data refreshed successfully"}
    except Exception as e:
        logger.error(f"RAG refresh failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh RAG data")

@app.get("/api/rag/status")
async def get_rag_status():
    """Get RAG service status"""
    try:
        rag_service = get_rag_service()
        status = await rag_service.health_check()
        return status
    except Exception as e:
        logger.error(f"RAG status check failed: {e}")
        return {"available": False, "initialized": False, "vectorstore_ready": False}

# -----------------------------------------------------------------------------
# RAG V2 Endpoints (New SQL-based system)
# -----------------------------------------------------------------------------

@app.post("/api/chat/v2", response_model=ChatResponseV2)
async def chat_endpoint_v2(
    request: ChatRequest
    # Temporarily removed auth: user_id: str = Depends(get_current_user_id)
):
    """New SQL-based chat endpoint with fallback to legacy RAG"""
    try:
        rag_service_v2 = get_rag_service_v2()
        
        # Process chat with new system (includes automatic fallback)
        session_id = request.session_id
        user_id = "test-user"  # Temporary test user
        
        result = await rag_service_v2.chat(request.message, session_id, user_id)
        
        return ChatResponseV2(
            response=result["answer"],
            session_id=result["session_id"],
            sources=result.get("sources", []),
            system_used=result.get("system_used", "v2"),
            fallback_reason=result.get("fallback_reason")
        )
        
    except Exception as e:
        logger.error(f"Chat V2 endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.get("/api/rag/v2/status")
async def get_rag_v2_status():
    """Get RAG V2 service status (includes both new and legacy systems)"""
    try:
        rag_service_v2 = get_rag_service_v2()
        status = await rag_service_v2.health_check()
        return status
    except Exception as e:
        logger.error(f"RAG V2 status check failed: {e}")
        return {
            "status": "error",
            "v2_system": {"available": False, "error": str(e)},
            "legacy_system": {"available": False, "error": "Not tested due to V2 error"}
        }

# ===== REPORTS ENDPOINTS =====

@app.get("/api/reports")
async def get_reports(
    bootcamp_id: Optional[int] = Query(None, description="Filter by bootcamp ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of reports to return"),
    offset: int = Query(0, ge=0, description="Number of reports to skip")
):
    """Get list of reports with optional filters"""
    try:
        reports = await reports_service.get_reports(
            bootcamp_id=bootcamp_id,
            limit=limit,
            offset=offset
        )
        return {"reports": reports}
    except Exception as e:
        logger.error(f"Error fetching reports: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports: {str(e)}")

@app.post("/api/reports/generate", response_model=ReportResponse)
async def generate_report(request: GenerateReportRequest):
    """Generate a new report"""
    try:
        # Validate date range
        if request.date_range_start and request.date_range_end:
            if request.date_range_start > request.date_range_end:
                raise HTTPException(status_code=400, detail="Start date must be before end date")
            if request.date_range_start < date(2024, 1, 1):
                raise HTTPException(status_code=400, detail="Reports cannot be generated before 2024")
            
            # Generate date range report
            report_id = await reports_service.generate_date_range_report(
                start_date=request.date_range_start,
                end_date=request.date_range_end,
                bootcamp_id=request.bootcamp_id,
                user_id=None
            )
        else:
            # Generate daily report
            if request.report_date < date(2024, 1, 1):
                raise HTTPException(status_code=400, detail="Reports cannot be generated before 2024")
            
            report_id = await reports_service.generate_daily_report(
                report_date=request.report_date,
                bootcamp_id=request.bootcamp_id,
                user_id=None
            )
        
        # Get report details
        report_details = await reports_service.get_report_details(report_id)
        if not report_details:
            raise HTTPException(status_code=404, detail="Report not found after generation")
        
        return ReportResponse(
            id=report_details['id'],
            title=report_details['title'],
            description=report_details['description'],
            report_date=report_details['report_date'],
            status=report_details['status'],
            created_at=report_details['created_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@app.get("/api/reports/{report_id}")
async def get_report_details(report_id: str):
    """Get detailed report information"""
    try:
        report = await reports_service.get_report_details(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch report details: {str(e)}")

@app.get("/api/reports/{report_id}/download")
async def download_report(report_id: str):
    """Download report PDF"""
    try:
        report = await reports_service.get_report_details(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        file_path = report.get('file_path')
        if not file_path:
            raise HTTPException(status_code=404, detail="Report file path not found")
        
        # Convert relative path to absolute path
        if not os.path.isabs(file_path):
            file_path = os.path.abspath(file_path)
            
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Report file not found at: {file_path}")
        
        filename = f"report_{report['report_date'].replace('-', '')}.pdf"
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/pdf'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download report: {str(e)}")

@app.get("/api/bootcamps")
async def get_bootcamps():
    """Get list of bootcamps for filtering"""
    try:
        from database import get_db_connection
        
        conn = await get_db_connection()
        try:
            query = """
                SELECT bootcamp_id, bootcamp_name, start_date, end_date
                FROM bootcamps
                ORDER BY bootcamp_name
            """
            rows = await conn.fetch(query)
            
            bootcamps = []
            for row in rows:
                bootcamps.append({
                    'bootcamp_id': row['bootcamp_id'],
                    'bootcamp_name': row['bootcamp_name'],
                    'start_date': row['start_date'].isoformat() if row['start_date'] else None,
                    'end_date': row['end_date'].isoformat() if row['end_date'] else None
                })
            
            return {"bootcamps": bootcamps}
            
        finally:
            await conn.close()
            
    except Exception as e:
        logger.error(f"Error fetching bootcamps: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch bootcamps: {str(e)}")