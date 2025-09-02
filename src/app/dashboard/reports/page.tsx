'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Users,
  Clock,
  MoreHorizontal,
  Filter,
  Plus,
  AlertCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { reportsAPI, Report, Bootcamp } from '@/lib/reports-api'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBootcamp, setSelectedBootcamp] = useState<string>('all')
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  // Generate report form state
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [isDateRange, setIsDateRange] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportBootcamp, setReportBootcamp] = useState<string>('all')

  useEffect(() => {
    loadReports()
    loadBootcamps()
  }, [selectedBootcamp])

  const loadReports = async () => {
    try {
      setLoading(true)
      const params = selectedBootcamp !== 'all' ? { bootcamp_id: parseInt(selectedBootcamp) } : {}
      const data = await reportsAPI.getReports(params)
      setReports(data.reports)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const loadBootcamps = async () => {
    try {
      const data = await reportsAPI.getBootcamps()
      setBootcamps(data.bootcamps)
    } catch (err) {
      console.error('Failed to load bootcamps:', err)
    }
  }

  const handleGenerateReport = async () => {
    try {
      setGenerating(true)
      
      const request = {
        report_date: reportDate,
        ...(isDateRange && startDate && endDate && {
          date_range_start: startDate,
          date_range_end: endDate,
        }),
        ...(reportBootcamp !== 'all' && {
          bootcamp_id: parseInt(reportBootcamp)
        })
      }

      await reportsAPI.generateReport(request)
      setIsGenerateDialogOpen(false)
      
      // Reload reports to show the new one
      await loadReports()
      
      // Reset form
      setReportDate(new Date().toISOString().split('T')[0])
      setIsDateRange(false)
      setStartDate('')
      setEndDate('')
      setReportBootcamp('all')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (reportId: string, reportTitle: string) => {
    try {
      const blob = await reportsAPI.downloadReport(reportId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report')
    }
  }

  if (loading && reports.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading reports...</div>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4 md:space-y-6 w-full">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Reports</h1>
          <p className="text-gray-300 mt-1 sm:mt-2 text-sm sm:text-base">
            Daily reports and analytics for all your classrooms
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Bootcamp Filter */}
          <Select value={selectedBootcamp} onValueChange={setSelectedBootcamp}>
            <SelectTrigger className="w-[200px] bg-[#1a1a2e] border-[#2a3f5f] text-white rounded-xl h-12 hover:bg-[#1e2a47] focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by bootcamp" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-[#2a3f5f] rounded-xl shadow-2xl">
              <SelectItem value="all" className="text-white hover:bg-[#4338CA]/20 focus:bg-[#4338CA]/20 rounded-lg mx-1 my-1 cursor-pointer">
                All Bootcamps
              </SelectItem>
              {bootcamps.filter(bootcamp => bootcamp.bootcamp_id != null).map((bootcamp) => (
                <SelectItem 
                  key={bootcamp.bootcamp_id || `bootcamp-${bootcamp.bootcamp_name}`} 
                  value={bootcamp.bootcamp_id.toString()} 
                  className="text-white hover:bg-[#4338CA]/20 focus:bg-[#4338CA]/20 rounded-lg mx-1 my-1 cursor-pointer"
                >
                  {bootcamp.bootcamp_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Generate Report Button */}
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center bg-[#4338CA] hover:bg-[#3730A3] rounded-2xl">
                <Plus className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-[#16213e] rounded-2xl text-white max-w-md w-full mx-4">
              <DialogHeader>
                <DialogTitle className="text-white text-xl font-semibold">Generate New Report</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Create a new report for specific dates and bootcamps
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 pt-4">
                {/* Report Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">Report Type</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={!isDateRange ? "default" : "outline"}
                      onClick={() => setIsDateRange(false)}
                      className={`rounded-xl px-6 py-2 text-sm font-medium transition-all border-2 ${
                        !isDateRange 
                          ? 'bg-transparent border-white text-white hover:bg-[#4338CA] hover:border-[#4338CA]' 
                          : 'bg-transparent border-gray-400 text-gray-400 hover:bg-gray-400/10 hover:border-gray-300 hover:text-gray-300'
                      }`}
                    >
                      Daily Report
                    </Button>
                    <Button
                      type="button"
                      variant={isDateRange ? "default" : "outline"}
                      onClick={() => setIsDateRange(true)}
                      className={`rounded-xl px-6 py-2 text-sm font-medium transition-all border-2 ${
                        isDateRange 
                          ? 'bg-transparent border-white text-white hover:bg-[#4338CA] hover:border-[#4338CA]' 
                          : 'bg-transparent border-gray-400 text-gray-400 hover:bg-gray-400/10 hover:border-gray-300 hover:text-gray-300'
                      }`}
                    >
                      Date Range
                    </Button>
                  </div>
                </div>

                {/* Date Selection */}
                {!isDateRange ? (
                  <div className="space-y-3">
                    <Label htmlFor="reportDate" className="text-sm font-medium text-white">
                      Report Date
                    </Label>
                    <Input
                      id="reportDate"
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="bg-[#16213e] border-[#2a3f5f] text-white rounded-xl h-12 px-4 text-base focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA]"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="startDate" className="text-sm font-medium text-white">
                        Start Date
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-[#16213e] border-[#2a3f5f] text-white rounded-xl h-12 px-4 text-base focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA]"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="endDate" className="text-sm font-medium text-white">
                        End Date
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-[#16213e] border-[#2a3f5f] text-white rounded-xl h-12 px-4 text-base focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA]"
                      />
                    </div>
                  </div>
                )}

                {/* Bootcamp Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">Bootcamp (Optional)</Label>
                  <Select value={reportBootcamp} onValueChange={setReportBootcamp}>
                    <SelectTrigger className="bg-[#16213e] border-[#2a3f5f] text-white rounded-xl h-12 px-4 text-base focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] hover:bg-[#1e2a47]">
                      <SelectValue placeholder="Select bootcamp" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-[#2a3f5f] rounded-xl shadow-2xl">
                      <SelectItem value="all" className="text-white hover:bg-[#4338CA]/20 focus:bg-[#4338CA]/20 rounded-lg mx-1 my-1 cursor-pointer">
                        All Bootcamps
                      </SelectItem>
                      {bootcamps.filter(bootcamp => bootcamp.bootcamp_id != null).map((bootcamp) => (
                        <SelectItem 
                          key={bootcamp.bootcamp_id || `bootcamp-${bootcamp.bootcamp_name}`} 
                          value={bootcamp.bootcamp_id.toString()} 
                          className="text-white hover:bg-[#4338CA]/20 focus:bg-[#4338CA]/20 rounded-lg mx-1 my-1 cursor-pointer"
                        >
                          {bootcamp.bootcamp_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate Button */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsGenerateDialogOpen(false)}
                    className="rounded-xl px-6 py-2 bg-transparent border-2 border-gray-500 text-gray-300 hover:bg-gray-500/10 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGenerateReport}
                    disabled={generating || (!reportDate && (!startDate || !endDate))}
                    className="bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-xl px-6 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4 w-full">
        {reports.length === 0 ? (
          <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Reports Yet</h3>
              <p className="text-gray-400 mb-4">Generate your first report to see analytics and insights.</p>
              <Button
                onClick={() => setIsGenerateDialogOpen(true)}
                className="bg-[#4338CA] hover:bg-[#3730A3] rounded-2xl"
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate First Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          reports.filter(report => report.id != null).map((report) => {
            return (
              <Card key={report.id || `report-${Date.now()}-${Math.random()}`} className="hover:shadow-md transition-shadow bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 w-full rounded-2xl shadow-lg shadow-[#0A0E27]/20">
                <CardHeader className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#4338CA]/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-[#4338CA]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg text-white truncate">{report.title}</CardTitle>
                        <CardDescription className="flex items-center mt-1 text-gray-400 text-sm">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {new Date(report.report_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </CardDescription>
                        {report.bootcamp_name && (
                          <Badge variant="secondary" className="mt-1 bg-blue-900/30 text-blue-400 border-blue-500/30 text-xs rounded-xl">
                            {report.bootcamp_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 self-start sm:self-center">
                      <Badge variant="secondary" className="bg-green-900/30 text-green-400 border-green-500/30 text-xs rounded-xl">
                        {report.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white rounded-xl hover:bg-[#4338CA]/20">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-[#2a3f5f] rounded-xl shadow-2xl">
                          <DropdownMenuItem 
                            className="text-white hover:text-white hover:bg-[#4338CA]/20 rounded-lg mx-1 my-1 cursor-pointer"
                            onClick={() => handleDownload(report.id, report.title)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                    <div className="bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl p-3 md:p-4 shadow-md shadow-[#0A0E27]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-400">Total Sessions</p>
                          <p className="text-lg md:text-2xl font-bold text-white">{report.summary.totalSessions}</p>
                        </div>
                        <Clock className="h-6 w-6 md:h-8 md:w-8 text-gray-500" />
                      </div>
                    </div>

                    <div className="bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl p-3 md:p-4 shadow-md shadow-[#0A0E27]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-400">Avg Attendance</p>
                          <p className="text-lg md:text-2xl font-bold text-white">{report.summary.averageAttendance}%</p>
                        </div>
                        <Users className="h-6 w-6 md:h-8 md:w-8 text-gray-500" />
                      </div>
                    </div>

                    <div className="bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl p-3 md:p-4 shadow-md shadow-[#0A0E27]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-400">Avg Occupancy</p>
                          <p className="text-lg md:text-2xl font-bold text-white">{report.summary.averageOccupancy}%</p>
                        </div>
                        <Eye className="h-6 w-6 md:h-8 md:w-8 text-gray-500" />
                      </div>
                    </div>

                    <div className="bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl p-3 md:p-4 shadow-md shadow-[#0A0E27]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-400">Peak Occupancy</p>
                          <p className="text-lg md:text-2xl font-bold text-white">{report.summary.peakOccupancy}%</p>
                        </div>
                        <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-gray-500" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#334155]">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>Generated on {new Date(report.created_at).toLocaleString()}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center bg-[#1E293B] border-[#334155] text-white hover:bg-[#334155] rounded-xl"
                        onClick={() => handleDownload(report.id, report.title)}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}