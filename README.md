# ClassSight: AI-Powered Classroom Monitoring System

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![YOLO](https://img.shields.io/badge/YOLO-v11-red.svg)](https://github.com/ultralytics/ultralytics)

## Project Overview

ClassSight is an AI-powered classroom monitoring system that enables teachers and administrators to track student engagement and performance. It was developed as a capstone project for the **Tuwaiq Academy Data Science and Machine Learning Bootcamp**. Built on a Raspberry Pi 5 equipped with a camera, it uses an on-device YOLO-based computer vision model to detect student attention levels and monitor attendance without storing raw video, preserving privacy.

The system generates half-hourly attention and attendance reports, accessible via a web dashboard. Additionally, a RAG-based AI assistant integrated into the platform allows educators to retrieve individual assessment scores and course-level performance summaries on demand.

By providing actionable insights, ClassSight empowers educators to proactively improve classroom focus and support student learning — contributing to Saudi Arabia’s Vision 2030 goals for digital transformation in education.

### Key Capabilities

- **Attention Detection**: Automatically detects focused and distracted
- **Attendance Tracking**: Counts students present in the classroom
- **Real-time Analytics**: Live dashboard with engagement metrics
- **Historical Analysis**: Tracks patterns over time (hourly, daily, and weekly views)
- **Automated Reports**: Generates PDF summaries of student attendance and attention levels
- **AI Insights**: Chat interface for querying classroom data

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

1. **Image Capture**: Raspberry Pi camera captures classroom images at 5-second intervals
2. **Behavior Detection**: YOLO model analyzes the images to detect student attention states:
   - Attentive (actively engaged)
   - Distracted (looking away, using mobile phone)
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

### Dashboard
- Attention/distraction percentages
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
- **Behavior Detection**: Focuses on posture and head position, not facial expressions

## Authors

- [Khalid Alshahrani](https://github.com/khalidaldoh)
- [Maram Alshammary](https://github.com/romey101)
- [Munirah AlOtaibi](https://github.com/MunirahAlOtaibi)
- [Raghad Alshanar](https://github.com/raghadsultansh)
- [Yazeed Alzahrani](https://github.com/y-alzahrani)

## Acknowledgments

This project is a capstone for the **Tuwaiq Academy Data Science and Machine Learning Bootcamp**, demonstrating:

- Computer vision and deep learning implementation
- Full-stack web development
- Near real-time data processing
- Edge computing with Raspberry Pi
- Database design and analytics
- User interface development

Special thanks to our supervisor **Mr. Hany Elshafey** for his guidance. We also thank the **Data Science and Machine Learning** class for supporting our work. 

## Contributing

This project was developed for educational purposes. For questions or collaboration:

- **Institution**: Tuwaiq Academy
- **Program**: Data Science and Machine Learning Bootcamp
- **Repository**: [GitHub Repository](https://github.com/y-alzahrani/ClassSight/)

## License

Developed as part of coursework at Tuwaiq Academy.
