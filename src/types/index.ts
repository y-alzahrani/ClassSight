// src/types/index.ts

// User and Auth Types
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'teacher' | 'admin'
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// External API Types (based on your FastAPI server)
export interface RoomLiveData {
  id: string
  name: string
  occupancy: number
  capacity: number
  attentionScore: number
  timestamp: string
  status: "active" | "inactive"
}

export interface Report {
  id: string
  roomId: string
  date: string
  averageOccupancy: number
  averageAttention: number
  peakOccupancy: number
  totalSessions: number
}

export interface DashboardData {
  rooms: RoomLiveData[]
  reports: Report[]
  summary: {
    totalRooms: number
    activeRooms: number
    averageAttention: number
    averageOccupancy: number
  }
}

// Chat System Types
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatResponse {
  response: string
  session_id: string
  sources?: string[]
  system_used?: string
  fallback_reason?: string
}

export interface ChatRequest {
  message: string
  session_id?: string
}

// RAG System Types
export interface Document {
  id: string
  content: string
  source: string
  source_id?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  content: string
  embedding?: number[]
  metadata: Record<string, any>
  created_at: string
}

export interface SimilaritySearchResult {
  id: string
  document_id: string
  content: string
  metadata: Record<string, any>
  similarity: number
}