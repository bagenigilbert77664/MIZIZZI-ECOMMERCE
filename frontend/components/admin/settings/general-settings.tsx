"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Settings, Shield, Globe, Mail } from "lucide-react"
import type { SystemSettings } from "@/types/admin"

interface GeneralSettingsProps {
  settings: SystemSettings
  updateSetting: (section: keyof SystemSettings, key: string, value: any) => void
  updateNestedSetting: (section: keyof SystemSettings, parentKey: string, key: string, value: any) => void
}

export function GeneralSettings({ settings, updateSetting, updateNestedSetting }: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Site Information
          </CardTitle>
          <CardDescription>Basic information about your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                value={settings.site.name}
                onChange={(e) => updateSetting("site", "name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-tagline">Tagline</Label>
              <Input
                id="site-tagline"
                value={settings.site.tagline || ""}
                onChange={(e) => updateSetting("site", "tagline", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-description">Description</Label>
            <Textarea
              id="site-description"
              value={settings.site.description || ""}
              onChange={(e) => updateSetting("site", "description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo-url">Logo URL</Label>
              <Input
                id="logo-url"
                value={settings.site.logo_url || ""}
                onChange={(e) => updateSetting("site", "logo_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favicon-url">Favicon URL</Label>
              <Input
                id="favicon-url"
                value={settings.site.favicon_url || ""}
                onChange={(e) => updateSetting("site", "favicon_url", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>How customers can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site-email">Email</Label>
              <Input
                id="site-email"
                type="email"
                value={settings.site.email}
                onChange={(e) => updateSetting("site", "email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-phone">Phone</Label>
              <Input
                id="site-phone"
                value={settings.site.phone || ""}
                onChange={(e) => updateSetting("site", "phone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-address">Address</Label>
            <Textarea
              id="site-address"
              value={settings.site.address || ""}
              onChange={(e) => updateSetting("site", "address", e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Social Media Links
          </CardTitle>
          <CardDescription>Connect your social media accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(settings.site.social_links || {}).map(([platform, url]) => (
              <div key={platform} className="space-y-2">
                <Label htmlFor={`social-${platform}`} className="capitalize">
                  {platform}
                </Label>
                <Input
                  id={`social-${platform}`}
                  value={url}
                  onChange={(e) => updateNestedSetting("site", "social_links", platform, e.target.value)}
                  placeholder={`https://${platform}.com/yourpage`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Configure security and authentication settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password-min-length">Minimum Password Length</Label>
            <Input
              id="password-min-length"
              type="number"
              min="6"
              max="50"
              value={settings.security.password_min_length}
              onChange={(e) => updateSetting("security", "password_min_length", Number.parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="require-special-char"
                checked={settings.security.password_requires_special_char}
                onCheckedChange={(checked) => updateSetting("security", "password_requires_special_char", checked)}
              />
              <Label htmlFor="require-special-char">Require special characters</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="require-number"
                checked={settings.security.password_requires_number}
                onCheckedChange={(checked) => updateSetting("security", "password_requires_number", checked)}
              />
              <Label htmlFor="require-number">Require numbers</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="require-uppercase"
                checked={settings.security.password_requires_uppercase}
                onCheckedChange={(checked) => updateSetting("security", "password_requires_uppercase", checked)}
              />
              <Label htmlFor="require-uppercase">Require uppercase letters</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enable-two-factor"
                checked={settings.security.enable_two_factor}
                onCheckedChange={(checked) => updateSetting("security", "enable_two_factor", checked)}
              />
              <Label htmlFor="enable-two-factor">Enable two-factor authentication</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
              <Input
                id="max-login-attempts"
                type="number"
                min="3"
                max="10"
                value={settings.security.max_login_attempts}
                onChange={(e) => updateSetting("security", "max_login_attempts", Number.parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockout-time">Lockout Time (minutes)</Label>
              <Input
                id="lockout-time"
                type="number"
                min="5"
                max="60"
                value={settings.security.lockout_time}
                onChange={(e) => updateSetting("security", "lockout_time", Number.parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-lifetime">Session Lifetime (hours)</Label>
              <Input
                id="session-lifetime"
                type="number"
                min="1"
                max="168"
                value={settings.security.session_lifetime}
                onChange={(e) => updateSetting("security", "session_lifetime", Number.parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
