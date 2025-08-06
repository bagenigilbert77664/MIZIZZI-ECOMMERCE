"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { Users, Save, RefreshCw, Plus, Trash2 } from "lucide-react"

const defaultUserPermissions = {
  roles: [
    { id: "admin", name: "Administrator", permissions: ["all"] },
    { id: "manager", name: "Manager", permissions: ["products", "orders", "customers"] },
    { id: "editor", name: "Editor", permissions: ["products", "content"] },
    { id: "viewer", name: "Viewer", permissions: ["view"] },
  ],
  defaultRole: "viewer",
  registrationEnabled: true,
  emailVerificationRequired: true,
  adminApprovalRequired: false,
}

export default function UsersSettingsPage() {
  const [userPermissions, setUserPermissions] = useState(defaultUserPermissions)
  const [allSettings, setAllSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])
  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await adminService.getSettings()
      setAllSettings(data)
      if (data.users) {
        setUserPermissions({ ...defaultUserPermissions, ...data.users })
      }
    } catch (error) {
      console.error("Error loading user settings:", error)
      toast({
        title: "Error",
        description: "Failed to load user settings. Using defaults.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      if (!allSettings) throw new Error("Settings not loaded")
      const updatedSettings = { ...allSettings, users: userPermissions }
      await adminService.updateSettings(updatedSettings)
      setAllSettings(updatedSettings)
      toast({
        title: "Success",
        description: "User settings saved successfully!",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving user settings:", error)
      toast({
        title: "Error",
        description: "Failed to save user settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Configure user registration and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>Configure user registration and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium">Registration Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="registration-enabled"
                  checked={userPermissions.registrationEnabled}
                  onCheckedChange={(checked) =>
                    setUserPermissions((prev) => ({ ...prev, registrationEnabled: checked }))
                  }
                />
                <Label htmlFor="registration-enabled">Allow user registration</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="email-verification"
                  checked={userPermissions.emailVerificationRequired}
                  onCheckedChange={(checked) =>
                    setUserPermissions((prev) => ({ ...prev, emailVerificationRequired: checked }))
                  }
                />
                <Label htmlFor="email-verification">Require email verification</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="admin-approval"
                  checked={userPermissions.adminApprovalRequired}
                  onCheckedChange={(checked) =>
                    setUserPermissions((prev) => ({ ...prev, adminApprovalRequired: checked }))
                  }
                />
                <Label htmlFor="admin-approval">Require admin approval for new accounts</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-role">Default User Role</Label>
              <Select
                value={userPermissions.defaultRole}
                onValueChange={(value) => setUserPermissions((prev) => ({ ...prev, defaultRole: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userPermissions.roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">User Roles & Permissions</h4>
              <Button
                size="sm"
                onClick={() => {
                  const newRole = {
                    id: `role_${Date.now()}`,
                    name: "New Role",
                    permissions: ["view"],
                  }
                  setUserPermissions((prev) => ({
                    ...prev,
                    roles: [...prev.roles, newRole],
                  }))
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </div>

            <div className="space-y-3">
              {userPermissions.roles.map((role, index) => (
                <div key={role.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={role.name}
                      onChange={(e) => {
                        const updatedRoles = [...userPermissions.roles]
                        updatedRoles[index] = { ...role, name: e.target.value }
                        setUserPermissions((prev) => ({ ...prev, roles: updatedRoles }))
                      }}
                      className="w-48"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updatedRoles = userPermissions.roles.filter((_, i) => i !== index)
                        setUserPermissions((prev) => ({ ...prev, roles: updatedRoles }))
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="flex flex-wrap gap-2">
                      {["all", "products", "orders", "customers", "content", "analytics", "settings", "view"].map(
                        (permission) => (
                          <Badge
                            key={permission}
                            variant={role.permissions.includes(permission) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const updatedRoles = [...userPermissions.roles]
                              const currentPermissions = role.permissions
                              if (currentPermissions.includes(permission)) {
                                updatedRoles[index] = {
                                  ...role,
                                  permissions: currentPermissions.filter((p) => p !== permission),
                                }
                              } else {
                                updatedRoles[index] = {
                                  ...role,
                                  permissions: [...currentPermissions, permission],
                                }
                              }
                              setUserPermissions((prev) => ({ ...prev, roles: updatedRoles }))
                            }}
                          >
                            {permission}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
