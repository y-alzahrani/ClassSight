'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Send, 
  Bot, 
  User, 
  MessageSquare,
  Loader2,
  RefreshCw,
  Plus,
  Clock,
  AlertCircle,
  ChevronDown,
  Settings
} from 'lucide-react'
import type { ChatMessage, ChatSession } from '@/types'
import { chatApi, convertApiMessagesToFrontend, setTestAuthToken } from '@/lib/chat-api'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState('v2')
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [showSessions, setShowSessions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize on component mount
  useEffect(() => {
    initializeChat()
  }, [])

  const initializeChat = async () => {
    try {
      // For testing - set a test auth token
      setTestAuthToken('08260c43-86b4-4e4a-b0b4-2a34b567890a')
      
      // Check comprehensive RAG status (both V1 and V2)
      const compStatus = await chatApi.getComprehensiveStatus()
      setSystemStatus(compStatus)
      
      // Set recommended system
      setSelectedVersion(compStatus.recommended_system === 'v2' ? 'v2' : 'v1')
      
      if (compStatus.v2.available || compStatus.v1.available) {
        // Load user sessions
        await loadSessions()
        
        // Create initial welcome message
        setMessages([{
          id: '1',
          role: 'assistant',
          content: `Hello! I am your ClassSight AI assistant. I can help you analyze educational data, including student grades, attendance, assessments, and more. What would you like to know?`,
          timestamp: new Date(Date.now() - 60000)
        }])
      } else {
        setError('AI assistant is not available. Please try again later.')
      }
    } catch (err) {
      console.error('Failed to initialize chat:', err)
      setError('Failed to initialize AI assistant')
    }
  }

  const loadSessions = async () => {
    try {
      const userSessions = await chatApi.getSessions()
      setSessions(userSessions)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }

  const createNewSession = async () => {
    try {
      setCurrentSessionId(null)
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Hello! I am your ClassSight AI assistant. How can I help you today?',
        timestamp: new Date()
      }])
      await loadSessions()
    } catch (err) {
      console.error('Failed to create session:', err)
      setError('Failed to create session')
    }
  }

  const loadSession = async (sessionId: string) => {
    try {
      setIsLoading(true)
      const sessionData = await chatApi.getSessionMessages(sessionId)
      const frontendMessages = convertApiMessagesToFrontend(sessionData.messages)
      setMessages(frontendMessages)
      setCurrentSessionId(sessionId)
      setShowSessions(false)
    } catch (err) {
      console.error('Failed to load session:', err)
      setError('Failed to load session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const messageContent = inputValue
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      // Call the RAG API using selected version
      const response = await chatApi.sendMessageWithSystem({
        message: messageContent,
        session_id: currentSessionId || undefined
      }, selectedVersion === 'v2')
      
      // Update session ID if this was a new session
      if (!currentSessionId && response.session_id) {
        setCurrentSessionId(response.session_id)
        await loadSessions() // Refresh sessions list
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: { 
          sources: response.sources,
          system_used: (response as any).system_used || selectedVersion,
          fallback_reason: (response as any).fallback_reason
        }
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      setError(`Chat processing failed: ${error}`)
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I am your ClassSight AI assistant. I can help you analyze classroom data, generate reports, and answer questions about your teaching analytics. What would you like to know?',
        timestamp: new Date()
      }
    ])
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-slate-400">
            Chat with your intelligent classroom analytics assistant
          </p>
          
          {/* System Version Selector */}
          <div className="mt-4 p-3 bg-slate-900/40 border border-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <label htmlFor="rag-version" className="text-sm font-medium text-slate-300">
                AI Version:
              </label>
              <Select 
                value={selectedVersion} 
                onValueChange={(value: 'v1' | 'v2') => setSelectedVersion(value)}
              >
                <SelectTrigger className="w-48 bg-slate-800/50 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="v1" className="text-slate-200 focus:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>ClassSight AI V1</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="v2" className="text-slate-200 focus:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span>ClassSight AI V2</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-400">
                {selectedVersion === 'v2' ? 'Enhanced SQL-based search' : 'Vector-based search'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={clearChat}
            className="flex items-center bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-slate-100 hover:border-slate-500/50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="h-[calc(100vh-12rem)] flex flex-col bg-slate-800/70 backdrop-blur-sm border-slate-700/50 shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-700/50 bg-slate-800/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base text-slate-100">ClassSight AI {selectedVersion.toUpperCase()}</CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  {selectedVersion === 'v2' ? "Enhanced SQL-based analytics" : "Vector-based search"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={selectedVersion === 'v2' 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                }
              >
                Active
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-0 bg-slate-900/20 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 min-h-full">
              {/* Error Display */}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-4 py-3 max-w-md">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-3 max-w-[80%]`}>
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                        <AvatarFallback className="bg-indigo-600 text-white">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700/50 text-slate-100 border border-slate-600/30'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className={`flex items-center justify-between mt-1 ${
                        message.role === 'user' ? 'text-indigo-100' : 'text-slate-400'
                      }`}>
                        <p className="text-xs">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                        {message.role === 'assistant' && message.metadata?.system_used && (
                          <div className="flex items-center gap-2">
                            {message.metadata.fallback_reason && (
                              <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                Fallback
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {message.metadata.system_used.toUpperCase()}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                        <AvatarFallback className="bg-slate-600 text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-indigo-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-slate-700/50 text-slate-100 border border-slate-600/30 rounded-lg px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-slate-300">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>

        {/* Input Area - Now properly inside the Card */}
        <CardFooter className="border-t border-slate-700/50 p-4 bg-slate-800/30 flex-shrink-0">
          {/* Suggested Questions */}
          <div className="w-full space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-slate-600/50 border-slate-600/50 text-slate-300 hover:text-slate-100 transition-colors"
                onClick={() => setInputValue("What is the average attention score today?")}
              >
                Average attention today?
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-slate-600/50 border-slate-600/50 text-slate-300 hover:text-slate-100 transition-colors"
                onClick={() => setInputValue("Which rooms have the highest occupancy?")}
              >
                Highest occupancy rooms?
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-slate-600/50 border-slate-600/50 text-slate-300 hover:text-slate-100 transition-colors"
                onClick={() => setInputValue("Generate a summary report")}
              >
                Generate report
              </Badge>
            </div>
            
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your classroom analytics..."
                  disabled={isLoading}
                  className="pr-12 bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder-slate-400 focus:border-indigo-500/50 focus:ring-indigo-500/30"
                />
                <MessageSquare className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}