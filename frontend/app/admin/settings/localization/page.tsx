"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { Globe, Save, RefreshCw, Trash2 } from "lucide-react"

const defaultLocalizationSettings = {
  defaultLanguage: "en",
  availableLanguages: [
    { code: "en", name: "English", flag: "🇺🇸", rtl: false },
    { code: "sw", name: "Swahili", flag: "🇰🇪", rtl: false },
    { code: "fr", name: "French", flag: "🇫🇷", rtl: false },
    { code: "ar", name: "Arabic", flag: "🇸🇦", rtl: true },
  ],
  defaultCurrency: "KES",
  availableCurrencies: [
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate: 1 },
    { code: "USD", name: "US Dollar", symbol: "$", rate: 0.0067 },
    { code: "EUR", name: "Euro", symbol: "€", rate: 0.0061 },
    { code: "GBP", name: "British Pound", symbol: "£", rate: 0.0053 },
  ],
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  timezone: "Africa/Nairobi",
  numberFormat: {
    decimalSeparator: ".",
    thousandSeparator: ",",
    decimalPlaces: 2,
  },
  addressFormat: {
    format: "{name}\n{company}\n{address_1}\n{address_2}\n{city}, {state} {postcode}\n{country}",
    required: ["name", "address_1", "city", "country"],
  },
}

export default function LocalizationSettingsPage() {
  const [localizationSettings, setLocalizationSettings] = useState(defaultLocalizationSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await adminService.getSettings()
      if (data.localization) {
        setLocalizationSettings({ ...defaultLocalizationSettings, ...data.localization })
      }
    } catch (error) {
      console.error("Error loading localization settings:", error)
      toast({
        title: "Error",
        description: "Failed to load localization settings. Using defaults.",
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
        localization: localizationSettings,
      })
      toast({
        title: "Success",
        description: "Localization settings saved successfully!",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving localization settings:", error)
      toast({
        title: "Error",
        description: "Failed to save localization settings. Please try again.",
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
          <h1 className="text-3xl font-bold">Localization Settings</h1>
          <p className="text-muted-foreground">Configure languages, currencies, and regional settings</p>
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
            <Globe className="h-5 w-5" />
            Localization Settings
          </CardTitle>
          <CardDescription>Configure languages, currencies, and regional settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium">Language Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-language">Default Language</Label>
                <Select
                  value={localizationSettings.defaultLanguage}
                  onValueChange={(value) => setLocalizationSettings((prev) => ({ ...prev, defaultLanguage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {localizationSettings.availableLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Available Languages</Label>
              {localizationSettings.availableLanguages.map((lang, index) => (
                <div key={lang.code} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <p className="font-medium">{lang.name}</p>
                      <p className="text-sm text-muted-foreground">{lang.code}</p>
                    </div>
                    {lang.rtl && <Badge variant="secondary">RTL</Badge>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updatedLanguages = localizationSettings.availableLanguages.filter((_, i) => i !== index)
                      setLocalizationSettings((prev) => ({ ...prev, availableLanguages: updatedLanguages }))
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Currency Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-currency">Default Currency</Label>
                <Select
                  value={localizationSettings.defaultCurrency}
                  onValueChange={(value) => setLocalizationSettings((prev) => ({ ...prev, defaultCurrency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {localizationSettings.availableCurrencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Currency Exchange Rates</Label>
              {localizationSettings.availableCurrencies.map((currency, index) => (
                <div key={currency.code} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm">{currency.code}</span>
                    <span>{currency.name}</span>
                    <span className="text-lg">{currency.symbol}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      step="0.000001"
                      value={currency.rate}
                      onChange={(e) => {
                        const updatedCurrencies = [...localizationSettings.availableCurrencies]
                        updatedCurrencies[index] = { ...currency, rate: Number.parseFloat(e.target.value) || 0 }
                        setLocalizationSettings((prev) => ({ ...prev, availableCurrencies: updatedCurrencies }))
                      }}
                      className="w-32"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updatedCurrencies = localizationSettings.availableCurrencies.filter((_, i) => i !== index)
                        setLocalizationSettings((prev) => ({ ...prev, availableCurrencies: updatedCurrencies }))
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Regional Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-format">Date Format</Label>
                <Select
                  value={localizationSettings.dateFormat}
                  onValueChange={(value) => setLocalizationSettings((prev) => ({ ...prev, dateFormat: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-format">Time Format</Label>
                <Select
                  value={localizationSettings.timeFormat}
                  onValueChange={(value) => setLocalizationSettings((prev) => ({ ...prev, timeFormat: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={localizationSettings.timezone}
                  onValueChange={(value) => setLocalizationSettings((prev) => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-medium">Number Format</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="decimal-separator">Decimal Separator</Label>
                  <Input
                    id="decimal-separator"
                    value={localizationSettings.numberFormat.decimalSeparator}
                    onChange={(e) =>
                      setLocalizationSettings((prev) => ({
                        ...prev,
                        numberFormat: { ...prev.numberFormat, decimalSeparator: e.target.value },
                      }))
                    }
                    maxLength={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thousand-separator">Thousand Separator</Label>
                  <Input
                    id="thousand-separator"
                    value={localizationSettings.numberFormat.thousandSeparator}
                    onChange={(e) =>
                      setLocalizationSettings((prev) => ({
                        ...prev,
                        numberFormat: { ...prev.numberFormat, thousandSeparator: e.target.value },
                      }))
                    }
                    maxLength={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decimal-places">Decimal Places</Label>
                  <Input
                    id="decimal-places"
                    type="number"
                    min="0"
                    max="4"
                    value={localizationSettings.numberFormat.decimalPlaces}
                    onChange={(e) =>
                      setLocalizationSettings((prev) => ({
                        ...prev,
                        numberFormat: { ...prev.numberFormat, decimalPlaces: Number.parseInt(e.target.value) },
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-medium">Address Format</h5>
              <div className="space-y-2">
                <Label htmlFor="address-format">Address Format Template</Label>
                <Textarea
                  id="address-format"
                  value={localizationSettings.addressFormat.format}
                  onChange={(e) =>
                    setLocalizationSettings((prev) => ({
                      ...prev,
                      addressFormat: { ...prev.addressFormat, format: e.target.value },
                    }))
                  }
                  rows={4}
                  placeholder="{name}\n{company}\n{address_1}\n{address_2}\n{city}, {state} {postcode}\n{country}"
                />
                <p className="text-sm text-muted-foreground">
                  Use placeholders: {"{name}"}, {"{company}"}, {"{address_1}"}, {"{address_2}"}, {"{city}"}, {"{state}"}
                  , {"{postcode}"}, {"{country}"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
