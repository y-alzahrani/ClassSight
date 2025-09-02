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
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Brain,
  Eye,
  Filter,
} from "lucide-react"

const API_BASE_URL = "http://localhost:8000"

// --- helpers to make Recharts happy ---
const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const formatDateLabel = (v: any) => {
  const d = new Date(v)
  return isNaN(d.valueOf()) ? String(v ?? "") : d.toLocaleDateString()
}

interface InsightData {
  overall_attention: number
  total_sessions: number
  peak_attention_hour: number
  peak_attention_score: number
  best_day_of_week: string
  best_day_attention: number
  capacity_trend: string
  recent_capacity: number
  overall_attendance: number
}

interface AttentionData {
  hour?: number
  date?: string
  week?: number
  year?: number
  avg_attention_rate: number
  avg_distraction_rate: number
}

interface EnhancedAttentionData {
  hour?: number
  date?: string
  week?: number
  year?: number
  avg_attention_rate: number
  avg_distraction_rate: number
  max_attention_rate: number
  max_distraction_rate: number
  min_attention_rate: number
  min_distraction_rate: number
}

interface AttendanceData {
  hour?: number
  date?: string
  week?: number
  year?: number
  attendance_pct: number
  avg_students_no: number
  max_students_no: number
  min_students_no: number
  students_enrolled: number
}

interface StudentData {
  hour?: number
  date?: string
  week?: number
  year?: number
  max_students_no: number
  min_students_no: number
}

interface CapacityTrendData {
  date: string
  max_students_no: number
  min_students_no: number
  avg_students_no: number
  students_enrolled: number
}

interface CorrelationData {
  correlation: number
  avg_attendance: number
  avg_attention: number
  total_sessions: number
}

interface PerformanceSummary {
  best_day: string | null
  best_day_attendance: number
  best_day_attention: number
  worst_day: string | null
  worst_day_attendance: number
  worst_day_attention: number
  best_time_slot: number
  best_time_attention: number
  worst_time_slot: number
  worst_time_attention: number
}

const sanitizeAttention = (arr: any[]): AttentionData[] =>
  (Array.isArray(arr) ? arr : [])
    .map((d) => ({
      hour: d?.hour,
      date: d?.date,
      week: d?.week,
      year: d?.year,
      avg_attention_rate: toNum(d?.avg_attention_rate) ?? 0,
      avg_distraction_rate: toNum(d?.avg_distraction_rate) ?? 0,
    }))
    .filter(
      (d) =>
        Number.isFinite(d.avg_attention_rate) &&
        Number.isFinite(d.avg_distraction_rate)
    )

const sanitizeAttendance = (arr: any[]): AttendanceData[] =>
  (Array.isArray(arr) ? arr : [])
    .map((d) => ({
      hour: d?.hour,
      date: d?.date,
      week: d?.week,
      year: d?.year,
      attendance_pct: toNum(d?.attendance_pct) ?? 0,
      avg_students_no: toNum(d?.avg_students_no) ?? 0,
      max_students_no: toNum(d?.max_students_no) ?? 0,
      min_students_no: toNum(d?.min_students_no) ?? 0,
      students_enrolled: toNum(d?.students_enrolled) ?? 0,
    }))
    .filter(
      (d) =>
        Number.isFinite(d.attendance_pct) &&
        Number.isFinite(d.avg_students_no)
    )

const sanitizeEnhancedAttention = (arr: any[]): EnhancedAttentionData[] =>
  (Array.isArray(arr) ? arr : [])
    .map((d) => ({
      hour: d?.hour,
      date: d?.date,
      week: d?.week,
      year: d?.year,
      avg_attention_rate: toNum(d?.avg_attention_rate) ?? 0,
      avg_distraction_rate: toNum(d?.avg_distraction_rate) ?? 0,
      max_attention_rate: toNum(d?.max_attention_rate) ?? 0,
      max_distraction_rate: toNum(d?.max_distraction_rate) ?? 0,
      min_attention_rate: toNum(d?.min_attention_rate) ?? 0,
      min_distraction_rate: toNum(d?.min_distraction_rate) ?? 0,
    }))
    .filter(
      (d) =>
        Number.isFinite(d.avg_attention_rate) &&
        Number.isFinite(d.avg_distraction_rate)
    )

