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
  Info,
} from "lucide-react"

const API_BASE_URL = "http://localhost:8000"

// Info Tooltip Component
const InfoTooltip = ({ content }: { content: string }) => {
  const [isVisible, setIsVisible] = useState(false)
  
  return (
    <div className="relative inline-block">
      <Info 
        className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      />
      {isVisible && (
        <div className="absolute top-6 right-0 z-50 w-64 p-3 bg-[#1E2A47] border border-[#2A3951] rounded-lg shadow-lg text-sm text-gray-300">
          {content}
          <div className="absolute -top-1 right-2 w-2 h-2 bg-[#1E2A47] border-l border-t border-[#2A3951] transform rotate-45"></div>
        </div>
      )}
    </div>
  )
}

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

interface DailyAggregateData {
  date: string
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

interface WeeklyAggregateData {
  week: number
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

interface HalfHourlyAggregateData {
  time_label: string
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

type ViewMode = "hourly" | "daily" | "weekly" | "half-hourly"
type ChartType = "overview" | "attendance" | "attention" | "students" | "comparison" | "trends"

// Utility functions
const formatTimeLabel = (timeStr: string): string => {
  try {
    const time = new Date(`2000-01-01 ${timeStr}`)
    if (isNaN(time.getTime())) return timeStr
    
    const hour = time.getHours()
    const minute = time.getMinutes()
    
    if (hour >= 13) {
      const displayHour = hour - 12
      return minute === 0 ? `${displayHour}` : `${displayHour}:${minute.toString().padStart(2, '0')}`
    } else {
      return minute === 0 ? `${hour}` : `${hour}:${minute.toString().padStart(2, '0')}`
    }
  } catch {
    return timeStr
  }
}

const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

const processRawData = (rawData: ClassroomData[]): ProcessedData[] => {
  return rawData.map(item => {
    const date = new Date(item.date)
    const week = getWeekNumber(date)
    const timeLabel = formatTimeLabel(item.start_time)
    
    return {
      ...item,
      week,
      time_label: timeLabel,
      half_hour: `${item.date} ${item.start_time}`,
    }
  }).filter(item => {
    // Filter for allowed time range: 10–12 and 1–3 (like your EDA)
    try {
      const time = new Date(`2000-01-01 ${item.start_time}`)
      if (isNaN(time.getTime())) return false
      
      const hour = time.getHours()
      return (hour >= 10 && hour <= 12) || (hour >= 13 && hour <= 15)
    } catch {
      return false
    }
  })
}

const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0
  
  const meanX = x.reduce((sum, val) => sum + val, 0) / x.length
  const meanY = y.reduce((sum, val) => sum + val, 0) / y.length
  
  let numerator = 0
  let sumXSquared = 0
  let sumYSquared = 0
  
  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - meanX
    const yDiff = y[i] - meanY
    numerator += xDiff * yDiff
    sumXSquared += xDiff * xDiff
    sumYSquared += yDiff * yDiff
  }
  
