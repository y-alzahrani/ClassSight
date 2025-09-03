# ClassSight: AI-Powered Classroom Monitoring System

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![YOLO](https://img.shields.io/badge/YOLO-v11-red.svg)](https://github.com/ultralytics/ultralytics)

## Project Overview

ClassSight is an AI-powered classroom monitoring system that enables teachers and administrators to track student engagement and performance. It was developed as a capstone project for the **Tuwaiq Academy Data Science and Machine Learning Bootcamp**. Built on a Raspberry Pi 5 equipped with a camera, it uses an on-device YOLO-based computer vision model to detect student attention levels and monitor attendance without storing raw video, preserving privacy.

The system generates half-hourly attention and attendance reports, accessible via a web dashboard. Additionally, a RAG-based AI assistant integrated into the platform allows educators to retrieve individual assessment scores and course-level performance summaries on demand.

By providing actionable insights, ClassSight empowers educators to proactively improve classroom focus and support student learning, contributing to Saudi Arabia’s Vision 2030 goals for digital transformation in education.

## Key Capabilities

- **Attention Detection**: Automatically identifies focused and distracted students
- **Attendance Tracking**: Detects abd counts students present in the classroom
- **Engagement Dashboard**: Automatically updates every 30 minutes with the latest attention and attendance metrics
- **Historical Analysis**: Visualizes trends over time (hourly, daily, and weekly)
- **AI Insights**: Enables natural-language queries via a chat interface
- **Automated Reports**: Generates PDF summaries of attendance and attention

## Technology Stack

### Backend
- **FastAPI** – Python web framework for building API services
- **YOLOv11** – Real-time object detection model for monitoring student behavior
- **PostgreSQL** – Relational database with Supabase integration for data management
- **OpenAI Integration** – RAG (Retrieval-Augmented Generation) system for intelligent querying of classroom data

### Frontend
- **Next.js 14** – React framework with TypeScript for server-side rendering and routing
- **Tailwind CSS** – CSS framework for responsive UI design
- **Recharts** – Charting library for rendering interactive visualizations

### Hardware
- **Raspberry Pi 5** (8GB RAM) – On-device edge computing platform
- **Camera Module 3** – high-resolution camera for image capture

## System Architecture

```
Camera Feed → YOLOv11 (student detection) → FastAPI (processing & API) → PostgreSQL (storage)  
                         ↓
           Next.js Dashboard (visualizations) ← RAG Chatbot (query interface)
```

## How It Works

1. **Image Capture**: The Raspberry Pi camera captures classroom images every 5 seconds
2. **Behavior Detection**: A YOLOv11 model analyzes each image to detect student attention states:
   - **Attentive** – Actively engaged and focused
   - **Distracted** – Looking away, using a phone, or showing off-task behavior
3. **Data Processing**: The Fast API backend aggregates metrics (e.g. average student count, maximum distraction rate) and stores them in the PostgreSQL database
4. **Visualization**: The dashboard displays both half-hourly summaries and historical engagement information
5. **Reporting**: Automatically generates PDF reports for educators and administrators, summarizing attention and attendance patterns

## Project Structure

```
classsight/
├── backend/                     # FastAPI backend
│   ├── main.py                  # API endpoints
│   ├── models/yolo_service.py   # YOLO detection service
│   ├── rag_service.py           # AI chatbot logic
│   ├── services.py              # Analytics and aggregation functions
│   └── requirements.txt         # Python dependency list
├── src/                         # Next.js frontend
│   ├── app/                     # Pages and routing
│   └── components/              # UI components
├── update_models.ps1            # Model management script
└── README.md                    # Project overview and documentation
```

## Quick Start

### Backend Setup

```bash
cd classsight/backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Optional: Check environment and dependencies
python check_dependencies.py

# Run the FastAPI backend server
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd classsight

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```

### YOLO Model Setup

```bash
# Pull the latest trained YOLO model
.\update_models.ps1

# Test if the model loads correctly
python -c "from models.yolo_service import YOLOAttentionDetector; print('YOLO ready!')"
```

## API Endpoints

```
GET /api/classroom-data          # Returns raw classroom session data
GET /api/attention-distraction   # Returns attention vs distraction metrics
GET /api/students                # Provides student count analytics
GET /api/correlation-insights    # Shows correlation between attendance and attention
POST /api/chat                   # Handles RAG-based chat queries
```

## Important Limitations

- **No Individual Identification**: The system analyzes student behavior but does not identify or track individual students
- **Aggregate-Level Insights**: All metrics are reported at the classroom level. No personal or student-specific analytics are provided
- **Behavior Detection**: Detection is based on head pose and body posture; facial expressions and eye contact are not analyzed

## Authors

- [Khalid Alshahrani](https://github.com/khalidaldoh)
- [Maram Alshammary](https://github.com/romey101)
- [Munirah AlOtaibi](https://github.com/MunirahAlOtaibi)
- [Raghad Alshanar](https://github.com/raghadsultansh)
- [Yazeed Alzahrani](https://github.com/y-alzahrani)

## Acknowledgments

This project is a capstone for the **Tuwaiq Academy Data Science and Machine Learning Bootcamp**, demonstrating:

- Computer vision and deep learning for behavior recognition
- Periodic data aggregation and visual reporting based on 5-second frame analysis
- Edge computing using Raspberry Pi and camera modules
- Full-stack web development with FastAPI and Next.js
- Relational database design, analytics, and storage with PostgreSQL
- Interactive and responsive user interface design
- Integration of AI-powered RAG chatbot

Special thanks to our supervisor **Mr. Hany Elshafey** for his guidance. We also thank the **Data Science and Machine Learning** class for supporting our work. 

## Contributing

This project was developed for educational purposes. For questions or collaboration:

- **Institution**: Tuwaiq Academy
- **Program**: Data Science and Machine Learning Bootcamp
- **Repository**: [GitHub Repository](https://github.com/y-alzahrani/ClassSight/)

## License

This project was developed as part of coursework at **Tuwaiq Academy**.  
All rights reserved.
