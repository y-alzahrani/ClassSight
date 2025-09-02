'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { 
  User, 
  Bell, 
  Shield, 
  Key,
  Mail,
  Save,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'teacher' | 'student'
  avatar_url: string | null
  phone?: string | null
  department?: string | null
}

interface NotificationSettings {
  email_reports: boolean
  push_notifications: boolean
  alerts_low_attention: boolean
  alerts_high_occupancy: boolean
  weekly_digest: boolean
  sms_notifications: boolean
  marketing_communications: boolean
}

export default function SettingsPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    role: 'teacher' as 'admin' | 'teacher' | 'student',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_reports: true,
    push_notifications: true,
    alerts_low_attention: true,
    alerts_high_occupancy: false,
    weekly_digest: true,
    sms_notifications: false,
    marketing_communications: false
  })

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        
        // Load user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile && !profileError) {
          setProfile(profile as UserProfile)
          setUserData({
            fullName: profile.full_name || '',
            email: user.email || '',
            phone: (profile as any).phone || '',
            department: (profile as any).department || '',
            role: (profile.role as 'admin' | 'teacher' | 'student') || 'teacher',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          })
        }

        // For now, we'll use local storage for notification settings
        // since the table doesn't exist yet in the database
        const savedNotifications = localStorage.getItem('notification_settings')
        if (savedNotifications) {
          setNotifications(JSON.parse(savedNotifications))
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setError('Failed to load user data')
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    setError('')

    try {
      if (!user) throw new Error('No user found')

      // Update auth email if changed
      if (userData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: userData.email
        })
        if (emailError) throw emailError
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: userData.fullName,
          role: userData.role,
          // Add phone and department when database schema supports it
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      setSuccess('Profile updated successfully!')
      await loadUserData() // Reload data
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userData.newPassword !== userData.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    
    if (userData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setSuccess('')
    setError('')

    try {
      const { error } = await supabase.auth.updateUser({
        password: userData.newPassword
      })

      if (error) throw error

      setSuccess('Password changed successfully!')
      setUserData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (error: any) {
      console.error('Error changing password:', error)
      setError(error.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationUpdate = async (key: keyof NotificationSettings, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value }
    setNotifications(newNotifications)
    
    // Save to localStorage for now
    localStorage.setItem('notification_settings', JSON.stringify(newNotifications))
    
    // TODO: When notification_settings table is created, save to database:
    // await supabase.from('user_notification_settings').upsert({
    //   user_id: user?.id,
    //   ...newNotifications
    // })
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setLoading(true)
    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess('Avatar updated successfully!')
      await loadUserData()
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      setError(error.message || 'Failed to upload avatar')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess('')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userData.newPassword !== userData.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess('Password changed successfully!')
      setUserData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (error) {
      console.error('Error changing password:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationUpdate = async (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
    // In real app, you'd save this to the backend
  }

  return (
    <div className="space-y-4 md:space-y-6 w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white">Settings</h1>
        <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
          Manage your account settings and preferences
        </p>
      </div>

      {success && (
        <Alert className="bg-green-900/20 border-green-700 rounded-2xl">
          <AlertDescription className="text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-4 md:space-y-6 w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#1E293B] border-[#334155] rounded-2xl">
          <TabsTrigger value="profile" className="flex items-center text-xs sm:text-sm data-[state=active]:bg-[#4338CA] data-[state=active]:text-white text-gray-300 rounded-2xl">
            <User className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Profile</span>
            <span className="sm:hidden">Prof</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center text-xs sm:text-sm data-[state=active]:bg-[#4338CA] data-[state=active]:text-white text-gray-300 rounded-2xl">
            <Shield className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Security</span>
            <span className="sm:hidden">Sec</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center text-xs sm:text-sm data-[state=active]:bg-[#4338CA] data-[state=active]:text-white text-gray-300 rounded-2xl">
            <Bell className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Not</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-gray-400">
                Update your personal information and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={userData.avatarUrl} alt={userData.fullName} />
                    <AvatarFallback className="bg-[#4338CA] text-white text-lg">
                      {userData.fullName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" className="flex items-center bg-[#334155] border-[#475569] text-white hover:bg-[#475569] rounded-2xl">
                      <Upload className="mr-2 h-4 w-4" />
                      Change Avatar
                    </Button>
                    <p className="text-sm text-gray-400 mt-2">
                      JPG, GIF or PNG. Max size 1MB.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                    <Input
                      id="fullName"
                      value={userData.fullName}
                      onChange={(e) => setUserData(prev => ({ ...prev, fullName: e.target.value }))}
                      disabled={loading}
                      className="bg-[#0A0E27] border-[#334155] text-white placeholder-gray-400 focus:border-[#4338CA] rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={loading}
                      className="bg-[#0A0E27] border-[#334155] text-white placeholder-gray-400 focus:border-[#4338CA] rounded-2xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Role</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={userData.role === 'admin' ? 'default' : 'secondary'} className="bg-[#4338CA] text-white rounded-2xl">
                      {userData.role === 'admin' ? (
                        <>
                          <Shield className="mr-1 h-3 w-3" />
                          Administrator
                        </>
                      ) : (
                        <>
                          <User className="mr-1 h-3 w-3" />
                          Teacher
                        </>
                      )}
                    </Badge>
                    <span className="text-sm text-gray-400">
                      Contact your administrator to change your role
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="flex items-center bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-2xl">
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
            <CardHeader>
              <CardTitle className="text-white">Security Settings</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your password and account security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={userData.currentPassword}
                      onChange={(e) => setUserData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      disabled={loading}
                      className="bg-[#0A0E27] border-[#334155] text-white placeholder-gray-400 focus:border-[#4338CA] rounded-2xl pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white rounded-2xl"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={userData.newPassword}
                        onChange={(e) => setUserData(prev => ({ ...prev, newPassword: e.target.value }))}
                        disabled={loading}
                        className="bg-[#0A0E27] border-[#334155] text-white placeholder-gray-400 focus:border-[#4338CA] rounded-2xl pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white rounded-2xl"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={userData.confirmPassword}
                        onChange={(e) => setUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        disabled={loading}
                        className="bg-[#0A0E27] border-[#334155] text-white placeholder-gray-400 focus:border-[#4338CA] rounded-2xl pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white rounded-2xl"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="flex items-center bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-2xl">
                    <Key className="mr-2 h-4 w-4" />
                    {loading ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155]/50 rounded-2xl shadow-lg shadow-[#0A0E27]/20">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
              <CardDescription className="text-gray-400">
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#0A0E27] rounded-2xl border border-[#334155]">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-300">Email Reports</p>
                      <p className="text-sm text-gray-400">Receive daily reports via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.emailReports}
                    onCheckedChange={(checked) => handleNotificationUpdate('emailReports', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27] rounded-2xl border border-[#334155]">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-300">Push Notifications</p>
                      <p className="text-sm text-gray-400">Get instant notifications in your browser</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => handleNotificationUpdate('pushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27] rounded-2xl border border-[#334155]">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-300">Low Attention Alerts</p>
                      <p className="text-sm text-gray-400">Alert when classroom attention drops below threshold</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.alertsLowAttention}
                    onCheckedChange={(checked) => handleNotificationUpdate('alertsLowAttention', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27] rounded-2xl border border-[#334155]">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-300">High Occupancy Alerts</p>
                      <p className="text-sm text-gray-400">Alert when rooms exceed capacity limits</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.alertsHighOccupancy}
                    onCheckedChange={(checked) => handleNotificationUpdate('alertsHighOccupancy', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27] rounded-2xl border border-[#334155]">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-300">Weekly Digest</p>
                      <p className="text-sm text-gray-400">Weekly summary of all classroom analytics</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) => handleNotificationUpdate('weeklyDigest', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}