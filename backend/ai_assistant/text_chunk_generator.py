import os
import json
import psycopg2
from openai import OpenAI
from dotenv import load_dotenv
import numpy as np

# Load credentials
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_KEY)
EMBED_MODEL = "text-embedding-3-small"
ALLOWED_TABLES = {"TABLE_1", "TABLE_2"}
target_table = "CHOOSE_A_TABLE"

def get_text_embedding(text):
    """Generate a normalized embedding vector for the given text using an embedding model."""
    response = client.embeddings.create(
        model=EMBED_MODEL,
        input=text
    )
    vec = np.array(response.data[0].embedding)
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec.tolist()  # edge case: zero vector
    return (vec / norm).tolist()  # normalized for cosine similarity

def chunk_exists(cur, text, source, target_table):
    """Check if a chunk with the same text and source already exists in the target table."""
    cur.execute(f"""
        SELECT 1 FROM {target_table}
        WHERE chunk_text = %s AND metadata->>'source' = %s
        LIMIT 1;
    """, (text, source))
    return cur.fetchone() is not None

def generate_chunks():
    """Extract and format new data from the database into RAG-ready text chunks with metadata."""

    chunks = []
    with (psycopg2.connect(DB_URL) as conn):
        with conn.cursor() as cur:
            # 1. Individual assessment result chunks
            cur.execute("""
                SELECT
                  s.full_name, b.bootcamp_name, u.unit_title,
                  a.assessment_title, g.score, a.max_score, a.weight, a.due_date,
                  s.student_id, u.unit_id, b.bootcamp_id
                FROM grades g
                JOIN assessments a ON g.assessment_id = a.assessment_id
                JOIN units u ON a.unit_id = u.unit_id
                JOIN students s ON g.student_id = s.student_id
                JOIN bootcamps b ON s.bootcamp_id = b.bootcamp_id
                ORDER BY s.student_id, a.due_date;
            """)
            for row in cur.fetchall():
                text = f"""{row[0]} scored {row[4]} out of {row[5]} in "{row[3]}" ({round(row[6]*100, 1)}% weighting) for the "{row[2]}" unit of the "{row[1]}" bootcamp, due on {row[7]}."""
                metadata = {
                    "student": row[0],
                    "unit": row[2],
                    "bootcamp": row[1],
                    "assessment": row[3],
                    "score": row[4],
                    "max_score": row[5],
                    "weight": float(row[6]),
                    "due_date": str(row[7]),
                    "student_id": row[8],
                    "unit_id": row[9],
                    "bootcamp_id": row[10],
                    "source": "assessment_result"
                }
                chunks.append({"text": text, "metadata": metadata})

            # 2. Daily attendance record chunks
            cur.execute("""
                SELECT
                  s.full_name, b.bootcamp_name, u.unit_title,
                  a.status, a.date,
                  s.student_id, u.unit_id, b.bootcamp_id
                FROM attendance a
                JOIN students s ON a.student_id = s.student_id
                JOIN units u ON a.unit_id = u.unit_id
                JOIN bootcamps b ON s.bootcamp_id = b.bootcamp_id
                ORDER BY s.student_id, a.date;
            """)
            for row in cur.fetchall():
                text = f"""{row[0]} was {row[3]} on {row[4]} during the "{row[2]}" unit of the "{row[1]}" bootcamp."""
                metadata = {
                    "student": row[0],
                    "unit": row[2],
                    "bootcamp": row[1],
                    "status": row[3],
                    "date": str(row[4]),
                    "student_id": row[5],
                    "unit_id": row[6],
                    "bootcamp_id": row[7],
                    "source": "daily_attendance"
                }
                chunks.append({"text": text, "metadata": metadata})

            # 3. Grade summary per bootcamp per student
            cur.execute("""
                SELECT
                  s.full_name, b.bootcamp_name, s.student_id, b.bootcamp_id,
                  json_object_agg(u.unit_title, scores ORDER BY u.unit_title),
                  a.weight
                FROM (
                  SELECT
                    g.student_id, a.unit_id, array_agg(g.score ORDER BY g.score) AS scores
                  FROM grades g
                  JOIN assessments a ON g.assessment_id = a.assessment_id
                  GROUP BY g.student_id, a.unit_id
                ) sub
                JOIN units u ON sub.unit_id = u.unit_id
                JOIN students s ON sub.student_id = s.student_id
                JOIN bootcamps b ON s.bootcamp_id = b.bootcamp_id
                JOIN assessments a ON a.unit_id = u.unit_id
                GROUP BY s.full_name, b.bootcamp_name, s.student_id, b.bootcamp_id, a.weight;
            """)
            for row in cur.fetchall():
                student, bootcamp, student_id, bootcamp_id, unit_scores, weight = row
                unit_lines = [f"- {unit}: {', '.join(map(str, scores))}" for unit, scores in unit_scores.items()]
                total_text = f"""{student}'s grades in the "{bootcamp}" bootcamp:\n""" + "\n".join(unit_lines) + f"\nEach assessment has a weight of {round(weight*100, 1)}%."
                metadata = {
                    "student": student,
                    "bootcamp": bootcamp,
                    "grades": unit_scores,
                    "weight": float(weight),
                    "student_id": student_id,
                    "bootcamp_id": bootcamp_id,
                    "source": "grades_summary"
                }
                chunks.append({"text": total_text, "metadata": metadata})

            # 4. Attendance summary per bootcamp per student
            cur.execute("""
                SELECT
                  s.full_name,
                  b.bootcamp_name,
                  s.student_id,
                  b.bootcamp_id,
                  json_object_agg(att.unit_title, att.unit_attendance),
                  SUM((att.unit_attendance->>'present')::int) AS total_present,
                  SUM((att.unit_attendance->>'absent')::int) AS total_absent
                FROM (
                    SELECT
                      a.student_id,
                      u.unit_id,
                      u.unit_title,
                      json_build_object(
                        'present', COUNT(*) FILTER (WHERE a.status = 'present'),
                        'absent', COUNT(*) FILTER (WHERE a.status = 'absent')
                      ) AS unit_attendance
                    FROM attendance a
                    JOIN units u ON a.unit_id = u.unit_id
                    GROUP BY a.student_id, u.unit_id, u.unit_title
                ) att
                JOIN students s ON s.student_id = att.student_id
                JOIN bootcamps b ON s.bootcamp_id = b.bootcamp_id
                GROUP BY s.full_name, b.bootcamp_name, s.student_id, b.bootcamp_id;
            """)
            for row in cur.fetchall():
                student, bootcamp, student_id, bootcamp_id, unit_attendance, total_present, total_absent = row
                unit_lines = [
                    f"- {unit}: {info['present']} days present, {info['absent']} days absent"
                    for unit, info in unit_attendance.items()
                ]
                total_text = f"""{student}'s attendance breakdown in the "{bootcamp}" bootcamp:\n""" + "\n".join(unit_lines) + f"\nTotal: {total_present} days present, {total_absent} days absent"
                metadata = {
                    "student": student,
                    "bootcamp": bootcamp,
                    "attendance": unit_attendance,
                    "total_present": total_present,
                    "total_absent": total_absent,
                    "student_id": student_id,
                    "bootcamp_id": bootcamp_id,
                    "source": "attendance_summary"
                }
                chunks.append({"text": total_text, "metadata": metadata})

            cur.execute("""
                SELECT
                  date, day_of_week, start_time, end_time,
                  attendance_pct, avg_attention_rate, max_attention_rate, min_attention_rate,
                  avg_distraction_rate, max_distraction_rate, min_distraction_rate
                FROM classroom_synthetic_data_filtered
                ORDER BY date, start_time;
            """)

            for row in cur.fetchall():
                date, day_name, start_time, end_time, attn_pct, avg_focus, max_focus, min_focus, avg_dist,\
                    max_dist, min_dist = row
                text = f"""On {day_name}, {date} from {start_time} to {end_time}:
            - Average attendance: {round(attn_pct)}%
            - Average attention rate: {round(avg_focus)}%
            - Maximum attention rate: {round(max_focus)}%
            - Minimum attention rate: {round(min_focus)}%
            - Average distraction rate: {round(avg_dist)}%
            - Maximum distraction rate: {round(max_dist)}%
            - Minimum distraction rate: {round(min_dist)}%"""

                metadata = {
                    "date": str(date),
                    "day_of_week": day_name,
                    "start_time": str(start_time),
                    "end_time": str(end_time),
                    "attendance_pct": float(attn_pct),
                    "avg_attention_rate": float(avg_focus),
                    "max_attention_rate": float(max_focus),
                    "min_attention_rate": float(min_focus),
                    "avg_distraction_rate": float(avg_dist),
                    "max_distraction_rate": float(max_dist),
                    "min_distraction_rate": float(min_dist),
                    "source": "classroom_synthetic_data_filtered"
                }

                chunks.append({"text": text, "metadata": metadata})
    return chunks

def insert_chunks(chunks, target_table):
    """Insert unique text chunks and their embeddings into the specified RAG table, avoiding duplicates."""

    inserted = 0
    skipped = 0
    if target_table not in ALLOWED_TABLES:
        raise ValueError(f"Invalid table name: {target_table}")

    with psycopg2.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            for i, chunk in enumerate(chunks, start=1):
                text = chunk["text"]
                metadata_json = json.dumps(chunk["metadata"])
                source = chunk["metadata"]["source"]

                # Only insert if not already present
                if not chunk_exists(cur, text, source, target_table):
                    embedding = get_text_embedding(text)
                    cur.execute(f"""
                        INSERT INTO {target_table} (chunk_text, embedding, metadata)
                        VALUES (%s, %s, %s);
                    """, (text, embedding, metadata_json))
                    inserted += 1
                    print(f"Inserted {inserted}: {source}")
                else:
                    skipped += 1

        conn.commit()
        print(f"Finished inserting chunks into {target_table}.")
        print(f"{inserted} new chunks were inserted.")
        print(f"{skipped} chunks already existed and were skipped.")

if __name__ == "__main__":
    chunks = generate_chunks()
    insert_chunks(chunks, target_table)
