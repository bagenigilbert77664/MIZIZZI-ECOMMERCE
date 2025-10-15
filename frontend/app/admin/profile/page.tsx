"use client"

import { useState, useEffect } from "react"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AppleSpinner } from "@/components/ui/apple-spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import {
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  X,
  Camera,
  Key,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  last_login: string | null
  created_at: string | null
  is_active: boolean
  email_verified: boolean
  phone_verified: boolean
  avatar_url: string | null
  mfa_enabled: boolean
}

export default function AdminProfilePage() {
  const { updateProfile, getToken } = useAdminAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
  })

  // Fetch profile data from backend only
  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const token = getToken()

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const response = await fetch(`${apiUrl}/api/admin/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please log in again.")
        }
        if (response.status === 403) {
          throw new Error("Access denied. Insufficient permissions.")
        }
        throw new Error(`Failed to load profile: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.admin) {
        throw new Error("Invalid response format from server.")
      }

      setProfileData(data.admin)
      setEditForm({
        name: data.admin.name || "",
        email: data.admin.email || "",
        phone: data.admin.phone || "",
        avatar_url: data.admin.avatar_url || "",
      })
    } catch (error) {
      console.error("Profile fetch error:", error)
      setError(error instanceof Error ? error.message : "Failed to load profile data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (profileData) {
      setEditForm({
        name: profileData.name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        avatar_url: profileData.avatar_url || "",
      })
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const token = getToken()

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const response = await fetch(`${apiUrl}/api/admin/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Update failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.admin) {
        setProfileData(data.admin)
        setEditForm({
          name: data.admin.name || "",
          email: data.admin.email || "",
          phone: data.admin.phone || "",
          avatar_url: data.admin.avatar_url || "",
        })
      }

      toast({
        title: "Profile Updated",
        description: data.message || "Your profile has been successfully updated.",
      })

      setIsEditing(false)
    } catch (error: any) {
      console.error("Profile update error:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6">
          <AppleSpinner size="lg" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-slate-900">Loading Profile</p>
            <p className="text-sm text-slate-500">Fetching your information from the server...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">Unable to Load Profile</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {error || "Failed to fetch profile data from the server. Please check your connection and try again."}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={fetchProfile} variant="outline" className="bg-white gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={() => (window.location.href = "/admin/dashboard")} variant="default">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Profile</h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            Manage your admin account information, security settings, and preferences.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Avatar Section */}
                  <div className="relative">
                    <Avatar className="h-28 w-28 mx-auto border-4 border-white shadow-lg ring-1 ring-slate-200">
                      <AvatarImage src={profileData.avatar_url || undefined} />
                      <AvatarFallback className="bg-slate-100 text-slate-700 text-xl font-semibold">
                        {getInitials(profileData.name)}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full border-2 border-white shadow-md bg-white hover:bg-slate-50"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Name and Role */}
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{profileData.name}</h2>
                    <Badge
                      variant="secondary"
                      className="bg-slate-900 text-white hover:bg-slate-800 font-medium px-3 py-1"
                    >
                      <Shield className="h-3 w-3 mr-1.5" />
                      {profileData.role.toUpperCase()}
                    </Badge>
                  </div>

                  <Separator className="bg-slate-200" />

                  {/* Status Indicators */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Account Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 font-medium">Active Status</span>
                        <Badge
                          variant={profileData.is_active ? "default" : "destructive"}
                          className="text-xs font-medium"
                        >
                          {profileData.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 font-medium">Email Verified</span>
                        {profileData.email_verified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 font-medium">Phone Verified</span>
                        {profileData.phone_verified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 font-medium">Two-Factor Auth</span>
                        {profileData.mfa_enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-8">
            {/* Profile Information Card */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl font-semibold text-slate-900">Personal Information</CardTitle>
                    <CardDescription className="text-slate-600 leading-relaxed">
                      Update your personal details and contact information.
                    </CardDescription>
                  </div>
                  <AnimatePresence mode="wait">
                    {!isEditing ? (
                      <motion.div
                        key="edit"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Button
                          onClick={handleEdit}
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-white hover:bg-slate-50"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="actions"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="flex gap-2"
                      >
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-white hover:bg-slate-50"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSave}
                          size="sm"
                          className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                          disabled={isSaving}
                        >
                          {isSaving ? <AppleSpinner size="sm" /> : <Save className="h-4 w-4" />}
                          Save
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Name Field */}
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-semibold text-slate-900">
                      Full Name
                    </Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400 bg-white"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-900 font-medium">{profileData.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-900">
                      Email Address
                    </Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400 bg-white"
                        placeholder="Enter your email address"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-900 font-medium">{profileData.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-semibold text-slate-900">
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400 bg-white"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <Phone className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-900 font-medium">{profileData.phone || "Not provided"}</span>
                      </div>
                    )}
                  </div>

                  {/* Role Field (Read-only) */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-900">Admin Role</Label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <Shield className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-900 font-medium">{profileData.role.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-200" />

                {/* Account Information */}
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-slate-900">Account Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                        <Calendar className="h-5 w-5 text-slate-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">Member Since</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(profileData.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                        <Clock className="h-5 w-5 text-slate-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">Last Active</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(profileData.last_login)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-3">
                  <Key className="h-5 w-5" />
                  Security & Privacy
                </CardTitle>
                <CardDescription className="text-slate-600 leading-relaxed">
                  Manage your account security settings and authentication preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="space-y-1">
                      <h5 className="font-semibold text-slate-900">Two-Factor Authentication</h5>
                      <p className="text-sm text-slate-600">Secure your account with an additional verification step</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={profileData.mfa_enabled ? "default" : "secondary"} className="font-medium">
                        {profileData.mfa_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50">
                        {profileData.mfa_enabled ? "Manage" : "Enable"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="space-y-1">
                      <h5 className="font-semibold text-slate-900">Password</h5>
                      <p className="text-sm text-slate-600">Update your account password regularly for security</p>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50">
                      Change Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
