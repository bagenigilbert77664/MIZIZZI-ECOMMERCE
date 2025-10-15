"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { Volume2, Save, RefreshCw, Bell } from "lucide-react"

const defaultSoundSettings = {
  enabled: true,
  volume: 0.5,
  sounds: {
    newOrder: { enabled: true, file: "/sounds/new-order.mp3" },
    lowStock: { enabled: true, file: "/sounds/alert.mp3" },
    newMessage: { enabled: true, file: "/sounds/notification.mp3" },
    error: { enabled: true, file: "/sounds/error.mp3" },
    success: { enabled: true, file: "/sounds/success.mp3" },
  },
  notifications: {
    desktop: true,
    browser: true,
    email: false,
  },
}

export default function SoundSettingsPage() {
  const [soundSettings, setSoundSettings] = useState(defaultSoundSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await adminService.getSettings()
      if (data.sound) {
        setSoundSettings({ ...defaultSoundSettings, ...data.sound })
      }
    } catch (error) {
      console.error("Error loading sound settings:", error)
      toast({
        title: "Error",
        description: "Failed to load sound settings. Using defaults.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const currentSettings = await adminService.getSettings()
      await adminService.updateSettings({
        ...currentSettings,
        sound: soundSettings,
      })
      toast({
        title: "Success",
        description: "Sound settings saved successfully!",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving sound settings:", error)
      toast({
        title: "Error",
        description: "Failed to save sound settings. Please try again.",
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
          <h1 className="text-3xl font-bold">Sound Settings</h1>
          <p className="text-muted-foreground">Configure audio notifications and alerts</p>
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
            <Volume2 className="h-5 w-5" />
            Sound Configuration
          </CardTitle>
          <CardDescription>Configure audio notifications and alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="sounds-enabled"
                checked={soundSettings.enabled}
                onCheckedChange={(checked) => setSoundSettings((prev) => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="sounds-enabled">Enable sound notifications</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Master Volume</Label>
              <div className="flex items-center space-x-4">
                <input
                  id="volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundSettings.volume}
                  onChange={(e) => setSoundSettings((prev) => ({ ...prev, volume: Number.parseFloat(e.target.value) }))}
                  className="flex-1"
                  disabled={!soundSettings.enabled}
                />
                <span className="text-sm text-muted-foreground w-12">{Math.round(soundSettings.volume * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Sound Events</h4>
            <div className="space-y-3">
              {Object.entries(soundSettings.sounds).map(([eventKey, sound]) => (
                <div key={eventKey} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="capitalize">{eventKey.replace(/([A-Z])/g, " $1").trim()}</Label>
                      <p className="text-sm text-muted-foreground">
                        {eventKey === "newOrder" && "Plays when a new order is received"}
                        {eventKey === "lowStock" && "Plays when product stock is low"}
                        {eventKey === "newMessage" && "Plays when a new message is received"}
                        {eventKey === "error" && "Plays when an error occurs"}
                        {eventKey === "success" && "Plays when an action is successful"}
                      </p>
                    </div>
                    <Switch
                      checked={sound.enabled}
                      onCheckedChange={(checked) =>
                        setSoundSettings((prev) => ({
                          ...prev,
                          sounds: { ...prev.sounds, [eventKey]: { ...sound, enabled: checked } },
                        }))
                      }
                      disabled={!soundSettings.enabled}
                    />
                  </div>

                  {sound.enabled && soundSettings.enabled && (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={sound.file}
                        onChange={(e) =>
                          setSoundSettings((prev) => ({
                            ...prev,
                            sounds: { ...prev.sounds, [eventKey]: { ...sound, file: e.target.value } },
                          }))
                        }
                        placeholder="/sounds/notification.mp3"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const audio = new Audio(sound.file)
                          audio.volume = soundSettings.volume
                          audio.play().catch(() => {
                            toast({
                              title: "Error",
                              description: "Could not play sound file",
                              variant: "destructive",
                            })
                          })
                        }}
                      >
                        Test
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Preferences
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="desktop-notifications"
                  checked={soundSettings.notifications.desktop}
                  onCheckedChange={(checked) =>
                    setSoundSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, desktop: checked },
                    }))
                  }
                />
                <Label htmlFor="desktop-notifications">Desktop notifications</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="browser-notifications"
                  checked={soundSettings.notifications.browser}
                  onCheckedChange={(checked) =>
                    setSoundSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, browser: checked },
                    }))
                  }
                />
                <Label htmlFor="browser-notifications">Browser notifications</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="email-notifications"
                  checked={soundSettings.notifications.email}
                  onCheckedChange={(checked) =>
                    setSoundSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: checked },
                    }))
                  }
                />
                <Label htmlFor="email-notifications">Email notifications</Label>
              </div>
            </div>

            {soundSettings.notifications.desktop && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Note:</strong> Desktop notifications require browser permission. Click the button below to
                  request permission.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    if ("Notification" in window) {
                      Notification.requestPermission().then((permission) => {
                        if (permission === "granted") {
                          new Notification("Mizizzi Admin", {
                            body: "Desktop notifications are now enabled!",
                            icon: "/favicon.ico",
                          })
                        }
                      })
                    }
                  }}
                >
                  Request Permission
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
