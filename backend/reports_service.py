"""
Reports service for generating and managing classroom reports.
"""
import os
import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
import logging
from dataclasses import dataclass
import json
from decimal import Decimal

import pandas as pd
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from database import get_db_connection

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    return obj

@dataclass
class ReportMetrics:
    """Data class for report metrics"""
    total_students: int = 0
    total_sessions: int = 0
    average_attendance_rate: float = 0.0
    average_grade: float = 0.0
    average_occupancy_rate: float = 0.0
    average_attention_rate: float = 0.0
    average_distraction_rate: float = 0.0
    peak_occupancy_rate: float = 0.0
    min_occupancy_rate: float = 0.0
    bootcamp_performance: Dict[str, Any] = None
    daily_breakdown: Dict[str, Any] = None

class ReportsService:
    def __init__(self):
        self.reports_dir = "reports"
        if not os.path.exists(self.reports_dir):
            os.makedirs(self.reports_dir)
    
    async def generate_daily_report(self, report_date: date, bootcamp_id: Optional[int] = None, user_id: Optional[str] = None) -> str:
        """Generate a daily report for the specified date"""
        logger.info(f"Generating daily report for {report_date}")
        
        try:
            # Calculate metrics
            metrics = await self._calculate_metrics(report_date, report_date, bootcamp_id)
            
            # Create report record
            report_id = await self._create_report_record(
                title=f"Daily Report - {report_date.strftime('%B %d, %Y')}",
                description=f"Comprehensive daily analysis for {report_date.strftime('%A, %B %d, %Y')}",
                report_date=report_date,
                bootcamp_id=bootcamp_id,
                user_id=user_id,
                metrics=metrics
            )
            
            # Generate PDF
            pdf_path = await self._generate_pdf(report_id, metrics, report_date, report_date)
            
            # Update report with file path
            await self._update_report_file_path(report_id, pdf_path)
            
            logger.info(f"Daily report generated successfully: {report_id}")
            return report_id
            
        except Exception as e:
            logger.error(f"Error generating daily report: {str(e)}")
            raise
    
    async def generate_date_range_report(self, start_date: date, end_date: date, bootcamp_id: Optional[int] = None, user_id: Optional[str] = None) -> str:
        """Generate a report for a date range"""
        logger.info(f"Generating date range report from {start_date} to {end_date}")
        
        try:
            # Calculate metrics
            metrics = await self._calculate_metrics(start_date, end_date, bootcamp_id)
            
            # Create report record
            report_id = await self._create_report_record(
                title=f"Report - {start_date.strftime('%b %d')} to {end_date.strftime('%b %d, %Y')}",
                description=f"Analysis from {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}",
                report_date=end_date,
                date_range_start=start_date,
                date_range_end=end_date,
                bootcamp_id=bootcamp_id,
                user_id=user_id,
                metrics=metrics
            )
            
            # Generate PDF
            pdf_path = await self._generate_pdf(report_id, metrics, start_date, end_date)
            
            # Update report with file path
            await self._update_report_file_path(report_id, pdf_path)
            
            logger.info(f"Date range report generated successfully: {report_id}")
            return report_id
            
        except Exception as e:
            logger.error(f"Error generating date range report: {str(e)}")
            raise
    
    async def get_reports(self, bootcamp_id: Optional[int] = None, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Get list of reports with optional bootcamp filter"""
        conn = None
        try:
            conn = await get_db_connection()
            
            query = """
                SELECT 
                    r.id,
                    r.title,
                    r.description,
                    r.report_date,
                    r.date_range_start,
                    r.date_range_end,
                    r.bootcamp_id,
                    r.status,
                    r.created_at,
                    r.file_path,
                    b.bootcamp_name,
                    rd.total_students,
                    rd.total_sessions,
                    rd.average_attendance_rate,
                    rd.average_grade,
                    rd.average_occupancy_rate,
                    rd.average_attention_rate,
                    rd.average_distraction_rate,
                    rd.peak_occupancy_rate,
                    rd.min_occupancy_rate
                FROM reports r
                LEFT JOIN report_data rd ON r.id = rd.report_id
                LEFT JOIN bootcamps b ON r.bootcamp_id = b.bootcamp_id
                WHERE ($1::INTEGER IS NULL OR r.bootcamp_id = $1)
                ORDER BY r.report_date DESC, r.created_at DESC
                LIMIT $2 OFFSET $3
            """
            
            rows = await conn.fetch(query, bootcamp_id, limit, offset)
            
            reports = []
            for row in rows:
                report = {
                    'id': str(row['id']),
                    'title': row['title'],
                    'description': row['description'],
                    'report_date': row['report_date'].isoformat(),
                    'date_range_start': row['date_range_start'].isoformat() if row['date_range_start'] else None,
                    'date_range_end': row['date_range_end'].isoformat() if row['date_range_end'] else None,
                    'bootcamp_id': row['bootcamp_id'],
                    'bootcamp_name': row['bootcamp_name'],
                    'status': row['status'],
                    'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                    'file_path': row['file_path'],
                    'summary': {
                        'totalSessions': row['total_sessions'] or 0,
                        'averageAttendance': round(row['average_attendance_rate'] or 0, 1),
                        'averageGrade': round(row['average_grade'] or 0, 1),
                        'averageOccupancy': round(row['average_occupancy_rate'] or 0, 1),
                        'averageAttention': round(row['average_attention_rate'] or 0, 1),
                        'peakOccupancy': round(row['peak_occupancy_rate'] or 0, 1)
                    }
                }
                reports.append(report)
            
            return reports
            
        except Exception as e:
            logger.error(f"Error fetching reports: {str(e)}")
            raise
        finally:
            if conn:
                await conn.close()
    
    async def get_report_details(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed report information"""
        conn = None
        try:
            conn = await get_db_connection()
            
            query = """
                SELECT 
                    r.id,
                    r.title,
                    r.description,
                    r.report_date,
                    r.date_range_start,
                    r.date_range_end,
                    r.bootcamp_id,
                    r.status,
                    r.created_at,
                    r.file_path,
                    b.bootcamp_name,
                    rd.total_students,
                    rd.total_sessions,
                    rd.average_attendance_rate,
                    rd.average_grade,
                    rd.average_occupancy_rate,
                    rd.average_attention_rate,
                    rd.average_distraction_rate,
                    rd.peak_occupancy_rate,
                    rd.min_occupancy_rate,
                    rd.bootcamp_performance,
                    rd.daily_breakdown
                FROM reports r
                LEFT JOIN report_data rd ON r.id = rd.report_id
                LEFT JOIN bootcamps b ON r.bootcamp_id = b.bootcamp_id
                WHERE r.id = $1
            """
            
            row = await conn.fetchrow(query, uuid.UUID(report_id))
            if not row:
                return None
            
            return {
                'id': str(row['id']),
                'title': row['title'],
                'description': row['description'],
                'report_date': row['report_date'].isoformat(),
                'date_range_start': row['date_range_start'].isoformat() if row['date_range_start'] else None,
                'date_range_end': row['date_range_end'].isoformat() if row['date_range_end'] else None,
                'bootcamp_id': row['bootcamp_id'],
                'bootcamp_name': row['bootcamp_name'],
                'status': row['status'],
                'created_at': row['created_at'].isoformat(),
                'file_path': row['file_path'],
                'metrics': {
                    'total_students': row['total_students'] or 0,
                    'total_sessions': row['total_sessions'] or 0,
                    'average_attendance_rate': row['average_attendance_rate'] or 0,
                    'average_grade': row['average_grade'] or 0,
                    'average_occupancy_rate': row['average_occupancy_rate'] or 0,
                    'average_attention_rate': row['average_attention_rate'] or 0,
                    'average_distraction_rate': row['average_distraction_rate'] or 0,
                    'peak_occupancy_rate': row['peak_occupancy_rate'] or 0,
                    'min_occupancy_rate': row['min_occupancy_rate'] or 0,
                    'bootcamp_performance': row['bootcamp_performance'] or {},
                    'daily_breakdown': row['daily_breakdown'] or {}
                }
            }
            
        except Exception as e:
            logger.error(f"Error fetching report details: {str(e)}")
            raise
        finally:
            if conn:
                await conn.close()
    
    async def _calculate_metrics(self, start_date: date, end_date: date, bootcamp_id: Optional[int] = None) -> ReportMetrics:
        """Calculate all metrics for the report"""
        conn = None
        try:
            conn = await get_db_connection()
            
            # Initialize metrics
            metrics = ReportMetrics()
            
            # Calculate attendance metrics
            attendance_query = """
                SELECT 
                    COUNT(DISTINCT s.student_id) as total_students,
                    COUNT(*) as total_records,
                    AVG(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0.0 END) * 100 as attendance_rate
                FROM attendance a
                JOIN students s ON a.student_id = s.student_id
                WHERE a.date BETWEEN $1 AND $2
                AND ($3::INTEGER IS NULL OR s.bootcamp_id = $3)
            """
            
            attendance_row = await conn.fetchrow(attendance_query, start_date, end_date, bootcamp_id)
            if attendance_row:
                metrics.total_students = attendance_row['total_students'] or 0
                metrics.average_attendance_rate = attendance_row['attendance_rate'] or 0.0
            
            # Calculate grade metrics
            grade_query = """
                SELECT AVG(g.score) as average_grade
                FROM grades g
                JOIN students s ON g.student_id = s.student_id
                JOIN assessments a ON g.assessment_id = a.assessment_id
                WHERE a.due_date BETWEEN $1 AND $2
                AND ($3::INTEGER IS NULL OR s.bootcamp_id = $3)
            """
            
            grade_row = await conn.fetchrow(grade_query, start_date, end_date, bootcamp_id)
            if grade_row:
                metrics.average_grade = grade_row['average_grade'] or 0.0
            
            # Calculate YOLO metrics from classroom_synthetic_data_updated
            yolo_query = """
                SELECT 
                    COUNT(*) as total_sessions,
                    AVG(attendance_pct) as avg_occupancy,
                    AVG(avg_attention_rate) as avg_attention,
                    AVG(avg_distraction_rate) as avg_distraction,
                    MAX(max_attention_rate) as peak_occupancy,
                    MIN(min_attention_rate) as min_occupancy
                FROM classroom_synthetic_data_updated
                WHERE date BETWEEN $1 AND $2
            """
            
            yolo_row = await conn.fetchrow(yolo_query, start_date, end_date)
            if yolo_row:
                metrics.total_sessions = yolo_row['total_sessions'] or 0
                metrics.average_occupancy_rate = yolo_row['avg_occupancy'] or 0.0
                metrics.average_attention_rate = yolo_row['avg_attention'] or 0.0
                metrics.average_distraction_rate = yolo_row['avg_distraction'] or 0.0
                metrics.peak_occupancy_rate = yolo_row['peak_occupancy'] or 0.0
                metrics.min_occupancy_rate = yolo_row['min_occupancy'] or 0.0
            
            # Calculate bootcamp performance breakdown
            if not bootcamp_id:  # If no specific bootcamp, get all bootcamps
                bootcamp_query = """
                    SELECT 
                        b.bootcamp_id,
                        b.bootcamp_name,
                        COUNT(DISTINCT s.student_id) as students,
                        AVG(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0.0 END) * 100 as attendance_rate,
                        AVG(g.score) as average_grade
                    FROM bootcamps b
                    LEFT JOIN students s ON b.bootcamp_id = s.bootcamp_id
                    LEFT JOIN attendance a ON s.student_id = a.student_id AND a.date BETWEEN $1 AND $2
                    LEFT JOIN grades g ON s.student_id = g.student_id
                    LEFT JOIN assessments asmt ON g.assessment_id = asmt.assessment_id AND asmt.due_date BETWEEN $1 AND $2
                    GROUP BY b.bootcamp_id, b.bootcamp_name
                    ORDER BY b.bootcamp_name
                """
                
                bootcamp_rows = await conn.fetch(bootcamp_query, start_date, end_date)
                bootcamp_performance = {}
                for row in bootcamp_rows:
                    bootcamp_performance[str(row['bootcamp_id'])] = {
                        'name': row['bootcamp_name'],
                        'students': row['students'] or 0,
                        'attendance_rate': round(float(row['attendance_rate']) if row['attendance_rate'] else 0, 1),
                        'average_grade': round(float(row['average_grade']) if row['average_grade'] else 0, 1)
                    }
                metrics.bootcamp_performance = bootcamp_performance
            
            # Calculate daily breakdown for date ranges
            if start_date != end_date:
                daily_query = """
                    SELECT 
                        a.date,
                        AVG(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0.0 END) * 100 as attendance_rate,
                        AVG(cs.attendance_pct) as occupancy_rate,
                        AVG(cs.avg_attention_rate) as attention_rate
                    FROM attendance a
                    LEFT JOIN classroom_synthetic_data_updated cs ON a.date = cs.date
                    WHERE a.date BETWEEN $1 AND $2
                    GROUP BY a.date
                    ORDER BY a.date
                """
                
                daily_rows = await conn.fetch(daily_query, start_date, end_date)
                daily_breakdown = {}
                for row in daily_rows:
                    daily_breakdown[row['date'].isoformat()] = {
                        'attendance_rate': round(float(row['attendance_rate']) if row['attendance_rate'] else 0, 1),
                        'occupancy_rate': round(float(row['occupancy_rate']) if row['occupancy_rate'] else 0, 1),
                        'attention_rate': round(float(row['attention_rate']) if row['attention_rate'] else 0, 1)
                    }
                metrics.daily_breakdown = daily_breakdown
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating metrics: {str(e)}")
            raise
        finally:
            if conn:
                await conn.close()
    
    async def _create_report_record(self, title: str, description: str, report_date: date, 
                                  bootcamp_id: Optional[int], user_id: Optional[str], 
                                  metrics: ReportMetrics, date_range_start: Optional[date] = None, 
                                  date_range_end: Optional[date] = None) -> str:
        """Create report record in database"""
        conn = None
        try:
            conn = await get_db_connection()
            
            # Insert report
            report_query = """
                INSERT INTO reports (title, description, report_date, date_range_start, date_range_end, bootcamp_id, generated_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            """
            
            user_uuid = uuid.UUID(user_id) if user_id else None
            report_id = await conn.fetchval(report_query, title, description, report_date, 
                                          date_range_start, date_range_end, bootcamp_id, user_uuid)
            
            # Insert report data
            data_query = """
                INSERT INTO report_data (
                    report_id, total_students, total_sessions, average_attendance_rate, 
                    average_grade, average_occupancy_rate, average_attention_rate, 
                    average_distraction_rate, peak_occupancy_rate, min_occupancy_rate,
                    bootcamp_performance, daily_breakdown
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            """
            
            await conn.execute(data_query, report_id, metrics.total_students, metrics.total_sessions,
                             metrics.average_attendance_rate, metrics.average_grade,
                             metrics.average_occupancy_rate, metrics.average_attention_rate,
                             metrics.average_distraction_rate, metrics.peak_occupancy_rate,
                             metrics.min_occupancy_rate, 
                             json.dumps(decimal_to_float(metrics.bootcamp_performance)) if metrics.bootcamp_performance else '{}',
                             json.dumps(decimal_to_float(metrics.daily_breakdown)) if metrics.daily_breakdown else '{}')
            
            return str(report_id)
            
        except Exception as e:
            logger.error(f"Error creating report record: {str(e)}")
            raise
        finally:
            if conn:
                await conn.close()
    
    async def _update_report_file_path(self, report_id: str, file_path: str):
        """Update report with generated file path"""
        conn = None
        try:
            conn = await get_db_connection()
            
            query = "UPDATE reports SET file_path = $1 WHERE id = $2"
            await conn.execute(query, file_path, uuid.UUID(report_id))
            
        except Exception as e:
            logger.error(f"Error updating report file path: {str(e)}")
            raise
        finally:
            if conn:
                await conn.close()
    
    async def _generate_pdf(self, report_id: str, metrics: ReportMetrics, 
                          start_date: date, end_date: date) -> str:
        """Generate PDF report"""
        try:
            filename = f"report_{report_id}_{start_date.strftime('%Y%m%d')}.pdf"
            file_path = os.path.join(self.reports_dir, filename)
            
            # Create PDF document
            doc = SimpleDocTemplate(file_path, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=TA_CENTER
            )
            
            if start_date == end_date:
                title = f"Daily Report - {start_date.strftime('%B %d, %Y')}"
            else:
                title = f"Report - {start_date.strftime('%b %d')} to {end_date.strftime('%b %d, %Y')}"
            
            story.append(Paragraph(title, title_style))
            story.append(Spacer(1, 20))
            
            # Summary metrics table
            summary_data = [
                ['Metric', 'Value'],
                ['Total Students', str(metrics.total_students)],
                ['Total Sessions', str(metrics.total_sessions)],
                ['Average Attendance', f"{metrics.average_attendance_rate:.1f}%"],
                ['Average Grade', f"{metrics.average_grade:.1f}"],
                ['Average Occupancy', f"{metrics.average_occupancy_rate:.1f}%"],
                ['Average Attention', f"{metrics.average_attention_rate:.1f}%"],
                ['Peak Occupancy', f"{metrics.peak_occupancy_rate:.1f}%"]
            ]
            
            summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(Paragraph("Summary Metrics", styles['Heading2']))
            story.append(summary_table)
            story.append(Spacer(1, 20))
            
            # Bootcamp performance if available
            if metrics.bootcamp_performance:
                story.append(Paragraph("Bootcamp Performance", styles['Heading2']))
                
                bootcamp_data = [['Bootcamp', 'Students', 'Attendance Rate', 'Average Grade']]
                for bootcamp_id, data in metrics.bootcamp_performance.items():
                    bootcamp_data.append([
                        data['name'],
                        str(data['students']),
                        f"{data['attendance_rate']:.1f}%",
                        f"{data['average_grade']:.1f}"
                    ])
                
                bootcamp_table = Table(bootcamp_data, colWidths=[2*inch, 1*inch, 1.5*inch, 1.5*inch])
                bootcamp_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(bootcamp_table)
                story.append(Spacer(1, 20))
            
            # Generate timestamp
            story.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", styles['Normal']))
            
            # Build PDF
            doc.build(story)
            
            return file_path
            
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            raise

# Create singleton instance
reports_service = ReportsService()
