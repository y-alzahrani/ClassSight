"""
YOLO-based student attention detection service
Processes classroom images/video to detect student attention levels
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
from pathlib import Path
import asyncio
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class YOLOAttentionDetector:
    # My YOLO setup for detecting if students are paying attention
    
    def __init__(self, model_path: Optional[str] = None):
        # Use the latest trained model by default
        self.model_path = model_path or "models/trained_models/best.pt"
        self.model = None
        self.confidence_threshold = 0.5
        self.nms_threshold = 0.4
        
        # Attention classes (customize based on your model)
        self.attention_classes = {
            0: "focused",
            1: "distracted", 
            2: "sleeping",
            3: "absent"
        }
        
    async def load_model(self):
        # Load up the YOLO model
        try:
            # Import here to avoid dependency issues if not installed
            from ultralytics import YOLO
            
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                logger.info(f"YOLO model loaded from {self.model_path}")
            else:
                # Fallback to base model in trained_models folder
                fallback_path = "models/trained_models/yolo11s.pt"
                if os.path.exists(fallback_path):
                    self.model = YOLO(fallback_path)
                    logger.warning(f"Custom model not found, using base model: {fallback_path}")
                else:
                    # Final fallback to YOLOv8 pretrained model
                    self.model = YOLO('yolov8n.pt')
                    logger.warning(f"No local models found, using YOLOv8 base model")
                
        except ImportError:
            logger.error("ultralytics package not installed. Install with: pip install ultralytics")
            raise
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise
    
    async def detect_attention(self, image_path: str) -> Dict[str, Any]:
        """
        Detect student attention levels in classroom image
        
        Args:
            image_path: Path to classroom image
            
        Returns:
            Dict containing detection results and attention metrics
        """
        if not self.model:
            await self.load_model()
            
        try:
            # Run inference
            results = self.model(image_path, conf=self.confidence_threshold)
            
            # Process results
            detections = []
            attention_counts = {
                "focused": 0,
                "distracted": 0, 
                "sleeping": 0,
                "absent": 0
            }
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        # Map class to attention state
                        attention_state = self.attention_classes.get(class_id, "unknown")
                        
                        detection = {
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "confidence": float(confidence),
                            "attention_state": attention_state,
                            "class_id": class_id
                        }
                        detections.append(detection)
                        
                        # Update counts
                        if attention_state in attention_counts:
                            attention_counts[attention_state] += 1
            
            # Calculate metrics
            total_students = sum(attention_counts.values())
            attention_rate = (attention_counts["focused"] / total_students * 100) if total_students > 0 else 0
            distraction_rate = ((attention_counts["distracted"] + attention_counts["sleeping"]) / total_students * 100) if total_students > 0 else 0
            
            return {
                "timestamp": datetime.now().isoformat(),
                "total_students": total_students,
                "attention_rate": round(attention_rate, 2),
                "distraction_rate": round(distraction_rate, 2),
                "attention_counts": attention_counts,
                "detections": detections,
                "image_path": image_path
            }
            
        except Exception as e:
            logger.error(f"Error during attention detection: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "image_path": image_path
            }
    
    async def process_video_stream(self, video_source: str, output_dir: str = "frames") -> List[Dict[str, Any]]:
        """
        Process video stream for real-time attention monitoring
        
        Args:
            video_source: Video file path or camera index
            output_dir: Directory to save processed frames
            
        Returns:
            List of detection results for each frame
        """
        results = []
        
        try:
            cap = cv2.VideoCapture(video_source)
            frame_count = 0
            
            # Create output directory
            Path(output_dir).mkdir(exist_ok=True)
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Save frame
                frame_path = f"{output_dir}/frame_{frame_count:06d}.jpg"
                cv2.imwrite(frame_path, frame)
                
                # Process every 5th frame for efficiency
                if frame_count % 5 == 0:
                    result = await self.detect_attention(frame_path)
                    result["frame_number"] = frame_count
                    results.append(result)
                
                frame_count += 1
                
            cap.release()
            
        except Exception as e:
            logger.error(f"Error processing video stream: {e}")
            
        return results
    
    def calculate_session_metrics(self, detection_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate overall session metrics from multiple detections
        
        Args:
            detection_results: List of detection results from frames
            
        Returns:
            Aggregated session metrics
        """
        if not detection_results:
            return {}
            
        # Filter valid results
        valid_results = [r for r in detection_results if "error" not in r]
        
        if not valid_results:
            return {"error": "No valid detection results"}
        
        # Calculate averages
        total_frames = len(valid_results)
        avg_students = sum(r["total_students"] for r in valid_results) / total_frames
        avg_attention = sum(r["attention_rate"] for r in valid_results) / total_frames
        avg_distraction = sum(r["distraction_rate"] for r in valid_results) / total_frames
        
        # Find peak values
        max_attention = max(r["attention_rate"] for r in valid_results)
        min_attention = min(r["attention_rate"] for r in valid_results)
        max_distraction = max(r["distraction_rate"] for r in valid_results)
        min_distraction = min(r["distraction_rate"] for r in valid_results)
        
        return {
            "session_start": valid_results[0]["timestamp"],
            "session_end": valid_results[-1]["timestamp"],
            "total_frames_processed": total_frames,
            "avg_students_count": round(avg_students, 1),
            "avg_attention_rate": round(avg_attention, 2),
            "avg_distraction_rate": round(avg_distraction, 2),
            "max_attention_rate": round(max_attention, 2),
            "min_attention_rate": round(min_attention, 2),
            "max_distraction_rate": round(max_distraction, 2),
            "min_distraction_rate": round(min_distraction, 2)
        }

# Global instance
_yolo_detector = None

def get_yolo_detector() -> YOLOAttentionDetector:
    # Just returns my YOLO detector instance
    global _yolo_detector
    
    if _yolo_detector is None:
        model_path = os.getenv("YOLO_MODEL_PATH", "models/attention_model.pt")
        _yolo_detector = YOLOAttentionDetector(model_path)
        
    return _yolo_detector