  const denominator = Math.sqrt(sumXSquared * sumYSquared)
  return denominator === 0 ? 0 : numerator / denominator
}

const calculateSummaryStats = (data: ProcessedData[]): SummaryStats => {
  if (data.length === 0) {
    return {
      avg_attendance: 0, avg_attention: 0, avg_distraction: 0,
      avg_max_students: 0, avg_min_students: 0, avg_students_per_session: 0,
      correlation_attendance_attention: 0, total_sessions: 0,
      best_day: { date: "", attendance: 0, attention: 0 },
      worst_day: { date: "", attendance: 0, attention: 0 },
      best_time_slot: { time: "", attention: 0 },
      worst_time_slot: { time: "", attention: 0 },
    }
  }

  // Basic averages
  const avg_attendance = data.reduce((sum, item) => sum + item.attendance_pct, 0) / data.length
  const avg_attention = data.reduce((sum, item) => sum + item.avg_attention_rate, 0) / data.length
  const avg_distraction = data.reduce((sum, item) => sum + item.avg_distraction_rate, 0) / data.length
  const avg_max_students = data.reduce((sum, item) => sum + item.max_students_no, 0) / data.length
  const avg_min_students = data.reduce((sum, item) => sum + item.min_students_no, 0) / data.length
  const avg_students_per_session = data.reduce((sum, item) => sum + item.avg_students_no, 0) / data.length

  // Correlation
  const correlation_attendance_attention = calculateCorrelation(
    data.map(d => d.attendance_pct),
    data.map(d => d.avg_attention_rate)
  )

  // Daily analysis
  const dailyData = data.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item)
    return acc
  }, {} as Record<string, ProcessedData[]>)

  const dailyAverages = Object.entries(dailyData).map(([date, items]) => ({
    date,
    attendance: items.reduce((sum, item) => sum + item.attendance_pct, 0) / items.length,
    attention: items.reduce((sum, item) => sum + item.avg_attention_rate, 0) / items.length
  }))

  const best_day = dailyAverages.reduce((best, current) => 
    current.attendance > best.attendance ? current : best
  )
  const worst_day = dailyAverages.reduce((worst, current) => 
    current.attendance < worst.attendance ? current : worst
  )

  // Time slot analysis
  const timeSlotData = data.reduce((acc, item) => {
    if (!acc[item.time_label]) acc[item.time_label] = []
    acc[item.time_label].push(item)
    return acc
  }, {} as Record<string, ProcessedData[]>)

  const timeSlotAverages = Object.entries(timeSlotData).map(([time, items]) => ({
    time,
    attention: items.reduce((sum, item) => sum + item.avg_attention_rate, 0) / items.length
  }))

  const best_time_slot = timeSlotAverages.reduce((best, current) => 
    current.attention > best.attention ? current : best
  )
  const worst_time_slot = timeSlotAverages.reduce((worst, current) => 
    current.attention < worst.attention ? current : worst
  )

  return {
    avg_attendance, avg_attention, avg_distraction,
    avg_max_students, avg_min_students, avg_students_per_session,
    correlation_attendance_attention, total_sessions: data.length,
    best_day, worst_day, best_time_slot, worst_time_slot,
  }
}

