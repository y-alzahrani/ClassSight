# ClassSight: AI-Powered Classroom Monitoring System

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![YOLO](https://img.shields.io/badge/YOLO-v11-red.svg)](https://github.com/ultralytics/ultralytics)

## Project Overview

ClassSight is an AI-powered classroom monitoring system developed to help teachers and administrators track student engagement and performance. The system runs on a Raspberry Pi 5 equipped with a camera and leverages an on-device YOLO-based computer vision model to detect student attention levels and presence in the classroom.

The system generates attention and attendance reports every 30 minutes, which are accessible via a web dashboard. Additionally, the platform integrates a RAG-based AI assistant that enables educators to retrieve individual student grades, attendance data, and class-level summaries through natural language queries.

By providing actionable insights, ClassSight empowers educators to proactively improve classroom focus and support student learning, contributing to Saudi Arabia’s Vision 2030 goals for digital transformation in education.

## Key Capabilities

- **Attention Detection**: Automatically identifies focused and distracted students
- **Attendance Tracking**: Detects and counts students present in the classroom
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
                                        Next.js Dashboard (visualizations) ← RAG Assistant (query interface)
```

## Model Performance

The YOLO model was trained on a modest dataset of 412 labeled images to classify students as either attentive or distracted. It achieved the following results:

| Class      | Precision | Recall | mAP@0.5 | mAP@0.5:0.95 |
|------------|-----------|--------|---------|--------------|
| Attentive  | 81.7%     | 93.4%  | 93.6%   | 66.2%        |
| Distracted | 83.1%     | 75.2%  | 85.3%   | 54.4%        |
| **Overall**| 82.4%     | 84.3%  | 89.5%   | 60.3%        |

These results demonstrate the model’s reliability in localizing students and distinguishing between attention states, with particularly strong performance in detecting engaged (attentive) students. With a larger dataset, further improvements in accuracy are expected.

## How It Works

1. **Image Capture**: The Raspberry Pi camera captures classroom images every second
2. **Behavior Detection**: A YOLOv11 model analyzes each image to detect student attention states:
   - **Attentive** – Actively engaged and focused
   - **Distracted** – Looking away, using a phone, or showing off-task behavior
3. **Data Processing**: The Fast API backend aggregates metrics (e.g. average student count, maximum distraction rate) and stores them in the PostgreSQL database
4. **Visualization**: The dashboard displays both half-hourly summaries and historical engagement information
5. **Reporting**: Automatically generates PDF reports for educators and administrators, summarizing attention and attendance patterns

## Project Structure

```

ClassSight/
│
├── .gitignore
├── .gitattributes
├── README.md
│
└── backend/
    ├── ai_assistant/
    │   ├── final_rag/
    │   │   ├── __init__.py
    │   │   ├── embedder.py
    │   │   └── retriever.py
    │   │
    │   ├── langchain_based_rag/
    |   |   ├── __init__.py
    │   │   └── rag_service.py
    │   │
    │   └── sql_agent/
    |       ├── __init__.py
    │       └── sql_agent.py
    │
    ├── yolo_model/
    │   ├── __init__.py
    │   ├── data_models.py
    │   └── yolo_service.py
    │
    ├── database.py     
    ├── models.py
    ├── check_dependencies.py
    ├── main.py
    └── .env.template

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

## Limitations

- **No Individual Identification**: The system analyzes student behavior but does not identify or track individual students
- **Behavior Detection**: Detection is based on head pose and body posture; facial expressions and eye gaze direction are not analyzed

## Authors

- [Khalid Alshahrani](https://github.com/khalidaldoh)
- [Maram Alshammary](https://github.com/romey101)
- [Munirah AlOtaibi](https://github.com/MunirahAlOtaibi)
- [Raghad Alshanar](https://github.com/raghadsultansh)
- [Yazeed Alzahrani](https://github.com/y-alzahrani)

## Acknowledgments

This project was developed as a capstone for the **Tuwaiq Academy Data Science and Machine Learning Bootcamp**, demonstrating:

- Computer vision and deep learning for student behavior recognition
- Edge computing with Raspberry Pi and camera modules
- Scheduled data aggregation and visual reporting
- Interactive and responsive user interface design
- Full-stack web development using FastAPI and Next.js
- Relational database design, analytics, and storage with PostgreSQL
- Integration of a RAG assistant

Special thanks to our supervisor **Mr. Hany Elshafey** for his guidance and support. We also thank **Tuwaiq Acedemy** and the **Data Science and Machine Learning** class for supporting our work. 

## Contributing

This project was developed for educational purposes. For questions or collaboration:

- **Institution**: Tuwaiq Academy
- **Program**: Data Science and Machine Learning Bootcamp
- **Repository**: [GitHub Repository](https://github.com/y-alzahrani/ClassSight/)

## License

This project was developed as part of coursework at **Tuwaiq Academy**.  
All rights reserved.