const sanitizeStudents = (arr: any[]): StudentData[] =>
  (Array.isArray(arr) ? arr : [])
    .map((d) => ({
      hour: d?.hour,
      date: d?.date,
      week: d?.week,
      year: d?.year,
      max_students_no: toNum(d?.max_students_no) ?? 0,
      min_students_no: toNum(d?.min_students_no) ?? 0,
    }))
    .filter(
      (d) =>
        Number.isFinite(d.max_students_no) &&
        Number.isFinite(d.min_students_no)
    )

const sanitizeCapacity = (arr: any[]): CapacityTrendData[] =>
  (Array.isArray(arr) ? arr : [])
    .map((d) => ({
      date: d?.date ?? d?.day ?? d?.created_at ?? null,
      max_students_no: toNum(d?.max_students_no) ?? 0,
      min_students_no: toNum(d?.min_students_no) ?? 0,
      avg_students_no: toNum(d?.avg_students_no) ?? 0,
      students_enrolled: toNum(d?.students_enrolled) ?? 0,
    }))
    .filter((d) => d.date !== null && !isNaN(Date.parse(d.date)))

type ViewMode = "hourly" | "daily" | "weekly"
type ChartType = "attention" | "students" | "capacity" | "attendance" | "enhanced-attention" | null

export default function DashboardPage() {
  // State for all data
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [attentionWeekly, setAttentionWeekly] = useState<AttentionData[]>([])
  const [attentionDaily, setAttentionDaily] = useState<AttentionData[]>([])
  const [attentionHourly, setAttentionHourly] = useState<AttentionData[]>([])
  const [studentsWeekly, setStudentsWeekly] = useState<StudentData[]>([])
  const [studentsDaily, setStudentsDaily] = useState<StudentData[]>([])
  const [studentsHourly, setStudentsHourly] = useState<StudentData[]>([])
  const [capacityTrends, setCapacityTrends] = useState<CapacityTrendData[]>([])
  
  // Enhanced EDA data states
  const [attendanceWeekly, setAttendanceWeekly] = useState<AttendanceData[]>([])
  const [attendanceDaily, setAttendanceDaily] = useState<AttendanceData[]>([])
  const [attendanceHourly, setAttendanceHourly] = useState<AttendanceData[]>([])
  const [enhancedAttentionWeekly, setEnhancedAttentionWeekly] = useState<EnhancedAttentionData[]>([])
  const [enhancedAttentionDaily, setEnhancedAttentionDaily] = useState<EnhancedAttentionData[]>([])
  const [enhancedAttentionHourly, setEnhancedAttentionHourly] = useState<EnhancedAttentionData[]>([])
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null)
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null)

  // UI State
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedChart, setExpandedChart] = useState<ChartType>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("hourly")
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )

  // Enhanced fetch function with better error handling and debugging
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log("🔄 Fetching dashboard data from API...")
      console.log("📅 Selected date:", selectedDate)
      
      const endpoints = [
        `${API_BASE_URL}/api/dashboard-insights`,
        `${API_BASE_URL}/api/attention-distraction/weekly`,
        `${API_BASE_URL}/api/attention-distraction/daily`,
        `${API_BASE_URL}/api/attention-distraction/hourly?date=${selectedDate}`,
        `${API_BASE_URL}/api/students/weekly`,
        `${API_BASE_URL}/api/students/daily`,
        `${API_BASE_URL}/api/student-capacity-trends`,
        // Enhanced EDA endpoints
        `${API_BASE_URL}/api/attendance-analytics/weekly`,
        `${API_BASE_URL}/api/attendance-analytics/daily`,
        `${API_BASE_URL}/api/attendance-analytics/hourly?date=${selectedDate}`,
        `${API_BASE_URL}/api/enhanced-attention/weekly`,
        `${API_BASE_URL}/api/enhanced-attention/daily`,
        `${API_BASE_URL}/api/enhanced-attention/hourly?date=${selectedDate}`,
        `${API_BASE_URL}/api/correlation-insights`,
        `${API_BASE_URL}/api/performance-summary`,
      ]

      console.log("📡 API endpoints to fetch:", endpoints.length)

      // Fetch each endpoint individually for better error tracking
      const responses = await Promise.allSettled(
        endpoints.map(async (url, index) => {
          console.log(`📥 Fetching endpoint ${index + 1}/${endpoints.length}: ${url}`)
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`)
          }
          const data = await response.json()
          console.log(`✅ Endpoint ${index + 1} success: ${Array.isArray(data) ? data.length + ' items' : 'object'}`)
          return data
        })
      )

      // Process results and handle errors
      const results = responses.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          console.error(`❌ Endpoint ${index + 1} failed:`, result.reason)
          // Return empty array or null for failed endpoints to prevent crashes
          return index < 7 ? [] : null  // First 7 are arrays, rest are objects
        }
      })

      const [
        insightsRaw,
        attWRaw,
        attDRaw,
        attHRaw,
        stuWRaw,
        stuDRaw,
        capRaw,
        // Enhanced EDA data
        attendanceWRaw,
        attendanceDRaw,
        attendanceHRaw,
        enhancedAttWRaw,
        enhancedAttDRaw,
        enhancedAttHRaw,
        correlationRaw,
        performanceRaw,
      ] = results
      
      // Handle insights data with more robust checking
      if (insightsRaw) {
        console.log("Raw insights data:", insightsRaw)
        
        let insightsData: InsightData | null = null
        
        if (Array.isArray(insightsRaw)) {
          insightsData = insightsRaw.length > 0 ? insightsRaw[0] : null
        } else if (typeof insightsRaw === 'object') {
          insightsData = insightsRaw as InsightData
        }
        // Validate the insights data structure
        if (insightsData && typeof insightsData === 'object') {
          // Ensure all numeric fields are properly converted
          const sanitizedInsights: InsightData = {
            overall_attention: Number(insightsData.overall_attention) || 0,
            total_sessions: Number(insightsData.total_sessions) || 0,
            peak_attention_hour: Number(insightsData.peak_attention_hour) || 9,
            peak_attention_score: Number(insightsData.peak_attention_score) || 0,
            best_day_of_week: String(insightsData.best_day_of_week) || "Monday",
            best_day_attention: Number(insightsData.best_day_attention) || 0,
            capacity_trend: String(insightsData.capacity_trend) || "stable",
            recent_capacity: Number(insightsData.recent_capacity) || 0,
            overall_attendance: Number(insightsData.overall_attendance) || 0,
          }
          
          console.log("📊 Dashboard insights processed successfully:")
          console.log(`   📈 Overall attention: ${sanitizedInsights.overall_attention.toFixed(1)}%`)
          console.log(`   👥 Total sessions: ${sanitizedInsights.total_sessions}`)
          console.log(`   🏆 Peak hour: ${sanitizedInsights.peak_attention_hour}:00 (${sanitizedInsights.peak_attention_score.toFixed(1)}%)`)
          console.log(`   📅 Best day: ${sanitizedInsights.best_day_of_week} (${sanitizedInsights.best_day_attention.toFixed(1)}%)`)
          console.log(`   📊 Attendance: ${sanitizedInsights.overall_attendance.toFixed(1)}%`)
          setInsights(sanitizedInsights)
        } else {
          console.warn("⚠️ Invalid insights data structure:", insightsData)
          setInsights(null)
        }
      } else {
        console.warn("⚠️ No insights data received")
        setInsights(null)
      }

      // Process other data with logging
      console.log("Processing chart data...")
      setAttentionWeekly(sanitizeAttention(attWRaw ?? []))
      setAttentionDaily(sanitizeAttention(attDRaw ?? []))
      setAttentionHourly(sanitizeAttention(attHRaw ?? []))

      setStudentsWeekly(sanitizeStudents(stuWRaw ?? []))
      setStudentsDaily(sanitizeStudents(stuDRaw ?? []))

      setCapacityTrends(sanitizeCapacity(capRaw ?? []))

      // Process enhanced EDA data
      console.log("Processing enhanced EDA data...")
      setAttendanceWeekly(sanitizeAttendance(attendanceWRaw ?? []))
      setAttendanceDaily(sanitizeAttendance(attendanceDRaw ?? []))
      setAttendanceHourly(sanitizeAttendance(attendanceHRaw ?? []))
      
      setEnhancedAttentionWeekly(sanitizeEnhancedAttention(enhancedAttWRaw ?? []))
      setEnhancedAttentionDaily(sanitizeEnhancedAttention(enhancedAttDRaw ?? []))
      setEnhancedAttentionHourly(sanitizeEnhancedAttention(enhancedAttHRaw ?? []))
      
      // Safely set correlation and performance data
      if (correlationRaw && typeof correlationRaw === 'object') {
        setCorrelationData(correlationRaw)
      } else {
        console.warn("Invalid correlation data:", correlationRaw)
        setCorrelationData(null)
      }
      
      if (performanceRaw && typeof performanceRaw === 'object') {
        setPerformanceSummary(performanceRaw)
      } else {
        console.warn("Invalid performance summary data:", performanceRaw)
        setPerformanceSummary(null)
      }

      console.log("Data fetch completed successfully")
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error("Error fetching data:", errorMsg)
      setError(`Failed to fetch data: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const handleChartClick = (chartId: ChartType) => {
    setExpandedChart(expandedChart === chartId ? null : chartId)
  }

  console.log(insights)
  const getChartData = (
    type: "attention" | "students"
  ): AttentionData[] | StudentData[] => {
    switch (viewMode) {
      case "hourly":
        return type === "attention" ? attentionHourly : studentsHourly
      case "daily":
        return type === "attention" ? attentionDaily : studentsDaily
      case "weekly":
        return type === "attention" ? attentionWeekly : studentsWeekly
      default:
        return []
    }
  }

  const getAttendanceData = (): AttendanceData[] => {
    switch (viewMode) {
      case "hourly":
        return attendanceHourly
      case "daily":
        return attendanceDaily
      case "weekly":
        return attendanceWeekly
      default:
        return []
    }
  }

  const getEnhancedAttentionData = (): EnhancedAttentionData[] => {
    switch (viewMode) {
      case "hourly":
        return enhancedAttentionHourly
      case "daily":
        return enhancedAttentionDaily
      case "weekly":
        return enhancedAttentionWeekly
      default:
        return []
    }
  }

  const getXAxisKey = (): string => {
    switch (viewMode) {
      case "hourly":
        return "hour"
      case "daily":
        return "date"
      case "weekly":
        return "week"
      default:
        return "hour"
    }
  }

  const formatXAxisLabel = (value: any): string => {
    switch (viewMode) {
      case "hourly":
        return `${value}:00`
      case "daily":
        return formatDateLabel(value)
      case "weekly":
        return `Week ${value}`
      default:
        return String(value)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
        <div className="text-gray-200 text-2xl font-medium animate-pulse">
          Loading ClassSight Analytics...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-300 text-2xl font-medium mb-4">
            Error Loading Dashboard
          </div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button 
            onClick={fetchData}
            className="px-6 py-3 bg-[#1E293B] text-gray-200 rounded-2xl hover:bg-[#334155] transition-colors border border-[#334155]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#0A0E27]">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Classroom Analytics & Performance Insights
        </p>
      </div>

      {/* Controls */}
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-3">{(["hourly", "daily", "weekly"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 sm:px-6 py-3 rounded-2xl font-medium transition-all duration-200 text-sm sm:text-base ${
                  viewMode === mode
                    ? "bg-[#4338CA] text-white border border-[#4338CA]"
                    : "bg-[#1E293B] text-gray-300 hover:bg-[#334155] border border-[#334155]"
                }`}
              >
                <Filter className="w-4 h-4 inline mr-2" />
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {viewMode === "hourly" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-2xl bg-[#1E293B] border border-[#334155] text-gray-200 focus:border-[#4338CA] focus:outline-none text-sm sm:text-base"
            />
          )}
        </div>
      </div>

      {/* Insights Cards */}
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
        <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
              <Brain className="w-4 h-4 mr-2 text-[#6366F1]" />
              Overall Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">
              {insights?.overall_attention?.toFixed(1) || '0.0'}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
              <Users className="w-4 h-4 mr-2 text-[#6366F1]" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">
              {insights?.total_sessions || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-[#6366F1]" />
              Peak Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">
              {insights?.peak_attention_hour || 9}:00
            </div>
            <p className="text-xs text-gray-400">
              {insights?.peak_attention_score?.toFixed(1) || '0.0'}% attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-[#6366F1]" />
              Best Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold text-white">
              {insights?.best_day_of_week || "Monday"}
            </div>
            <p className="text-xs text-gray-400">
              {insights?.best_day_attention?.toFixed(1) || '0.0'}% attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-[#6366F1]" />
              Capacity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold text-white capitalize">
              {insights?.capacity_trend || "stable"}
            </div>
            <p className="text-xs text-gray-400">
              {insights?.recent_capacity?.toFixed(1) || '0.0'} avg students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
              <Eye className="w-4 h-4 mr-2 text-[#6366F1]" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">
              {insights?.overall_attendance?.toFixed(1) || '0.0'}%
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Enhanced EDA Insights Cards */}
      {(correlationData || performanceSummary) && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {correlationData && (
            <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-[#10B981]" />
                  Attendance-Attention Correlation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-white">
                  {correlationData.correlation.toFixed(3)}
                </div>
                <p className="text-xs text-gray-400">
                  {correlationData.correlation > 0.5 ? "Strong positive" : 
                   correlationData.correlation > 0.3 ? "Moderate positive" : 
                   correlationData.correlation > 0 ? "Weak positive" : "Negative"} correlation
                </p>
              </CardContent>
            </Card>
          )}

          {performanceSummary?.best_day && (
            <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-[#10B981]" />
                  Best Performing Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-white">
                  {new Date(performanceSummary.best_day).toLocaleDateString()}
                </div>
                <p className="text-xs text-gray-400">
                  {performanceSummary.best_day_attendance.toFixed(1)}% attendance
                </p>
              </CardContent>
            </Card>
          )}

          {performanceSummary?.worst_day && (
            <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-[#EF4444]" />
                  Needs Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-white">
                  {new Date(performanceSummary.worst_day).toLocaleDateString()}
                </div>
                <p className="text-xs text-gray-400">
                  {performanceSummary.worst_day_attendance.toFixed(1)}% attendance
                </p>
              </CardContent>
            </Card>
          )}

          {performanceSummary && (
            <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 text-white hover:bg-[#334155]/60 transition-all duration-200 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-[#10B981]" />
                  Optimal Time Slot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-white">
                  {performanceSummary.best_time_slot}:00
                </div>
                <p className="text-xs text-gray-400">
                  {performanceSummary.best_time_attention.toFixed(1)}% attention
                </p>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      )}

      {/* Charts Sections */}
      
      {/* Enhanced Attendance Analytics Section */}
      <div className="mx-4 sm:mx-6 lg:mx-8 space-y-4 md:space-y-6 mb-8">
        <div className="border-b border-[#334155] pb-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-2">
            Attendance Analytics
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            Comprehensive attendance patterns and trends with percentage calculations
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 w-full">
          {/* Attendance Percentage Chart */}
          <Card
            className={`bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 cursor-pointer transition-all duration-300 hover:bg-[#334155]/60 rounded-2xl shadow-lg shadow-[#0A0E27]/20 ${
              expandedChart === "attendance" ? "lg:col-span-2" : ""
            }`}
            onClick={() => handleChartClick("attendance")}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg md:text-xl font-semibold flex items-center">
                <Eye className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#6366F1]" />
                Attendance Percentage ({viewMode.charAt(0).toUpperCase() + viewMode.slice(1)})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Student attendance rates over time
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={expandedChart === "attendance" ? "h-[350px] md:h-[450px]" : "h-[250px] md:h-[300px]"}>
                {getAttendanceData().length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No attendance data to display</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getAttendanceData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey={getXAxisKey()}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={formatXAxisLabel}
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          border: "1px solid #334155",
                          borderRadius: "16px",
                          color: "#f1f5f9",
                        }}
                        formatter={(value: any, name: any) => [
                          `${Math.round(Number(value))}${name === "attendance_pct" ? "%" : ""}`,
                          name === "attendance_pct" ? "Attendance %" : "Students",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="attendance_pct"
                        connectNulls
                        stroke="#6366F1"
                        strokeWidth={3}
                        dot={{ fill: "#6366F1", strokeWidth: 1, r: 4 }}
                        activeDot={{ r: 6, stroke: "#6366F1", strokeWidth: 2 }}
                        name="Attendance %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Attention vs Distraction with Min/Max */}
          <Card
            className={`bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 cursor-pointer transition-all duration-300 hover:bg-[#334155]/60 rounded-2xl shadow-lg shadow-[#0A0E27]/20 ${
              expandedChart === "enhanced-attention" ? "lg:col-span-2" : ""
            }`}
            onClick={() => handleChartClick("enhanced-attention")}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg md:text-xl font-semibold flex items-center">
                <Brain className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#6366F1]" />
                Enhanced Attention Analysis ({viewMode.charAt(0).toUpperCase() + viewMode.slice(1)})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Min, Max and Average attention/distraction rates
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={expandedChart === "enhanced-attention" ? "h-[350px] md:h-[450px]" : "h-[250px] md:h-[300px]"}>
                {getEnhancedAttentionData().length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No enhanced attention data to display</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getEnhancedAttentionData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey={getXAxisKey()}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={formatXAxisLabel}
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          border: "1px solid #334155",
                          borderRadius: "16px",
                          color: "#f1f5f9",
                        }}
                        formatter={(value: any, name: any) => [
                          `${Math.round(Number(value))}%`,
                          name.includes("max") ? `Max ${name.includes("attention") ? "Attention" : "Distraction"}` :
                          name.includes("min") ? `Min ${name.includes("attention") ? "Attention" : "Distraction"}` :
                          name.includes("attention") ? "Avg Attention" : "Avg Distraction",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="max_attention_rate"
                        connectNulls
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ fill: "#10B981", strokeWidth: 1, r: 3 }}
                        name="Max Attention"
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_attention_rate"
                        connectNulls
                        stroke="#6366F1"
                        strokeWidth={3}
                        dot={{ fill: "#6366F1", strokeWidth: 1, r: 4 }}
                        activeDot={{ r: 6, stroke: "#6366F1", strokeWidth: 2 }}
                        name="Avg Attention"
                      />
                      <Line
                        type="monotone"
                        dataKey="min_attention_rate"
                        connectNulls
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        dot={{ fill: "#8B5CF6", strokeWidth: 1, r: 3 }}
                        name="Min Attention"
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_distraction_rate"
                        connectNulls
                        stroke="#EF4444"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "#EF4444", strokeWidth: 1, r: 3 }}
                        name="Avg Distraction"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Student Count Analytics Section */}
      <div className="space-y-4 md:space-y-6">
        <div className="border-b border-[#334155] pb-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">
            Student Count Analytics
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            Student presence and classroom capacity insights
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 w-full">
          {/* Students Chart */}
          <Card
            className={`bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 cursor-pointer transition-all duration-300 hover:bg-[#334155]/60 rounded-2xl shadow-lg shadow-[#0A0E27]/20 ${
              expandedChart === "students" ? "lg:col-span-2" : ""
            }`}
            onClick={() => handleChartClick("students")}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg md:text-xl font-semibold flex items-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#6366F1]" />
                Max vs Min Students ({viewMode.charAt(0).toUpperCase() + viewMode.slice(1)})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Classroom occupancy patterns and trends
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={expandedChart === "students" ? "h-[350px] md:h-[450px]" : "h-[250px] md:h-[300px]"}>
                {(getChartData("students") as StudentData[]).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No students data to display</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData("students") as StudentData[]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey={getXAxisKey()}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={formatXAxisLabel}
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          border: "1px solid #334155",
                          borderRadius: "16px",
                          color: "#f1f5f9",
                        }}
                        formatter={(value: any, name: any) => [
                          `${Math.round(Number(value))}`,
                          name === "max_students_no" ? "Max Students" : "Min Students",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="max_students_no"
                        connectNulls
                        stroke="#6366F1"
                        strokeWidth={3}
                        dot={{ fill: "#6366F1", strokeWidth: 1, r: 4 }}
                        activeDot={{ r: 6, stroke: "#6366F1", strokeWidth: 2 }}
                        name="Max Students"
                      />
                      <Line
                        type="monotone"
                        dataKey="min_students_no"
                        connectNulls
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={{ fill: "#8B5CF6", strokeWidth: 1, r: 4 }}
                        activeDot={{ r: 6, stroke: "#8B5CF6", strokeWidth: 2 }}
                        name="Min Students"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Capacity Trends Chart */}
          <Card
            className={`bg-[#1E293B] border border-[#334155] cursor-pointer transition-all duration-300 hover:bg-[#334155] rounded-2xl ${
              expandedChart === "capacity" ? "lg:col-span-2" : ""
            }`}
            onClick={() => handleChartClick("capacity")}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg md:text-xl font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#6366F1]" />
                Student Capacity Trends
              </CardTitle>
              <CardDescription className="text-gray-400">
                Enrollment and capacity over time
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={expandedChart === "capacity" ? "h-[350px] md:h-[450px]" : "h-[250px] md:h-[300px]"}>
                {capacityTrends.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No capacity data to display</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={capacityTrends.length > 30 ? capacityTrends.slice(-30) : capacityTrends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="enrolledGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={formatDateLabel}
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          border: "1px solid #334155",
                          borderRadius: "16px",
                          color: "#f1f5f9",
                        }}
                        labelFormatter={formatDateLabel}
                        formatter={(value: any, name: any) => [
                          Math.round(Number(value)),
                          name === "students_enrolled"
                            ? "Enrolled"
                            : name === "avg_students_no"
                            ? "Average Present"
                            : name === "max_students_no"
                            ? "Maximum"
                            : "Minimum",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="students_enrolled"
                        connectNulls
                        stroke="#6366F1"
                        fill="url(#enrolledGradient)"
                        strokeWidth={2}
                        name="Enrolled"
                      />
                      <Area
                        type="monotone"
                        dataKey="avg_students_no"
                        connectNulls
                        stroke="#8B5CF6"
                        fill="url(#avgGradient)"
                        strokeWidth={2}
                        name="Average Present"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attention Insights Section */}
      <div className="space-y-4 md:space-y-6">
        <div className="border-b border-[#334155] pb-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">
            Attention Insights
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            Student engagement and focus analytics
          </p>
        </div>
        
        <div className="w-full">
          {/* Attention vs Distraction Chart */}
          <Card
            className={`bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 cursor-pointer transition-all duration-300 hover:bg-[#334155]/60 rounded-2xl shadow-lg shadow-[#0A0E27]/20 ${
              expandedChart === "attention" ? "" : ""
            }`}
            onClick={() => handleChartClick("attention")}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg md:text-xl font-semibold flex items-center">
                <Brain className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#6366F1]" />
                Attention vs Distraction ({viewMode.charAt(0).toUpperCase() + viewMode.slice(1)})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Classroom engagement patterns and focus levels over time
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={expandedChart === "attention" ? "h-[400px] md:h-[500px]" : "h-[300px] md:h-[350px]"}>
                {(getChartData("attention") as AttentionData[]).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No attention data to display</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData("attention") as AttentionData[]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey={getXAxisKey()}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={formatXAxisLabel}
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          border: "1px solid #334155",
                          borderRadius: "16px",
                          color: "#f1f5f9",
                        }}
                        formatter={(value: any, name: any) => [
                          `${Math.round(Number(value))}%`,
                          name === "avg_attention_rate" ? "Attention" : "Distraction",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_attention_rate"
                        connectNulls
                        stroke="#6366F1"
                        strokeWidth={3}
                        dot={{ fill: "#6366F1", strokeWidth: 1, r: 4 }}
                        activeDot={{ r: 6, stroke: "#6366F1", strokeWidth: 2 }}
                        name="Attention"
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_distraction_rate"
                        connectNulls
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={{ fill: "#8B5CF6", strokeWidth: 1, r: 4 }}
                        activeDot={{ r: 6, stroke: "#8B5CF6", strokeWidth: 2 }}
                        name="Distraction"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Click instruction */}
      <div className="text-center mt-8">
        <p className="text-gray-400 text-sm">
          Click on any chart to expand it for a better view
        </p>
      </div>

      {/* EDA-Style Key Insights Summary */}
      {(correlationData || performanceSummary) && (
        <div className="space-y-4 md:space-y-6 mt-12">
          <div className="border-b border-[#334155] pb-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">
              Key Insights & Recommendations
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              Data-driven insights and actionable recommendations
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights Card */}
            <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
              <CardHeader>
                <CardTitle className="text-white text-lg font-semibold flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-[#10B981]" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-3">
                {correlationData && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#6366F1] rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm">
                      <strong>Correlation Analysis:</strong> There is a{" "}
                      {correlationData.correlation > 0.5 ? "strong" : 
                       correlationData.correlation > 0.3 ? "moderate" : "weak"} 
                      {" "}correlation ({correlationData.correlation.toFixed(3)}) between attendance and attention rates.
                    </p>
                  </div>
                )}
                
                {performanceSummary?.best_day && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm">
                      <strong>Best Performance:</strong> {new Date(performanceSummary.best_day).toLocaleDateString()} 
                      achieved the highest attendance ({performanceSummary.best_day_attendance.toFixed(1)}%) 
                      with {performanceSummary.best_day_attention.toFixed(1)}% attention rate.
                    </p>
                  </div>
                )}
                
                {performanceSummary?.worst_day && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#EF4444] rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm">
                      <strong>Improvement Needed:</strong> {new Date(performanceSummary.worst_day).toLocaleDateString()} 
                      had the lowest attendance ({performanceSummary.worst_day_attendance.toFixed(1)}%) 
                      requiring attention.
                    </p>
                  </div>
                )}
                
                {performanceSummary && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#8B5CF6] rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm">
                      <strong>Optimal Time:</strong> {performanceSummary.best_time_slot}:00 shows peak attention 
                      ({performanceSummary.best_time_attention.toFixed(1)}%) - ideal for important content.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations Card */}
            <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
              <CardHeader>
                <CardTitle className="text-white text-lg font-semibold flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-[#6366F1]" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">
                    <strong>Schedule Optimization:</strong> Focus on improving attendance during low-performing time slots and days.
                  </p>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#6366F1] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">
                    <strong>Content Planning:</strong> Schedule important content during high-attention periods for maximum impact.
                  </p>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#8B5CF6] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">
                    <strong>Engagement Strategies:</strong> Implement interventions during time slots with high distraction rates.
                  </p>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#EF4444] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">
                    <strong>Continuous Monitoring:</strong> Track the relationship between attendance and attention for ongoing optimization.
                  </p>
                </div>
                
                {correlationData && correlationData.correlation > 0.3 && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#F59E0B] rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm">
                      <strong>Attendance Impact:</strong> Given the positive correlation, improving attendance may boost attention levels.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}