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
    avatarUrl: '',
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
            avatarUrl: profile.avatar_url || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          })
        }

        // Try to load notification settings from database, fallback to localStorage
        try {
          const { data: notificationSettings, error: notificationError } = await supabase
            .from('user_notification_settings')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (notificationSettings && !notificationError) {
            setNotifications({
              email_reports: notificationSettings.email_reports,
              push_notifications: notificationSettings.push_notifications,
              alerts_low_attention: notificationSettings.alerts_low_attention,
              alerts_high_occupancy: notificationSettings.alerts_high_occupancy,
              weekly_digest: notificationSettings.weekly_digest,
              sms_notifications: notificationSettings.sms_notifications,
              marketing_communications: notificationSettings.marketing_communications
            })
          } else {
            // Fallback to localStorage if database table doesn't exist
            const savedNotifications = localStorage.getItem('notification_settings')
            if (savedNotifications) {
              setNotifications(JSON.parse(savedNotifications))
            }
          }
        } catch (error) {
          // Fallback to localStorage if database access fails
          const savedNotifications = localStorage.getItem('notification_settings')
          if (savedNotifications) {
            setNotifications(JSON.parse(savedNotifications))
          }
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
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      setSuccess('Profile updated successfully!')
      await loadUserData()
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
    
    // Try to save to database first, fallback to localStorage
    try {
      if (user) {
        const { error } = await supabase
          .from('user_notification_settings')
          .upsert({
            user_id: user.id,
            ...newNotifications
          })
        
        if (error) {
          // If database fails, save to localStorage
          localStorage.setItem('notification_settings', JSON.stringify(newNotifications))
        }
      }
    } catch (error) {
      // Fallback to localStorage if database access fails
      localStorage.setItem('notification_settings', JSON.stringify(newNotifications))
    }
    
    setSuccess('Notification preferences updated!')
    setTimeout(() => setSuccess(''), 3000)
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-900/30 text-red-400 border-red-500/30'
      case 'teacher': return 'bg-blue-900/30 text-blue-400 border-blue-500/30'
      case 'student': return 'bg-green-900/30 text-green-400 border-green-500/30'
      default: return 'bg-gray-900/30 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="bg-green-900/30 border-green-500/30 text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-900/30 border-red-500/30 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-[#1E293B] border-[#334155] rounded-2xl">
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#4338CA] data-[state=active]:text-white rounded-xl">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-[#4338CA] data-[state=active]:text-white rounded-xl">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#4338CA] data-[state=active]:text-white rounded-xl">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
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
                    <AvatarFallback className="bg-[#4338CA] text-white text-xl">
                      {userData.fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label className="text-gray-300">Profile Picture</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        className="bg-[#1E293B] border-[#334155] text-white hover:bg-[#334155] rounded-xl"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload New Photo
                      </Button>
                    </div>
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
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={loading}
                      className="bg-[#0A0E27] border-[#334155] text-white placeholder-gray-400 focus:border-[#4338CA] rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-gray-300">Role</Label>
                    <div className="flex items-center space-x-3">
                      <Select 
                        value={userData.role} 
                        onValueChange={(value: 'admin' | 'teacher' | 'student') => 
                          setUserData(prev => ({ ...prev, role: value }))
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="bg-[#0A0E27] border-[#334155] text-white rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E293B] border-[#334155] rounded-2xl">
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary" className={`${getRoleBadgeColor(userData.role)} rounded-xl`}>
                        {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={userData.phone}
                      onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={loading}
                      placeholder="(555) 123-4567"
                      className="bg-[#0A0E27] border-[#334155] text-white placeholder-gray-400 focus:border-[#4338CA] rounded-2xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-2xl">
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
                        placeholder="Enter new password"
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
                        placeholder="Confirm new password"
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
                  <Button type="submit" disabled={loading} className="bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-2xl">
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
                <div className="flex items-center justify-between p-4 bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl shadow-md shadow-[#0A0E27]/30">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">Email Reports</Label>
                    <p className="text-sm text-gray-400">
                      Receive daily reports via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_reports}
                    onCheckedChange={(checked) => handleNotificationUpdate('email_reports', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl shadow-md shadow-[#0A0E27]/30">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">Push Notifications</Label>
                    <p className="text-sm text-gray-400">
                      Get instant notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push_notifications}
                    onCheckedChange={(checked) => handleNotificationUpdate('push_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl shadow-md shadow-[#0A0E27]/30">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">Low Attention Alerts</Label>
                    <p className="text-sm text-gray-400">
                      Alert when classroom attention drops below threshold
                    </p>
                  </div>
                  <Switch
                    checked={notifications.alerts_low_attention}
                    onCheckedChange={(checked) => handleNotificationUpdate('alerts_low_attention', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl shadow-md shadow-[#0A0E27]/30">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">High Occupancy Alerts</Label>
                    <p className="text-sm text-gray-400">
                      Alert when rooms exceed capacity limits
                    </p>
                  </div>
                  <Switch
                    checked={notifications.alerts_high_occupancy}
                    onCheckedChange={(checked) => handleNotificationUpdate('alerts_high_occupancy', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl shadow-md shadow-[#0A0E27]/30">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">Weekly Digest</Label>
                    <p className="text-sm text-gray-400">
                      Weekly summary of all classroom analytics
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weekly_digest}
                    onCheckedChange={(checked) => handleNotificationUpdate('weekly_digest', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl shadow-md shadow-[#0A0E27]/30">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">SMS Notifications</Label>
                    <p className="text-sm text-gray-400">
                      Receive text messages for important updates
                    </p>
                  </div>
                  <Switch
                    checked={notifications.sms_notifications}
                    onCheckedChange={(checked) => handleNotificationUpdate('sms_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-2xl shadow-md shadow-[#0A0E27]/30">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">Marketing Communications</Label>
                    <p className="text-sm text-gray-400">
                      Receive updates about new features and promotions
                    </p>
                  </div>
                  <Switch
                    checked={notifications.marketing_communications}
                    onCheckedChange={(checked) => handleNotificationUpdate('marketing_communications', checked)}
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
