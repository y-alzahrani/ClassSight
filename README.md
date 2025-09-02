# ClassSight: AI-Powered Classroom Analytics Platform

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![YOLO](https://img.shields.io/badge/YOLO-v11-red.svg)](https://github.com/ultralytics/ultralytics)

ClassSight is an AI-powered classroom monitoring system that uses computer vision to track student attention levels and attendance patterns. Developed as a capstone project for the **Tuwaiq Academy Data Science and Machine Learning Bootcamp**.

## Project Overview

ClassSight helps educators and administrators monitor classroom engagement by automatically detecting and analyzing student behavior patterns in real-time. The system provides aggregate analytics about attention levels without identifying individual students.

### Key Capabilities

- **Attention Detection**: Automatically detects focused, distracted, and sleeping students
- **Attendance Tracking**: Counts students present in the classroom
- **Real-time Analytics**: Live dashboard with engagement metrics
- **Historical Analysis**: Track patterns over time (hourly, daily, weekly views)
- **Automated Reports**: Generate PDF summaries of classroom performance
- **AI Insights**: Chat interface for querying classroom data

### Hardware Setup

- **Raspberry Pi 5** (8GB RAM) - Main processing unit
- **Camera Module 3** - Image capture for classroom monitoring
- Standard classroom installation with overhead view

## Technology Stack

### Backend
- **FastAPI** - Python web framework for API services
- **YOLO v11** - Computer vision model for student behavior detection
- **PostgreSQL** - Database with Supabase integration
- **OpenAI Integration** - RAG system for intelligent data queries

### Frontend
- **Next.js 14** - React framework with TypeScript
- **Tailwind CSS** - Styling and responsive design
- **Recharts** - Data visualization components

### Hardware
- **Raspberry Pi 5** (8GB RAM) for edge computing
- **Camera Module 3** for high-quality image capture

## System Architecture

```
Camera Feed → YOLO Detection → FastAPI Backend → PostgreSQL Database
                                      ↓
                             Next.js Dashboard ← RAG Chat System
```

## How It Works

1. **Image Capture**: Raspberry Pi camera captures classroom images at regular intervals
2. **Behavior Detection**: YOLO model analyzes images to detect student attention states:
   - Focused (actively engaged)
   - Distracted (looking away, off-task)
   - Sleeping (head down, disengaged)
   - Absent (empty seats)
3. **Data Analysis**: Backend calculates aggregate metrics and stores in database
4. **Visualization**: Dashboard displays real-time and historical analytics
5. **Reporting**: Generate comprehensive reports for educators and administrators

## Quick Start

### Backend Setup

```bash
cd classsight/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Check all dependencies
python check_dependencies.py

# Start server
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd classsight

# Install dependencies
npm install

# Start development server
npm run dev
```

### YOLO Model Setup

```bash
# Update to latest trained model
.\update_models.ps1

# Verify model loading
python -c "from models.yolo_service import YOLOAttentionDetector; print('YOLO ready!')"
```

## Features

### Real-time Dashboard
- Live attention and distraction percentages
- Student count tracking
- Session-by-session breakdown
- Multiple view modes (hourly, daily, weekly)

### Analytics & Reporting
- Historical trend analysis
- Peak performance identification
- Correlation between attendance and attention
- Automated PDF report generation

### AI Chat Interface
- Natural language queries about classroom data
- Intelligent insights and recommendations
- Historical data analysis

## API Endpoints

```
GET /api/classroom-data          # Raw classroom session data
GET /api/attention-distraction   # Attention vs distraction metrics
GET /api/students               # Student count analytics
GET /api/correlation-insights   # Attendance/attention correlations
POST /api/chat                  # RAG chat interface
```

## Project Structure

```
classsight/
├── backend/                    # FastAPI backend
│   ├── main.py                # API endpoints
│   ├── models/yolo_service.py # YOLO detection service
│   ├── rag_service.py         # AI chat functionality
│   ├── services.py            # Analytics services
│   └── requirements.txt       # Python dependencies
├── src/                       # Next.js frontend
│   ├── app/                   # Pages and routing
│   └── components/            # UI components
├── update_models.ps1          # Model management script
└── README.md
```

## Important Limitations

- **No Individual Identification**: System detects behavior patterns but does not identify specific students
- **Aggregate Data Only**: All analytics are based on overall classroom metrics
- **Privacy Focused**: No facial recognition or personal data collection
- **Behavior Detection**: Focuses on posture and head position, not facial expressions

## Academic Context

This project is a capstone for the **Tuwaiq Academy Data Science and Machine Learning Bootcamp**, demonstrating:

- Computer vision and deep learning implementation
- Full-stack web development
- Real-time data processing
- Edge computing with Raspberry Pi
- Database design and analytics
- User interface development

## Contributing

This is an academic project developed for educational purposes. For questions or collaboration:

- **Institution**: Tuwaiq Academy
- **Program**: Data Science and Machine Learning Bootcamp
- **Repository**: [GitHub Repository](https://github.com/raghadsultansh/classsight)

## License

Developed as part of academic coursework at Tuwaiq Academy.
