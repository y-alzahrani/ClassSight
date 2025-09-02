# rag_service_v2.py - New SQL-based RAG system with fallback to legacy system
import openai
import psycopg2
from supabase import create_client, Client
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import logging
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

INCLUDED_TABLES = ["students", "bootcamps", "units", "assessments", "grades", "attendance"]

# Import legacy RAG service for fallback
from rag_service import RAGService as LegacyRAGService, get_rag_service as get_legacy_rag_service

logger = logging.getLogger(__name__)

class RAGServiceV2:
    """New SQL-based RAG service with fallback to legacy system"""
    
    def __init__(self):
        """Initialize the new RAG service with environment variables"""
        # Get configuration from environment variables
        self.db_url = os.getenv("DATABASE_URL")
        self.supabase_url = os.getenv("SUPABASE_URL") 
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        # Validate required environment variables
        if not all([self.db_url, self.supabase_url, self.supabase_key, self.openai_api_key]):
            missing = []
            if not self.db_url: missing.append("DATABASE_URL")
            if not self.supabase_url: missing.append("SUPABASE_URL") 
            if not self.supabase_key: missing.append("SUPABASE_ANON_KEY")
            if not self.openai_api_key: missing.append("OPENAI_API_KEY")
            raise ValueError(f"Missing required environment variables: {missing}")
        
        # Initialize clients
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        openai.api_key = self.openai_api_key
        
        # Only use these tables for security
        self.included_tables = ["students", "bootcamps", "units", "assessments", "grades", "attendance"]
        
        # Initialize legacy RAG service for fallback
        self.legacy_rag_service = None
        self._legacy_initialized = False
        
        logger.info("RAG Service V2 initialized successfully")
    
    async def _get_legacy_service(self):
        """Get or initialize legacy RAG service for fallback"""
        if not self._legacy_initialized:
            try:
                self.legacy_rag_service = get_legacy_rag_service()
                await self.legacy_rag_service.initialize_vector_store()
                self._legacy_initialized = True
                logger.info("Legacy RAG service initialized for fallback")
            except Exception as e:
                logger.error(f"Failed to initialize legacy RAG service: {e}")
                self.legacy_rag_service = None
        return self.legacy_rag_service
    
    def fetch_live_schema(self, allowed_tables: List[str]) -> Dict[str, List[str]]:
        """Fetch live schema from PostgreSQL"""
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            placeholders = ",".join(["%s"] * len(allowed_tables))
            query = f"""
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name IN ({placeholders})
                ORDER BY table_name, ordinal_position;
            """
            cur.execute(query, allowed_tables)
            rows = cur.fetchall()
            cur.close()
            conn.close()

            schema = {}
            for table, column in rows:
                schema.setdefault(table, []).append(column)
            
            logger.info(f"Fetched schema for {len(schema)} tables")
            return schema
        except Exception as e:
            logger.error(f"Error fetching schema: {e}")
            raise

    def format_schema(self, schema: Dict[str, List[str]]) -> str:
        """Format schema for database queries"""
        return "\n".join(f"{table}({', '.join(cols)})" for table, cols in schema.items())

    async def generate_query_plan(self, question: str, schema_str: str) -> Dict[str, Any]:
        """Generate query plan based on user question"""
        prompt = f"""
Database schema available:

{schema_str}

Generate a query plan to answer the following question.
Return simple field names only, no SQL expressions.

Use raw JSON format:
{{
  "target_tables": [...],
  "suggested_fields": [...]
}}

Question: "{question}"
"""
        try:
            response = await asyncio.to_thread(
                openai.chat.completions.create,
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Return precise query plans in JSON format."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            raw = response.choices[0].message.content.strip()
            logger.debug(f"Raw GPT query plan output: {raw}")

            if raw.startswith("```"):
                raw = raw.strip("```json").strip("```").strip()

            parsed = json.loads(raw)
            
            # Validate required keys
            if not all(k in parsed for k in ("target_tables", "suggested_fields")):
                raise ValueError("Missing required keys in query plan")
            
            return parsed
            
        except Exception as e:
            logger.error(f"Error generating query plan: {e}")
            raise

    def run_dynamic_query(self, table: str, fields: List[str], schema: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        """Query Supabase for specific fields"""
        try:
            valid_columns = schema.get(table, [])
            
            # Clean fields - only allow simple column names
            clean_fields = [
                f for f in fields 
                if f in valid_columns and "(" not in f and "AS" not in f.upper()
            ]

            if not clean_fields:
                logger.warning(f"No valid fields for table '{table}', skipping")
                return []

            query = self.supabase.table(table).select(",".join(clean_fields))
            result = query.execute()
            
            logger.info(f"Queried {table} with fields {clean_fields}, got {len(result.data)} rows")
            return result.data
            
        except Exception as e:
            logger.error(f"Error querying table {table}: {e}")
            return []

    def build_reasoning_prompt(self, question: str, schema_str: str, data: Dict[str, List[Dict]]) -> str:
        """Build reasoning prompt for natural language processing"""
        # Get current date for context
        current_date = datetime.now().strftime("%Y-%m-%d")
        current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        context = f"""
Question: "{question}"

CURRENT CONTEXT:
- Today's date: {current_date}
- Current date and time: {current_datetime}
- Use this date as reference for time-based queries.

Database schema:
{schema_str}

Data from relevant tables:"""

        for table, rows in data.items():
            context += f"\n\nTable: {table} (total rows: {len(rows)})"
            # Show first few rows as examples
            for i, row in enumerate(rows[:5]):  # Limit to first 5 rows
                context += f"\n  {i+1}. {json.dumps(row)}"
            
            if len(rows) > 5:
                context += f"\n  ... and {len(rows) - 5} more rows"

        context += """

Instructions:
- Use the current date context for time-related questions.
- Calculate values from the provided data - do not give generic explanations.
- Connect tables using shared keys (student_id, unit_id, assessment_id).
- Use actual data values to determine patterns and statistics.
- If data is incomplete, respond: "Not enough data to answer."
- Provide specific insights with actual numbers when possible.
- Show calculations when performing data analysis.

Provide a comprehensive answer based on the data provided.
"""
        return context

    async def generate_final_answer(self, prompt: str) -> str:
        """Generate final answer using natural language processing"""
        try:
            response = await asyncio.to_thread(
                openai.chat.completions.create,
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Analyze structured data and provide insights based on database relationships."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Error generating final answer: {e}")
            raise

    async def answer_question(self, question: str) -> str:
        """Main method to process questions using the RAG system"""
        try:
            logger.info(f"Processing question with new RAG system: {question}")
            
            # Fetch live schema
            schema = self.fetch_live_schema(self.included_tables)
            schema_str = self.format_schema(schema)

            # Generate query plan
            plan = await self.generate_query_plan(question, schema_str)
            
            # Execute queries
            all_data = {}
            for table in plan["target_tables"]:
                if table in self.included_tables:  # Security check
                    all_data[table] = self.run_dynamic_query(table, plan["suggested_fields"], schema)

            # Generate context and final response
            reasoning_prompt = self.build_reasoning_prompt(question, schema_str, all_data)
            answer = await self.generate_final_answer(reasoning_prompt)
            
            logger.info("Successfully generated answer with new RAG system")
            return answer
            
        except Exception as e:
            logger.error(f"Error in new RAG system: {e}")
            raise

    async def chat(self, message: str, session_id: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Main chat interface with fallback to legacy system"""
        
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        try:
            # Try new RAG system first
            logger.info(f"Attempting to answer with new RAG system: {message}")
            answer = await self.answer_question(message)
            
            return {
                "answer": answer,
                "session_id": session_id,
                "sources": [{"content": "New SQL-based RAG system", "metadata": {"system": "v2"}}],
                "system_used": "v2"
            }
            
        except Exception as e:
            logger.warning(f"New RAG system failed: {e}. Falling back to legacy system.")
            
            try:
                # Fallback to legacy system
                legacy_service = await self._get_legacy_service()
                if legacy_service:
                    logger.info("Using legacy RAG system as fallback")
                    result = await legacy_service.chat(message, session_id, user_id)
                    result["system_used"] = "legacy"
                    result["fallback_reason"] = str(e)
                    return result
                else:
                    raise Exception("Legacy RAG service not available")
                    
            except Exception as legacy_error:
                logger.error(f"Both RAG systems failed. New: {e}, Legacy: {legacy_error}")
                return {
                    "answer": "I'm sorry, I'm experiencing technical difficulties and cannot process your request right now. Please try again later.",
                    "session_id": session_id,
                    "sources": [],
                    "system_used": "error",
                    "error": f"Both systems failed: New RAG: {str(e)}, Legacy RAG: {str(legacy_error)}"
                }

    async def health_check(self) -> Dict[str, Any]:
        """Check health of both RAG systems"""
        status = {
            "status": "unknown",
            "v2_system": {"available": False, "error": None},
            "legacy_system": {"available": False, "error": None}
        }
        
        # Test new system
        try:
            schema = self.fetch_live_schema(["students"])  # Simple test
            if schema:
                status["v2_system"]["available"] = True
        except Exception as e:
            status["v2_system"]["error"] = str(e)
        
        # Test legacy system
        try:
            legacy_service = await self._get_legacy_service()
            if legacy_service:
                legacy_health = await legacy_service.health_check()
                status["legacy_system"]["available"] = legacy_health.get("status") == "healthy"
                if not status["legacy_system"]["available"]:
                    status["legacy_system"]["error"] = "Legacy system unhealthy"
        except Exception as e:
            status["legacy_system"]["error"] = str(e)
        
        # Overall status
        if status["v2_system"]["available"]:
            status["status"] = "healthy"
        elif status["legacy_system"]["available"]:
            status["status"] = "degraded"  # Running on fallback
        else:
            status["status"] = "unhealthy"
        
        return status

# Global instance
_rag_service_v2 = None

def get_rag_service_v2() -> RAGServiceV2:
    """Get or create the RAG service V2 instance"""
    global _rag_service_v2
    
    if _rag_service_v2 is None:
        _rag_service_v2 = RAGServiceV2()
    
    return _rag_service_v2
