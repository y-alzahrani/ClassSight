# rag_service.py
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.schema import Document
from database import Database
import logging

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self, openai_api_key: str):
        # Set up the chat service
        self.openai_api_key = openai_api_key
        self.embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)
        self.llm = ChatOpenAI(
            openai_api_key=openai_api_key,
            model_name="gpt-3.5-turbo",
            temperature=0.7
        )
        self.vector_store = None
        self.qa_chain = None
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"  # Specify which output to store in memory
        )
        self.db = Database()
        self._db_connected = False
        
    async def _ensure_db_connection(self):
        # Make sure we're connected to the database
        if not self._db_connected:
            await self.db.connect()
            self._db_connected = True
        
    async def initialize_vector_store(self):
        # Load all the data and set up the search system
        try:
            # Ensure database connection
            await self._ensure_db_connection()
                
            logger.info("Initializing vector store with educational data...")
            
            # Fetch educational data from database
            educational_data = await self._fetch_educational_data()
            
            if not educational_data:
                logger.warning("No educational data found in database")
                # Create empty vector store
                self.vector_store = FAISS.from_texts(
                    ["No educational data available"],
                    self.embeddings,
                    metadatas=[{"source": "empty"}]
                )
                return
            
            # Process and chunk the data
            documents = self._process_educational_data(educational_data)
            
            # Create text splitter
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
            )
            
            # Split documents into chunks
            texts = text_splitter.split_documents(documents)
            
            # Create vector store
            if texts:
                self.vector_store = FAISS.from_documents(texts, self.embeddings)
                logger.info(f"Vector store created with {len(texts)} document chunks")
            else:
                # Fallback empty vector store
                self.vector_store = FAISS.from_texts(
                    ["No educational data available"],
                    self.embeddings,
                    metadatas=[{"source": "empty"}]
                )
            
            # Initialize the QA chain
            self.qa_chain = ConversationalRetrievalChain.from_llm(
                self.llm,
                retriever=self.vector_store.as_retriever(search_kwargs={"k": 3}),
                memory=self.memory,
                return_source_documents=True,
                output_key="answer"  # Specify the output key for memory
            )
            
            logger.info("RAG service initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing vector store: {e}")
            # Create fallback empty vector store
            self.vector_store = FAISS.from_texts(
                ["Error loading educational data"],
                self.embeddings,
                metadatas=[{"source": "error"}]
            )
            raise
    
    async def _fetch_educational_data(self) -> List[Dict[str, Any]]:
        # Get all the school data from database
        try:
            # Fetch from various educational tables that actually exist
            queries = [
                "SELECT * FROM classroom_synthetic_data_updated",
                "SELECT * FROM students", 
                "SELECT * FROM assessments",
                "SELECT * FROM grades",
                "SELECT * FROM attendance",
                "SELECT * FROM units",
                "SELECT * FROM bootcamps"
            ]
            
            all_data = []
            for query in queries:
                try:
                    result = await self.db.fetch_all(query)
                    if result:
                        all_data.extend(result)
                except Exception as e:
                    logger.warning(f"Could not fetch data with query '{query}': {e}")
                    continue
            
            return all_data
            
        except Exception as e:
            logger.error(f"Error fetching educational data: {e}")
            return []
    
    def _process_educational_data(self, data: List[Dict[str, Any]]) -> List[Document]:
        # Turn the data into something the chat system can use
        documents = []
        
        for record in data:
            try:
                # Convert record to text representation
                content_parts = []
                metadata = {"source": "database"}
                
                for key, value in record.items():
                    if value is not None:
                        content_parts.append(f"{key}: {value}")
                        
                        # Add specific metadata for different types
                        if key in ["student_id", "course_id", "assignment_id"]:
                            metadata[key] = value
                
                content = " | ".join(content_parts)
                
                if content.strip():
                    documents.append(Document(
                        page_content=content,
                        metadata=metadata
                    ))
                    
            except Exception as e:
                logger.warning(f"Error processing record: {e}")
                continue
        
        logger.info(f"Processed {len(documents)} documents from {len(data)} records")
        return documents
    
    async def chat(self, message: str, session_id: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
        # Main chat function - handles the conversation
        try:
            if not self.qa_chain:
                await self.initialize_vector_store()
            
            # Generate session ID if not provided
            if not session_id:
                session_id = str(uuid.uuid4())
            
            # Create or get chat session
            await self._ensure_chat_session(session_id, user_id)
            
            # Store user message
            await self._store_message(session_id, message, "user")
            
            # Get response from QA chain
            result = await self._get_ai_response(message)
            
            # Store assistant response
            await self._store_message(session_id, result["answer"], "assistant")
            
            return {
                "answer": result["answer"],
                "session_id": session_id,
                "sources": self._format_sources(result.get("source_documents", []))
            }
            
        except Exception as e:
            logger.error(f"Error in chat: {e}")
            return {
                "answer": "I'm sorry, I encountered an error while processing your request. Please try again.",
                "session_id": session_id or str(uuid.uuid4()),
                "sources": []
            }
    
    async def _get_ai_response(self, message: str) -> Dict[str, Any]:
        # Get the actual response from the model
        try:
            # Use the QA chain to get response
            result = await self.qa_chain.ainvoke({"question": message})
            return result
        except Exception as e:
            logger.error(f"Error getting response: {e}")
            # Fallback response
            return {
                "answer": "I'm having trouble accessing the knowledge base. Please try rephrasing your question.",
                "source_documents": []
            }
    
    def _format_sources(self, source_docs: List[Document]) -> List[Dict[str, str]]:
        """Format source documents for response."""
        sources = []
        for doc in source_docs:
            sources.append({
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "metadata": doc.metadata
            })
        return sources
    
    async def _ensure_chat_session(self, session_id: str, user_id: Optional[str] = None):
        """Ensure chat session exists in database."""
        try:
            await self._ensure_db_connection()
            # Check if session exists
            existing_session = await self.db.fetch_one(
                "SELECT id FROM chat_sessions WHERE id = $1",
                session_id
            )
            
            if not existing_session:
                # Create new session
                await self.db.execute(
                    """INSERT INTO chat_sessions (id, user_id, created_at, updated_at) 
                       VALUES ($1, $2, $3, $3)""",
                    session_id, user_id, datetime.utcnow()
                )
                logger.info(f"Created new chat session: {session_id}")
                
        except Exception as e:
            logger.error(f"Error ensuring chat session: {e}")
    
    async def _store_message(self, session_id: str, content: str, role: str):
        """Store a chat message in the database."""
        try:
            await self._ensure_db_connection()
            message_id = str(uuid.uuid4())
            await self.db.execute(
                """INSERT INTO chat_messages (id, session_id, content, role, created_at) 
                   VALUES ($1, $2, $3, $4, $5)""",
                message_id, session_id, content, role, datetime.utcnow()
            )
        except Exception as e:
            logger.error(f"Error storing message: {e}")
    
    async def get_chat_sessions(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get chat sessions for a user."""
        try:
            await self._ensure_db_connection()
            if user_id:
                sessions = await self.db.fetch_all(
                    "SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC",
                    user_id
                )
            else:
                sessions = await self.db.fetch_all(
                    "SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT 10"
                )
            
            return [dict(session) for session in sessions] if sessions else []
            
        except Exception as e:
            logger.error(f"Error getting chat sessions: {e}")
            return []
    
    async def get_session_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """Get messages for a chat session."""
        try:
            await self._ensure_db_connection()
            messages = await self.db.fetch_all(
                "SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
                session_id
            )
            
            return [dict(message) for message in messages] if messages else []
            
        except Exception as e:
            logger.error(f"Error getting session messages: {e}")
            return []
    
    async def health_check(self) -> Dict[str, Any]:
        """Check the health of the RAG service."""
        try:
            status = {
                "status": "healthy",
                "vector_store_initialized": self.vector_store is not None,
                "qa_chain_initialized": self.qa_chain is not None,
                "database_connected": False
            }
            
            # Test database connection
            try:
                await self._ensure_db_connection()
                await self.db.fetch_one("SELECT 1")
                status["database_connected"] = True
            except Exception as e:
                logger.error(f"Database health check failed: {e}")
            
            return status
            
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }

# Global RAG service instance
_rag_service = None

def get_rag_service() -> RAGService:
    # Just returns my chat service
    global _rag_service
    
    if _rag_service is None:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        _rag_service = RAGService(openai_api_key)
    
    return _rag_service