export default function EnhancedDashboard() {
  // State management
  const [rawData, setRawData] = useState<ClassroomData[]>([])
  const [processedData, setProcessedData] = useState<ProcessedData[]>([])
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [chartType, setChartType] = useState<ChartType>("overview")
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )

  // Data fetching
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/classroom-data?limit=1000`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setRawData(data)
      
      const processed = processRawData(data)
      setProcessedData(processed)
      
      const stats = calculateSummaryStats(processed)
      setSummaryStats(stats)
      
    } catch (err) {
      console.error("Error fetching data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Update selected date to a date with actual data when data is loaded
  useEffect(() => {
    if (processedData.length > 0 && selectedDate === new Date().toISOString().split("T")[0]) {
      // If current date has no data, use the latest date with data
      const availableDates = [...new Set(processedData.map(item => item.date))].sort()
      const currentDateStr = new Date().toISOString().split("T")[0]
      
      if (!availableDates.includes(currentDateStr)) {
        // Use the most recent date with data
        const latestDate = availableDates[availableDates.length - 1]
        setSelectedDate(latestDate)
        console.log("Set selected date to latest available:", latestDate)
      }
    }
  }, [processedData, selectedDate])

  // Data aggregation functions
  const getDailyAggregateData = (): DailyAggregateData[] => {
    const dailyGroups = processedData.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = []
      acc[item.date].push(item)
      return acc
    }, {} as Record<string, ProcessedData[]>)

    return Object.entries(dailyGroups)
      .map(([date, items]) => ({
        date,
        attendance_pct: items.reduce((sum, item) => sum + item.attendance_pct, 0) / items.length,
        avg_attention_rate: items.reduce((sum, item) => sum + item.avg_attention_rate, 0) / items.length,
        avg_distraction_rate: items.reduce((sum, item) => sum + item.avg_distraction_rate, 0) / items.length,
        max_attention_rate: Math.max(...items.map(item => item.max_attention_rate)),
        max_distraction_rate: Math.max(...items.map(item => item.max_distraction_rate)),
        min_attention_rate: Math.min(...items.map(item => item.min_attention_rate)),
        min_distraction_rate: Math.min(...items.map(item => item.min_distraction_rate)),
        avg_students_no: items.reduce((sum, item) => sum + item.avg_students_no, 0) / items.length,
        max_students_no: items.reduce((sum, item) => sum + item.max_students_no, 0) / items.length,
        min_students_no: items.reduce((sum, item) => sum + item.min_students_no, 0) / items.length,
        students_enrolled: items.reduce((sum, item) => sum + item.students_enrolled, 0) / items.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const getWeeklyAggregateData = (): WeeklyAggregateData[] => {
    const weeklyGroups = processedData.reduce((acc, item) => {
      if (!acc[item.week]) acc[item.week] = []
      acc[item.week].push(item)
      return acc
    }, {} as Record<number, ProcessedData[]>)

    return Object.entries(weeklyGroups)
      .map(([week, items]) => ({
        week: parseInt(week),
        attendance_pct: items.reduce((sum, item) => sum + item.attendance_pct, 0) / items.length,
        avg_attention_rate: items.reduce((sum, item) => sum + item.avg_attention_rate, 0) / items.length,
        avg_distraction_rate: items.reduce((sum, item) => sum + item.avg_distraction_rate, 0) / items.length,
        max_attention_rate: Math.max(...items.map(item => item.max_attention_rate)),
        max_distraction_rate: Math.max(...items.map(item => item.max_distraction_rate)),
        min_attention_rate: Math.min(...items.map(item => item.min_attention_rate)),
        min_distraction_rate: Math.min(...items.map(item => item.min_distraction_rate)),
        avg_students_no: items.reduce((sum, item) => sum + item.avg_students_no, 0) / items.length,
        max_students_no: items.reduce((sum, item) => sum + item.max_students_no, 0) / items.length,
        min_students_no: items.reduce((sum, item) => sum + item.min_students_no, 0) / items.length,
        students_enrolled: items.reduce((sum, item) => sum + item.students_enrolled, 0) / items.length,
      }))
      .sort((a, b) => a.week - b.week)
  }

  const getHalfHourlyAggregateData = (): HalfHourlyAggregateData[] => {
    const timeGroups = processedData.reduce((acc, item) => {
      if (!acc[item.time_label]) acc[item.time_label] = []
      acc[item.time_label].push(item)
      return acc
    }, {} as Record<string, ProcessedData[]>)

    console.log("Half-hourly time groups:", timeGroups)

    const timeOrder = ["10", "10:30", "11", "11:30", "12", "1", "1:30", "2", "2:30", "3"]

    const result = Object.entries(timeGroups)
      .map(([time_label, items]) => ({
        time_label,
        attendance_pct: items.reduce((sum, item) => sum + item.attendance_pct, 0) / items.length,
        avg_attention_rate: items.reduce((sum, item) => sum + item.avg_attention_rate, 0) / items.length,
        avg_distraction_rate: items.reduce((sum, item) => sum + item.avg_distraction_rate, 0) / items.length,
        max_attention_rate: Math.max(...items.map(item => item.max_attention_rate)),
        max_distraction_rate: Math.max(...items.map(item => item.max_distraction_rate)),
        min_attention_rate: Math.min(...items.map(item => item.min_attention_rate)),
        min_distraction_rate: Math.min(...items.map(item => item.min_distraction_rate)),
        avg_students_no: items.reduce((sum, item) => sum + item.avg_students_no, 0) / items.length,
        max_students_no: items.reduce((sum, item) => sum + item.max_students_no, 0) / items.length,
        min_students_no: items.reduce((sum, item) => sum + item.min_students_no, 0) / items.length,
        students_enrolled: items.reduce((sum, item) => sum + item.students_enrolled, 0) / items.length,
      }))
      .sort((a, b) => timeOrder.indexOf(a.time_label) - timeOrder.indexOf(b.time_label))
    
    console.log("Half-hourly result:", result)
    return result
  }

  const getHourlyDataForDate = (date: string) => {
    console.log("Filtering for date:", date)
    console.log("Available dates:", [...new Set(processedData.map(item => item.date))])
    const filtered = processedData
      .filter(item => item.date === date)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
    console.log("Filtered hourly data:", filtered)
    return filtered
  }

  // Get current data based on view mode
  const getCurrentData = () => {
    switch (viewMode) {
      case "hourly":
        return getHourlyDataForDate(selectedDate)
      case "daily":
        return getDailyAggregateData()
      case "weekly":
        return getWeeklyAggregateData()
      case "half-hourly":
        return getHalfHourlyAggregateData()
      default:
        return []
    }
  }

  const currentData = getCurrentData()

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ClassSight Analytics...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <div className="text-red-600 text-xl mb-4">Error Loading Data</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-[#0B1426] min-h-screen">
      {/* Header */}
      <div className="bg-[#162033] rounded-xl shadow-lg p-6 border border-[#1E2A47]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-[#4F7FFF]" />
              ClassSight Analytics Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Comprehensive attendance and engagement analysis
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger className="w-36 bg-[#1E2A47] border-[#2A3951] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E2A47] border-[#2A3951]">
                <SelectItem value="hourly" className="text-white hover:bg-[#2A3951]">Hourly</SelectItem>
                <SelectItem value="daily" className="text-white hover:bg-[#2A3951]">Daily</SelectItem>
                <SelectItem value="weekly" className="text-white hover:bg-[#2A3951]">Weekly</SelectItem>
                <SelectItem value="half-hourly" className="text-white hover:bg-[#2A3951]">Half-Hourly</SelectItem>
              </SelectContent>
            </Select>

            <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
              <SelectTrigger className="w-40 bg-[#1E2A47] border-[#2A3951] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E2A47] border-[#2A3951]">
                <SelectItem value="overview" className="text-white hover:bg-[#2A3951]">Overview</SelectItem>
                <SelectItem value="attendance" className="text-white hover:bg-[#2A3951]">Attendance</SelectItem>
                <SelectItem value="attention" className="text-white hover:bg-[#2A3951]">Attention</SelectItem>
                <SelectItem value="students" className="text-white hover:bg-[#2A3951]">Students</SelectItem>
                <SelectItem value="comparison" className="text-white hover:bg-[#2A3951]">Comparison</SelectItem>
                <SelectItem value="trends" className="text-white hover:bg-[#2A3951]">Trends</SelectItem>
              </SelectContent>
            </Select>

            {viewMode === "hourly" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-[#1E2A47] border border-[#2A3951] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F7FFF]"
              />
            )}

            <Button onClick={fetchData} variant="outline" className="gap-2 bg-[#1E2A47] border-[#2A3951] text-white hover:bg-[#2A3951]">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#162033] border-[#1E2A47]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Average Attendance</CardTitle>
              <Users className="h-4 w-4 text-[#4F7FFF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#4F7FFF]">
                {summaryStats.avg_attendance.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-400">
                {summaryStats.total_sessions} total sessions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#162033] border-[#1E2A47]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Average Attention</CardTitle>
              <Brain className="h-4 w-4 text-[#4F7FFF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#4F7FFF]">
                {summaryStats.avg_attention.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-400">
                Best: {summaryStats.best_time_slot.time} ({summaryStats.best_time_slot.attention.toFixed(1)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#162033] border-[#1E2A47]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Average Distraction</CardTitle>
              <Eye className="h-4 w-4 text-[#4F7FFF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#4F7FFF]">
                {summaryStats.avg_distraction.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-400">
                Correlation: {summaryStats.correlation_attendance_attention.toFixed(3)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#162033] border-[#1E2A47]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Avg Students/Session</CardTitle>
              <Target className="h-4 w-4 text-[#4F7FFF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#4F7FFF]">
                {summaryStats.avg_students_per_session.toFixed(1)}
              </div>
              <p className="text-xs text-gray-400">
                Range: {summaryStats.avg_min_students.toFixed(1)} - {summaryStats.avg_max_students.toFixed(1)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        {(chartType === "overview" || chartType === "attendance") && (
          <Card className="bg-[#162033] border-[#1E2A47]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Attendance Trends
                </div>
                <InfoTooltip content="Shows attendance percentage over time. Hourly view displays data for the selected specific date, while daily/weekly views show trends over time periods. Use this to identify patterns and plan interventions." />
              </CardTitle>
              <CardDescription className="text-gray-400">
                Attendance percentage over time with trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3951" />
                  <XAxis 
                    dataKey={
                      viewMode === "weekly" ? "week" : 
                      viewMode === "daily" ? "date" : 
                      viewMode === "half-hourly" ? "time_label" : "time_label"
                    }
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    tickFormatter={(value) => {
                      if (viewMode === "daily") {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1E2A47',
                      border: '1px solid #2A3951',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                    formatter={(value: any, name: string) => {
                      // Only show tooltip for the line, not the bar
                      if (name === "Attendance") {
                        return [`${Number(value).toFixed(1)}%`, "Attendance"]
                      }
                      return null
                    }}
                    labelFormatter={(label) => {
                      if (viewMode === "daily") {
                        return new Date(label).toLocaleDateString()
                      }
                      return `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}: ${label}`
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance_pct" 
                    stroke="#4F7FFF" 
                    strokeWidth={2}
                    dot={{ fill: "#4F7FFF", strokeWidth: 2, r: 4 }}
                    name="Attendance"
                  />
                  <Bar 
                    dataKey="attendance_pct" 
                    fill="#4F7FFF" 
                    fillOpacity={0.2}
                    name=""
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Attention vs Distraction */}
        {(chartType === "overview" || chartType === "attention") && (
          <Card className="bg-[#162033] border-[#1E2A47]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Attention vs Distraction Analysis
                </div>
                <InfoTooltip content="Compares attention and distraction rates over time. Blue line shows attention levels, gray line shows distraction levels. Half-hourly view averages across all sessions for each time slot to show optimal learning periods." />
              </CardTitle>
              <CardDescription className="text-gray-400">
                Comparison of attention and distraction rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3951" />
                  <XAxis 
                    dataKey={
                      viewMode === "weekly" ? "week" : 
                      viewMode === "daily" ? "date" : 
                      viewMode === "half-hourly" ? "time_label" : "time_label"
                    }
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    tickFormatter={(value) => {
                      if (viewMode === "daily") {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1E2A47',
                      border: '1px solid #2A3951',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                    formatter={(value: any, name: string) => [
                      `${Number(value).toFixed(1)}%`, 
                      name === "Attention Rate" ? "Attention" : "Distraction"
                    ]}
                    labelFormatter={(label) => {
                      if (viewMode === "daily") {
                        return new Date(label).toLocaleDateString()
                      }
                      return `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}: ${label}`
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avg_attention_rate" 
                    stroke="#4F7FFF" 
                    strokeWidth={2}
                    name="Attention Rate"
                    dot={{ fill: "#4F7FFF", r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg_distraction_rate" 
                    stroke="#8B9DC3" 
                    strokeWidth={2}
                    name="Distraction Rate"
                    dot={{ fill: "#8B9DC3", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Student Numbers Analysis */}
        {(chartType === "overview" || chartType === "students") && (
          <Card className="bg-[#162033] border-[#1E2A47]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Student Numbers Analysis
                </div>
                <InfoTooltip content="Shows the distribution of student numbers per session. Tracks maximum, average, and minimum student counts to help with capacity planning and identifying peak attendance periods." />
              </CardTitle>
              <CardDescription className="text-gray-400">
                Average, maximum, and minimum students per session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3951" />
                  <XAxis 
                    dataKey={
                      viewMode === "weekly" ? "week" : 
                      viewMode === "daily" ? "date" : 
                      viewMode === "half-hourly" ? "time_label" : "time_label"
                    }
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    tickFormatter={(value) => {
                      if (viewMode === "daily") {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1E2A47',
                      border: '1px solid #2A3951',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                    formatter={(value: any, name: string) => {
                      const formattedValue = `${Number(value).toFixed(1)}`
                      if (name === "Max Students") {
                        return [formattedValue, "Max Students"]
                      } else if (name === "Avg Students") {
                        return [formattedValue, "Avg Students"]
                      } else if (name === "Min Students") {
                        return [formattedValue, "Min Students"]
                      }
                      return [formattedValue, name]
                    }}
                    labelFormatter={(label) => {
                      if (viewMode === "daily") {
                        return new Date(label).toLocaleDateString()
                      }
                      return `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}: ${label}`
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="max_students_no" 
                    stackId="1"
                    stroke="#4F7FFF" 
                    fill="#4F7FFF" 
                    fillOpacity={0.3}
                    name="Max Students"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avg_students_no" 
                    stackId="2"
                    stroke="#6B7FBF" 
                    fill="#6B7FBF" 
                    fillOpacity={0.5}
                    name="Avg Students"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="min_students_no" 
                    stackId="3"
                    stroke="#8B9DC3" 
                    fill="#8B9DC3" 
                    fillOpacity={0.3}
                    name="Min Students"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Max Attention vs Max Distraction Comparison */}
        {(chartType === "overview" || chartType === "comparison") && (
          <Card className="bg-[#162033] border-[#1E2A47]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Peak Performance Comparison
                </div>
                <InfoTooltip content="Compares maximum attention and distraction rates during sessions. Shows the highest recorded levels to identify best and worst performance periods. Useful for understanding peak engagement potential." />
              </CardTitle>
              <CardDescription className="text-gray-400">
                Maximum attention vs maximum distraction rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3951" />
                  <XAxis 
                    dataKey={
                      viewMode === "weekly" ? "week" : 
                      viewMode === "daily" ? "date" : 
                      viewMode === "half-hourly" ? "time_label" : "time_label"
                    }
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    tickFormatter={(value) => {
                      if (viewMode === "daily") {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1E2A47',
                      border: '1px solid #2A3951',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                    formatter={(value: any, name: string) => {
                      const formattedValue = `${Number(value).toFixed(1)}%`
                      if (name === "Max Attention") {
                        return [formattedValue, "Max Attention"]
                      } else if (name === "Max Distraction") {
                        return [formattedValue, "Max Distraction"]
                      } else if (name === "Min Attention") {
                        return [formattedValue, "Min Attention"]
                      } else if (name === "Min Distraction") {
                        return [formattedValue, "Min Distraction"]
                      }
                      return [formattedValue, name]
                    }}
                    labelFormatter={(label) => {
                      if (viewMode === "daily") {
                        return new Date(label).toLocaleDateString()
                      }
                      return `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}: ${label}`
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="max_attention_rate" 
                    fill="#4F7FFF" 
                    name="Max Attention"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="max_distraction_rate" 
                    fill="#8B9DC3" 
                    name="Max Distraction"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insights and Recommendations */}
      {summaryStats && (
        <Card className="bg-[#162033] border-[#1E2A47]">
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

                  <div className="flex items-center justify-between p-3 bg-[#1E2A47] rounded-lg border border-[#2A3951]">
                    <div>
                      <Badge variant="secondary" className="mb-1 bg-[#2A3951] text-gray-300">Correlation</Badge>
                      <p className="text-sm text-gray-300">Attendance-Attention</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#4F7FFF]">{summaryStats.correlation_attendance_attention.toFixed(3)}</div>
                      <div className="text-xs text-gray-400">correlation</div>
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

                  <div className="p-3 bg-[#1E2A47] rounded-lg border border-[#2A3951]">
                    <Badge variant="outline" className="mb-1 border-[#2A3951] text-gray-300">Focus Areas</Badge>
                    <p className="text-sm text-gray-400">Monitor correlation trends and engagement patterns</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-[#1E2A47] rounded-lg border border-[#2A3951]">
              <h4 className="font-semibold text-[#4F7FFF] mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Strategic Recommendations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-[#4F7FFF] mt-1">•</span>
                    Schedule important content during high-attention periods
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4F7FFF] mt-1">•</span>
                    Investigate low performance on identified days/times
                  </li>
                </ul>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-[#4F7FFF] mt-1">•</span>
                    Implement engagement strategies during low-attention slots
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4F7FFF] mt-1">•</span>
                    Optimize capacity based on student number trends
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Summary Table */}
      {summaryStats && (
        <Card className="bg-[#162033] border-[#1E2A47]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5 text-[#4F7FFF]" />
              Performance Summary Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A3951]">
                <th className="text-left py-2 px-4 font-semibold text-gray-300">Metric</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-300">Value</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-300">Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3951]">
              <tr className="hover:bg-[#1E2A47]">
                <td className="py-2 px-4 text-gray-300">Average Attendance</td>
                <td className="py-2 px-4 text-right font-mono text-[#4F7FFF]">{summaryStats.avg_attendance.toFixed(2)}%</td>
                <td className="py-2 px-4">
                  <Badge
                variant={summaryStats.avg_attendance >= 80 ? "secondary" : "destructive"}
                className={
                  summaryStats.avg_attendance >= 80
                    ? "bg-[#2A3951] text-[#4F7FFF] border-none"
                    : "bg-[#8B9DC3] text-white border-none"
                }
                  >
                {summaryStats.avg_attendance >= 80 ? "Good" : "Needs Improvement"}
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-[#1E2A47]">
                <td className="py-2 px-4 text-gray-300">Average Attention Rate</td>
                <td className="py-2 px-4 text-right font-mono text-[#4F7FFF]">{summaryStats.avg_attention.toFixed(2)}%</td>
                <td className="py-2 px-4">
                  <Badge
                variant={summaryStats.avg_attention >= 70 ? "secondary" : "destructive"}
                className={
                  summaryStats.avg_attention >= 70
                    ? "bg-[#2A3951] text-[#4F7FFF] border-none"
                    : "bg-[#8B9DC3] text-white border-none"
                }
                  >
                {summaryStats.avg_attention >= 70 ? "Good" : "Needs Improvement"}
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-[#1E2A47]">
                <td className="py-2 px-4 text-gray-300">Average Distraction Rate</td>
                <td className="py-2 px-4 text-right font-mono text-[#8B9DC3]">{summaryStats.avg_distraction.toFixed(2)}%</td>
                <td className="py-2 px-4">
                  <Badge
                variant={summaryStats.avg_distraction <= 30 ? "secondary" : "destructive"}
                className={
                  summaryStats.avg_distraction <= 30
                    ? "bg-[#2A3951] text-[#8B9DC3] border-none"
                    : "bg-[#8B9DC3] text-white border-none"
                }
                  >
                {summaryStats.avg_distraction <= 30 ? "Good" : "High"}
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-[#1E2A47]">
                <td className="py-2 px-4 text-gray-300">Students per Session (Avg)</td>
                <td className="py-2 px-4 text-right font-mono text-[#4F7FFF]">{summaryStats.avg_students_per_session.toFixed(1)}</td>
                <td className="py-2 px-4">
                  <Badge variant="outline" className="border-[#2A3951] text-gray-300 bg-transparent">
                Capacity Utilization
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-[#1E2A47]">
                <td className="py-2 px-4 text-gray-300">Attendance-Attention Correlation</td>
                <td className="py-2 px-4 text-right font-mono text-[#4F7FFF]">{summaryStats.correlation_attendance_attention.toFixed(3)}</td>
                <td className="py-2 px-4">
                  <Badge
                variant={Math.abs(summaryStats.correlation_attendance_attention) >= 0.5 ? "secondary" : "outline"}
                className={
                  Math.abs(summaryStats.correlation_attendance_attention) >= 0.5
                    ? "bg-[#2A3951] text-[#4F7FFF] border-none"
                    : "border-[#2A3951] text-gray-300 bg-transparent"
                }
                  >
                {Math.abs(summaryStats.correlation_attendance_attention) >= 0.5 ? "Strong" : "Moderate"}
                  </Badge>
                </td>
              </tr>
            </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
