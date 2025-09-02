from pydantic import BaseModel
from datetime import date

class ClassroomSyntheticData(BaseModel):
    date: date
    day_of_week: str
    start_time: str
    end_time: str
    students_enrolled: int
    avg_students_no: float
    max_students_no: float
    min_students_no: float
    attendance_pct: float
    avg_attention_rate: float
    max_attention_rate: float
    min_attention_rate: float
    avg_distraction_rate: float
    max_distraction_rate: float
    min_distraction_rate: float 