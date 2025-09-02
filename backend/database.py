# database.py
import asyncpg
import os
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        
    async def connect(self):
        """Create database connection pool"""
        try:
            # Parse Supabase URL to get connection details
            db_url = os.getenv("DATABASE_URL")  # Your Supabase DB URL
            if not db_url:
                raise ValueError("DATABASE_URL environment variable not set")
            
            self.pool = await asyncpg.create_pool(
                db_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            print("Database connection pool created successfully")
        except Exception as e:
            print(f"Failed to create database connection pool: {e}")
            raise
    
    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            print("Database connection pool closed")
    
    async def execute_query(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results"""
        async with self.pool.acquire() as connection:
            rows = await connection.fetch(query, *args)
            return [dict(row) for row in rows]
    
    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Execute a SELECT query and return the first result"""
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(query, *args)
            return dict(row) if row else None
    
    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return all results (alias for execute_query)"""
        return await self.execute_query(query, *args)
    
    async def execute(self, query: str, *args) -> None:
        """Execute an INSERT, UPDATE, or DELETE query"""
        async with self.pool.acquire() as connection:
            await connection.execute(query, *args)

async def get_db_connection():
    """Get a direct database connection for standalone operations"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set")
    
    return await asyncpg.connect(db_url)
