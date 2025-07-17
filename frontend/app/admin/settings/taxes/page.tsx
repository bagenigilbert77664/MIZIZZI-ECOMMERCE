"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { Calculator, Save, RefreshCw, Plus, Trash2 } from "lucide-react"

const defaultTaxSettings = {
  enableTax: true,
  taxCalculationMethod: "exclusive", // exclusive, inclusive
  defaultTaxRate: 16,
  taxClasses: [
    { id: "standard", name: "Standard Rate", rate: 16 },
    { id: "reduced", name: "Reduced Rate", rate: 8 },
    { id: "zero", name: "Zero Rate", rate: 0 },
    { id: "exempt", name: "Tax Exempt", rate: 0 },
  ],
  taxBasedOn: "billing", // billing, shipping, store
  displayPricesIncludingTax: false,
  displayTaxTotals: true,
}

export default function TaxesSettingsPage() {
  const [taxSettings, setTaxSettings] = useState(defaultTaxSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await adminService.getSettings()
      if (data.taxes) {
        setTaxSettings({ ...defaultTaxSettings, ...data.taxes })
      }
    } catch (error) {
      console.error("Error loading tax settings:", error)
      toast({
        title: "Error",
        description: "Failed to load tax settings. Using defaults.",
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
        taxes: taxSettings,
      })
      toast({
        title: "Success",
        description: "Tax settings saved successfully!",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving tax settings:", error)
      toast({
        title: "Error",
        description: "Failed to save tax settings. Please try again.",
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
          <h1 className="text-3xl font-bold">Tax Configuration</h1>
          <p className="text-muted-foreground">Configure tax rates and calculation methods</p>
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
            <Calculator className="h-5 w-5" />
            Tax Configuration
          </CardTitle>
          <CardDescription>Configure tax rates and calculation methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-tax"
                checked={taxSettings.enableTax}
                onCheckedChange={(checked) => setTaxSettings((prev) => ({ ...prev, enableTax: checked }))}
              />
              <Label htmlFor="enable-tax">Enable tax calculation</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax-calculation">Tax Calculation Method</Label>
                <Select
                  value={taxSettings.taxCalculationMethod}
                  onValueChange={(value) => setTaxSettings((prev) => ({ ...prev, taxCalculationMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Tax Exclusive (add tax to price)</SelectItem>
                    <SelectItem value="inclusive">Tax Inclusive (tax included in price)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-tax-rate">Default Tax Rate (%)</Label>
                <Input
                  id="default-tax-rate"
                  type="number"
                  step="0.01"
                  value={taxSettings.defaultTaxRate}
                  onChange={(e) =>
                    setTaxSettings((prev) => ({ ...prev, defaultTaxRate: Number.parseFloat(e.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-based-on">Calculate tax based on</Label>
              <Select
                value={taxSettings.taxBasedOn}
                onValueChange={(value) => setTaxSettings((prev) => ({ ...prev, taxBasedOn: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="billing">Customer billing address</SelectItem>
                  <SelectItem value="shipping">Customer shipping address</SelectItem>
                  <SelectItem value="store">Store address</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="display-prices-including-tax"
                  checked={taxSettings.displayPricesIncludingTax}
                  onCheckedChange={(checked) =>
                    setTaxSettings((prev) => ({ ...prev, displayPricesIncludingTax: checked }))
                  }
                />
                <Label htmlFor="display-prices-including-tax">Display prices including tax</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="display-tax-totals"
                  checked={taxSettings.displayTaxTotals}
                  onCheckedChange={(checked) => setTaxSettings((prev) => ({ ...prev, displayTaxTotals: checked }))}
                />
                <Label htmlFor="display-tax-totals">Display tax totals in cart and checkout</Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Tax Classes</h4>
              <Button
                size="sm"
                onClick={() => {
                  const newTaxClass = {
                    id: `tax_${Date.now()}`,
                    name: "New Tax Class",
                    rate: 0,
                  }
                  setTaxSettings((prev) => ({
                    ...prev,
                    taxClasses: [...prev.taxClasses, newTaxClass],
                  }))
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Class
              </Button>
            </div>

            <div className="space-y-3">
              {taxSettings.taxClasses.map((taxClass, index) => (
                <div key={taxClass.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3 flex-1">
                    <Input
                      value={taxClass.name}
                      onChange={(e) => {
                        const updatedClasses = [...taxSettings.taxClasses]
                        updatedClasses[index] = { ...taxClass, name: e.target.value }
                        setTaxSettings((prev) => ({ ...prev, taxClasses: updatedClasses }))
                      }}
                      className="w-48"
                    />
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={taxClass.rate}
                        onChange={(e) => {
                          const updatedClasses = [...taxSettings.taxClasses]
                          updatedClasses[index] = { ...taxClass, rate: Number.parseFloat(e.target.value) || 0 }
                          setTaxSettings((prev) => ({ ...prev, taxClasses: updatedClasses }))
                        }}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updatedClasses = taxSettings.taxClasses.filter((_, i) => i !== index)
                      setTaxSettings((prev) => ({ ...prev, taxClasses: updatedClasses }))
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
