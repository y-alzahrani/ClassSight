"use client"

import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts"
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Brain,
  Eye,
  Activity,
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Maximize2,
  X,
} from "lucide-react"

const API_BASE_URL = "http://localhost:8000"

// Data interfaces
interface ClassroomData {
  id: number
  date: string
  start_time: string
  end_time: string
  attendance_pct: number
  avg_attention_rate: number
  avg_distraction_rate: number
  max_attention_rate: number
  max_distraction_rate: number
  min_attention_rate: number
  min_distraction_rate: number
  avg_students_no: number
  max_students_no: number
  min_students_no: number
  students_enrolled: number
}

interface ProcessedData extends ClassroomData {
  time_label: string
  week: number
  half_hour: string
}

interface SummaryStats {
  avg_attendance: number
  avg_attention: number
  avg_distraction: number
  avg_max_students: number
  avg_min_students: number
  avg_students_per_session: number
  correlation_attendance_attention: number
  best_day: { date: string; attendance: number; attention: number }
  worst_day: { date: string; attendance: number; attention: number }
  best_time_slot: { time: string; attention: number }
  worst_time_slot: { time: string; attention: number }
  total_sessions: number
}

export default function EnhancedDashboard() {
  const [data, setData] = useState<ClassroomData[]>([])
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "half-hourly">("daily")
  const [chartType, setChartType] = useState<"overview" | "attendance" | "engagement" | "students" | "comparison">("overview")

  // Custom Tooltip Component for proper data handling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#162033] border border-[#2A3951] rounded-lg p-3 shadow-lg">
          <p className="text-[#8B9DC3] text-sm mb-2">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => {
            let displayName = entry.name
            
            // Fix the tooltip names based on dataKey
            if (entry.dataKey === 'avg_attention_rate') {
              displayName = 'Attention Rate'
            } else if (entry.dataKey === 'avg_distraction_rate') {
              displayName = 'Distraction Rate'
            } else if (entry.dataKey === 'max_attention_rate') {
              displayName = 'Max Attention'
            } else if (entry.dataKey === 'max_distraction_rate') {
              displayName = 'Max Distraction'
            } else if (entry.dataKey === 'attendance_pct') {
              displayName = 'Attendance'
            }
            
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {`${displayName}: ${typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}${entry.dataKey.includes('rate') || entry.dataKey.includes('pct') ? '%' : ''}`}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  // Expandable Chart Component
  const ExpandableChart = ({ 
    title, 
    description, 
    icon: Icon, 
    children, 
    chartId 
  }: { 
    title: string
    description: string
    icon: any
    children: React.ReactNode
    chartId: string
  }) => (
    <Card className="bg-[#162033]/80 backdrop-blur-sm border-[#1E2A47] hover:bg-[#162033]/90 transition-all duration-300 hover:shadow-lg hover:shadow-[#4F7FFF]/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-[#4F7FFF]" />
          <CardTitle className="text-white">{title}</CardTitle>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-[#8B9DC3] hover:text-white hover:bg-[#1E2A47]">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full bg-[#0B1426] border-[#1E2A47]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Icon className="w-5 h-5 text-[#4F7FFF]" />
                {title}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {description}
              </DialogDescription>
            </DialogHeader>
            <div className="h-[500px]">
              {children}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-400 mb-4">
          {description}
        </CardDescription>
        <div className="h-[250px]">
          {children}
        </div>
      </CardContent>
    </Card>
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/classroom-data`)
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const rawData: ClassroomData[] = await response.json()
      setData(rawData)
      
      // Calculate summary stats
      const stats = calculateSummaryStats(rawData)
      setSummaryStats(stats)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSummaryStats = (data: ClassroomData[]): SummaryStats => {
    if (data.length === 0) {
      return {
        avg_attendance: 0,
        avg_attention: 0,
        avg_distraction: 0,
        avg_max_students: 0,
        avg_min_students: 0,
        avg_students_per_session: 0,
        correlation_attendance_attention: 0,
        best_day: { date: '', attendance: 0, attention: 0 },
        worst_day: { date: '', attendance: 0, attention: 0 },
        best_time_slot: { time: '', attention: 0 },
        worst_time_slot: { time: '', attention: 0 },
        total_sessions: 0
      }
    }

    // Calculate averages
    const avg_attendance = data.reduce((sum, item) => sum + item.attendance_pct, 0) / data.length
    const avg_attention = data.reduce((sum, item) => sum + item.avg_attention_rate, 0) / data.length
    const avg_distraction = data.reduce((sum, item) => sum + item.avg_distraction_rate, 0) / data.length
    const avg_max_students = data.reduce((sum, item) => sum + item.max_students_no, 0) / data.length
    const avg_min_students = data.reduce((sum, item) => sum + item.min_students_no, 0) / data.length
    const avg_students_per_session = data.reduce((sum, item) => sum + item.avg_students_no, 0) / data.length

    // Find best and worst days
    const bestAttendanceDay = data.reduce((best, current) => 
      current.attendance_pct > best.attendance_pct ? current : best
    )
    const worstAttendanceDay = data.reduce((worst, current) => 
      current.attendance_pct < worst.attendance_pct ? current : worst
    )

    // Find best and worst time slots by attention
    const bestAttentionSession = data.reduce((best, current) => 
      current.avg_attention_rate > best.avg_attention_rate ? current : best
    )
    const worstAttentionSession = data.reduce((worst, current) => 
      current.avg_attention_rate < worst.avg_attention_rate ? current : worst
    )

    // Calculate correlation between attendance and attention
    const n = data.length
    const sumX = data.reduce((sum, item) => sum + item.attendance_pct, 0)
    const sumY = data.reduce((sum, item) => sum + item.avg_attention_rate, 0)
    const sumXY = data.reduce((sum, item) => sum + (item.attendance_pct * item.avg_attention_rate), 0)
    const sumX2 = data.reduce((sum, item) => sum + (item.attendance_pct * item.attendance_pct), 0)
    const sumY2 = data.reduce((sum, item) => sum + (item.avg_attention_rate * item.avg_attention_rate), 0)
    
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    return {
      avg_attendance,
      avg_attention,
      avg_distraction,
      avg_max_students,
      avg_min_students,
      avg_students_per_session,
      correlation_attendance_attention: isNaN(correlation) ? 0 : correlation,
      best_day: { 
        date: new Date(bestAttendanceDay.date).toLocaleDateString(), 
        attendance: bestAttendanceDay.attendance_pct,
        attention: bestAttendanceDay.avg_attention_rate
      },
      worst_day: { 
        date: new Date(worstAttendanceDay.date).toLocaleDateString(), 
        attendance: worstAttendanceDay.attendance_pct,
        attention: worstAttendanceDay.avg_attention_rate
      },
      best_time_slot: { 
        time: `${bestAttentionSession.start_time} - ${bestAttentionSession.end_time}`, 
        attention: bestAttentionSession.avg_attention_rate 
      },
      worst_time_slot: { 
        time: `${worstAttentionSession.start_time} - ${worstAttentionSession.end_time}`, 
        attention: worstAttentionSession.avg_attention_rate 
      },
      total_sessions: data.length
    }
  }

  const processDataForView = (data: ClassroomData[]): ProcessedData[] => {
    return data.map(item => {
      const date = new Date(item.date)
      const week = Math.ceil(date.getDate() / 7)
      const startTime = new Date(`${item.date}T${item.start_time}`)
      const timeLabel = startTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
      
      return {
        ...item,
        time_label: viewMode === "daily" ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : timeLabel,
        week: week,
        half_hour: timeLabel
      }
    })
  }

  const currentData = processDataForView(data)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1426] flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B1426] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white">Classroom Analytics Dashboard</h1>
            <p className="text-gray-400">Comprehensive insights into attendance, engagement, and performance</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-[180px] bg-[#162033] border-[#1E2A47] text-white">
                <SelectValue placeholder="Select view mode" />
              </SelectTrigger>
              <SelectContent className="bg-[#162033] border-[#1E2A47]">
                <SelectItem value="daily" className="text-white hover:bg-[#1E2A47]">Daily View</SelectItem>
                <SelectItem value="weekly" className="text-white hover:bg-[#1E2A47]">Weekly View</SelectItem>
                <SelectItem value="half-hourly" className="text-white hover:bg-[#1E2A47]">Time Slots</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-[180px] bg-[#162033] border-[#1E2A47] text-white">
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent className="bg-[#162033] border-[#1E2A47]">
                <SelectItem value="overview" className="text-white hover:bg-[#1E2A47]">Overview</SelectItem>
                <SelectItem value="attendance" className="text-white hover:bg-[#1E2A47]">Attendance</SelectItem>
                <SelectItem value="engagement" className="text-white hover:bg-[#1E2A47]">Engagement</SelectItem>
                <SelectItem value="students" className="text-white hover:bg-[#1E2A47]">Students</SelectItem>
                <SelectItem value="comparison" className="text-white hover:bg-[#1E2A47]">Comparison</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={fetchData} 
              className="bg-[#4F7FFF] hover:bg-[#4F7FFF]/80 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#162033]/80 backdrop-blur-sm border-[#1E2A47] hover:bg-[#162033]/90 transition-all duration-300 hover:shadow-lg hover:shadow-[#4F7FFF]/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Average Attendance</CardTitle>
                <Users className="h-4 w-4 text-[#4F7FFF]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{summaryStats.avg_attendance.toFixed(1)}%</div>
                <p className="text-xs text-gray-400">
                  {summaryStats.avg_attendance > 80 ? 'Excellent' : summaryStats.avg_attendance > 60 ? 'Good' : 'Needs Improvement'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#162033]/80 backdrop-blur-sm border-[#1E2A47] hover:bg-[#162033]/90 transition-all duration-300 hover:shadow-lg hover:shadow-[#4F7FFF]/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Average Attention</CardTitle>
                <Brain className="h-4 w-4 text-[#4F7FFF]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{summaryStats.avg_attention.toFixed(1)}%</div>
                <p className="text-xs text-gray-400">
                  {summaryStats.avg_attention > 70 ? 'High Focus' : summaryStats.avg_attention > 50 ? 'Moderate' : 'Low Focus'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#162033]/80 backdrop-blur-sm border-[#1E2A47] hover:bg-[#162033]/90 transition-all duration-300 hover:shadow-lg hover:shadow-[#4F7FFF]/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Students per Session</CardTitle>
                <Activity className="h-4 w-4 text-[#4F7FFF]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{summaryStats.avg_students_per_session.toFixed(0)}</div>
                <p className="text-xs text-gray-400">
                  Capacity Utilization
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#162033]/80 backdrop-blur-sm border-[#1E2A47] hover:bg-[#162033]/90 transition-all duration-300 hover:shadow-lg hover:shadow-[#4F7FFF]/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Correlation</CardTitle>
                <TrendingUp className="h-4 w-4 text-[#4F7FFF]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{summaryStats.correlation_attendance_attention.toFixed(3)}</div>
                <p className="text-xs text-gray-400">
                  Attendance-Attention
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Analysis */}
          {(chartType === "overview" || chartType === "attendance") && (
            <ExpandableChart
              title="Attendance Analysis"
              description="Track attendance patterns over time"
              icon={Users}
              chartId="attendance"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3951" />
                  <XAxis 
                    dataKey={
                      viewMode === "weekly" ? "week" : 
                      viewMode === "daily" ? "date" : 
                      viewMode === "half-hourly" ? "time_label" : "time_label"
                    }
                    tick={{ fontSize: 12, fill: '#8B9DC3' }}
                    tickFormatter={(value) => {
                      if (viewMode === "daily") {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#8B9DC3' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="attendance_pct" 
                    stroke="#4F7FFF" 
                    fill="#4F7FFF" 
                    fillOpacity={0.4}
                    name="Attendance Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ExpandableChart>
          )}

          {/* Attention vs Distraction */}
          {(chartType === "overview" || chartType === "engagement") && (
            <ExpandableChart
              title="Attention vs Distraction Analysis"
              description="Compare attention and distraction rates"
              icon={Brain}
              chartId="engagement"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3951" />
                  <XAxis 
                    dataKey={
                      viewMode === "weekly" ? "week" : 
                      viewMode === "daily" ? "date" : 
                      viewMode === "half-hourly" ? "time_label" : "time_label"
                    }
                    tick={{ fontSize: 12, fill: '#8B9DC3' }}
                    tickFormatter={(value) => {
                      if (viewMode === "daily") {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#8B9DC3' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avg_attention_rate" 
                    stroke="#4F7FFF" 
                    strokeWidth={3}
                    name="Attention Rate"
                    dot={{ fill: "#4F7FFF", r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg_distraction_rate" 
                    stroke="#8B9DC3" 
                    strokeWidth={3}
                    name="Distraction Rate"
                    dot={{ fill: "#8B9DC3", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ExpandableChart>
          )}

          {/* Student Numbers Analysis */}
          {(chartType === "overview" || chartType === "students") && (
            <ExpandableChart
              title="Student Numbers Analysis"
              description="Maximum, average, and minimum students per session"
              icon={Activity}
              chartId="students"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3951" />
                  <XAxis 
                    dataKey={
                      viewMode === "weekly" ? "week" : 
                      viewMode === "daily" ? "date" : 
                      viewMode === "half-hourly" ? "time_label" : "time_label"
                    }
                    tick={{ fontSize: 12, fill: '#8B9DC3' }}
                    tickFormatter={(value) => {
                      if (viewMode === "daily") {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#8B9DC3' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="max_students_no" 
                    stroke="#4F7FFF" 
                    fill="#4F7FFF" 
                    fillOpacity={0.3}
                    name="Max Students"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg_students_no" 
                    stroke="#8B9DC3" 
                    strokeWidth={2}
                    name="Avg Students"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ExpandableChart>
          )}

          {/* Peak Performance Comparison */}
          {(chartType === "overview" || chartType === "comparison") && (
            <ExpandableChart
              title="Peak Performance Comparison"
              description="Maximum attention vs maximum distraction rates"
              icon={BarChart3}
              chartId="comparison"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3951" />
                  <XAxis 
                    dataKey={
                      viewMode === "weekly" ? "week" : 
                      viewMode === "daily" ? "date" : 
                      viewMode === "half-hourly" ? "time_label" : "time_label"
                    }
                    tick={{ fontSize: 12, fill: '#8B9DC3' }}
                    tickFormatter={(value) => {
                      if (viewMode === "daily") {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#8B9DC3' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="max_attention_rate" fill="#4F7FFF" name="Max Attention" />
                  <Bar dataKey="max_distraction_rate" fill="#8B9DC3" name="Max Distraction" />
                </BarChart>
              </ResponsiveContainer>
            </ExpandableChart>
          )}
        </div>

        {/* Insights and Recommendations */}
        {summaryStats && (
          <Card className="bg-[#162033]/80 backdrop-blur-sm border-[#1E2A47]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5" />
                Key Insights & Recommendations
              </CardTitle>
              <CardDescription className="text-gray-400">
                Data-driven insights based on comprehensive analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-[#4F7FFF] mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Best Performance Indicators
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#1E2A47] rounded-lg border border-[#2A3951]">
                      <div>
                        <Badge variant="secondary" className="mb-1 bg-[#2A3951] text-gray-300">Best Day</Badge>
                        <p className="text-sm text-gray-300">{summaryStats.best_day.date}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[#4F7FFF]">{summaryStats.best_day.attendance.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">attendance</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#1E2A47] rounded-lg border border-[#2A3951]">
                      <div>
                        <Badge variant="secondary" className="mb-1 bg-[#2A3951] text-gray-300">Best Time</Badge>
                        <p className="text-sm text-gray-300">{summaryStats.best_time_slot.time}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[#4F7FFF]">{summaryStats.best_time_slot.attention.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">attention</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-[#8B9DC3] mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Areas for Improvement
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#1E2A47] rounded-lg border border-[#2A3951]">
                      <div>
                        <Badge variant="destructive" className="mb-1 bg-[#8B9DC3] text-white">Worst Day</Badge>
                        <p className="text-sm text-gray-300">{summaryStats.worst_day.date}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[#8B9DC3]">{summaryStats.worst_day.attendance.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">attendance</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#1E2A47] rounded-lg border border-[#2A3951]">
                      <div>
                        <Badge variant="destructive" className="mb-1 bg-[#8B9DC3] text-white">Worst Time</Badge>
                        <p className="text-sm text-gray-300">{summaryStats.worst_time_slot.time}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[#8B9DC3]">{summaryStats.worst_time_slot.attention.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">attention</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
