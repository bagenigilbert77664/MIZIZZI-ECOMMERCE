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
import { Puzzle, Save, RefreshCw, Eye, EyeOff, Monitor, CreditCard, Mail } from "lucide-react"

type IntegrationsType = {
  analytics: {
    googleAnalytics: { enabled: boolean; trackingId: string; enhanced: boolean };
    facebookPixel: { enabled: boolean; pixelId: string; events: string[] };
    hotjar: { enabled: boolean; siteId: string; version: number };
  };
  payments: {
    mpesa: { enabled: boolean; shortcode: string; consumerKey: string; consumerSecret: string; environment: string };
    stripe: { enabled: boolean; publicKey: string; secretKey: string; webhookSecret: string };
    paypal: { enabled: boolean; clientId: string; clientSecret: string; environment: string };
  };
  shipping: {
    dhl: { enabled: boolean; apiKey: string; accountNumber: string };
    fedex: { enabled: boolean; apiKey: string; accountNumber: string };
    ups: { enabled: boolean; apiKey: string; accountNumber: string };
  };
  communication: {
    twilio: { enabled: boolean; accountSid: string; authToken: string; phoneNumber: string };
    mailgun: { enabled: boolean; apiKey: string; domain: string };
    sendgrid: { enabled: boolean; apiKey: string; fromEmail: string };
  };
}

const defaultIntegrations: IntegrationsType = {
  analytics: {
    googleAnalytics: { enabled: false, trackingId: "", enhanced: false },
    facebookPixel: { enabled: false, pixelId: "", events: [] },
    hotjar: { enabled: false, siteId: "", version: 6 },
  },
  payments: {
    mpesa: { enabled: true, shortcode: "", consumerKey: "", consumerSecret: "", environment: "sandbox" },
    stripe: { enabled: false, publicKey: "", secretKey: "", webhookSecret: "" },
    paypal: { enabled: false, clientId: "", clientSecret: "", environment: "sandbox" },
  },
  shipping: {
    dhl: { enabled: false, apiKey: "", accountNumber: "" },
    fedex: { enabled: false, apiKey: "", accountNumber: "" },
    ups: { enabled: false, apiKey: "", accountNumber: "" },
  },
  communication: {
    twilio: { enabled: false, accountSid: "", authToken: "", phoneNumber: "" },
    mailgun: { enabled: false, apiKey: "", domain: "" },
    sendgrid: { enabled: false, apiKey: "", fromEmail: "" },
  },
}

export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<IntegrationsType>(defaultIntegrations)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await adminService.getSettings()
      if (data.integrations) {
        setIntegrations({ ...defaultIntegrations, ...data.integrations })
      }
    } catch (error) {
      console.error("Error loading integration settings:", error)
      toast({
        title: "Error",
        description: "Failed to load integration settings. Using defaults.",
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
        integrations: integrations,
      })
      toast({
        title: "Success",
        description: "Integration settings saved successfully!",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving integration settings:", error)
      toast({
        title: "Error",
        description: "Failed to save integration settings. Please try again.",
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
          <h1 className="text-3xl font-bold">Third-Party Integrations</h1>
          <p className="text-muted-foreground">Configure external services and APIs</p>
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
            <Puzzle className="h-5 w-5" />
            Third-Party Integrations
          </CardTitle>
          <CardDescription>Configure external services and APIs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Analytics Integrations */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Analytics & Tracking
            </h4>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="google-analytics">Google Analytics</Label>
                <Switch
                  id="google-analytics"
                  checked={integrations.analytics.googleAnalytics.enabled}
                  onCheckedChange={(checked) =>
                    setIntegrations((prev) => ({
                      ...prev,
                      analytics: {
                        ...prev.analytics,
                        googleAnalytics: { ...prev.analytics.googleAnalytics, enabled: checked },
                      },
                    }))
                  }
                />
              </div>
              {integrations.analytics.googleAnalytics.enabled && (
                <div className="space-y-2">
                  <Input
                    placeholder="GA-XXXXXXXXX-X"
                    value={integrations.analytics.googleAnalytics.trackingId}
                    onChange={(e) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        analytics: {
                          ...prev.analytics,
                          googleAnalytics: { ...prev.analytics.googleAnalytics, trackingId: e.target.value },
                        },
                      }))
                    }
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enhanced-ecommerce"
                      checked={integrations.analytics.googleAnalytics.enhanced}
                      onCheckedChange={(checked) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          analytics: {
                            ...prev.analytics,
                            googleAnalytics: { ...prev.analytics.googleAnalytics, enhanced: checked },
                          },
                        }))
                      }
                    />
                    <Label htmlFor="enhanced-ecommerce">Enable Enhanced E-commerce</Label>
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="facebook-pixel">Facebook Pixel</Label>
                <Switch
                  id="facebook-pixel"
                  checked={integrations.analytics.facebookPixel.enabled}
                  onCheckedChange={(checked) =>
                    setIntegrations((prev) => ({
                      ...prev,
                      analytics: {
                        ...prev.analytics,
                        facebookPixel: { ...prev.analytics.facebookPixel, enabled: checked },
                      },
                    }))
                  }
                />
              </div>
              {integrations.analytics.facebookPixel.enabled && (
                <Input
                  placeholder="123456789012345"
                  value={integrations.analytics.facebookPixel.pixelId}
                  onChange={(e) =>
                    setIntegrations((prev) => ({
                      ...prev,
                      analytics: {
                        ...prev.analytics,
                        facebookPixel: { ...prev.analytics.facebookPixel, pixelId: e.target.value },
                      },
                    }))
                  }
                />
              )}
            </div>
          </div>

          {/* Payment Integrations */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Gateways
            </h4>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="mpesa-integration">M-Pesa</Label>
                <Switch
                  id="mpesa-integration"
                  checked={integrations.payments.mpesa.enabled}
                  onCheckedChange={(checked) =>
                    setIntegrations((prev) => ({
                      ...prev,
                      payments: { ...prev.payments, mpesa: { ...prev.payments.mpesa, enabled: checked } },
                    }))
                  }
                />
              </div>
              {integrations.payments.mpesa.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Shortcode"
                    value={integrations.payments.mpesa.shortcode}
                    onChange={(e) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        payments: {
                          ...prev.payments,
                          mpesa: { ...prev.payments.mpesa, shortcode: e.target.value },
                        },
                      }))
                    }
                  />
                  <Select
                    value={integrations.payments.mpesa.environment}
                    onValueChange={(value) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        payments: {
                          ...prev.payments,
                          mpesa: { ...prev.payments.mpesa, environment: value },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      placeholder="Consumer Key"
                      value={integrations.payments.mpesa.consumerKey}
                      onChange={(e) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          payments: {
                            ...prev.payments,
                            mpesa: { ...prev.payments.mpesa, consumerKey: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      placeholder="Consumer Secret"
                      value={integrations.payments.mpesa.consumerSecret}
                      onChange={(e) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          payments: {
                            ...prev.payments,
                            mpesa: { ...prev.payments.mpesa, consumerSecret: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="stripe-integration">Stripe</Label>
                <Switch
                  id="stripe-integration"
                  checked={integrations.payments.stripe.enabled}
                  onCheckedChange={(checked) =>
                    setIntegrations((prev) => ({
                      ...prev,
                      payments: { ...prev.payments, stripe: { ...prev.payments.stripe, enabled: checked } },
                    }))
                  }
                />
              </div>
              {integrations.payments.stripe.enabled && (
                <div className="space-y-3">
                  <Input
                    placeholder="Publishable Key"
                    value={integrations.payments.stripe.publicKey}
                    onChange={(e) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        payments: {
                          ...prev.payments,
                          stripe: { ...prev.payments.stripe, publicKey: e.target.value },
                        },
                      }))
                    }
                  />
                  <Input
                    type={showPasswords ? "text" : "password"}
                    placeholder="Secret Key"
                    value={integrations.payments.stripe.secretKey}
                    onChange={(e) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        payments: {
                          ...prev.payments,
                          stripe: { ...prev.payments.stripe, secretKey: e.target.value },
                        },
                      }))
                    }
                  />
                  <Input
                    type={showPasswords ? "text" : "password"}
                    placeholder="Webhook Secret"
                    value={integrations.payments.stripe.webhookSecret}
                    onChange={(e) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        payments: {
                          ...prev.payments,
                          stripe: { ...prev.payments.stripe, webhookSecret: e.target.value },
                        },
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Communication Integrations */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Communication Services
            </h4>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="twilio-integration">Twilio SMS</Label>
                <Switch
                  id="twilio-integration"
                  checked={integrations.communication.twilio.enabled}
                  onCheckedChange={(checked) =>
                    setIntegrations((prev) => ({
                      ...prev,
                      communication: {
                        ...prev.communication,
                        twilio: { ...prev.communication.twilio, enabled: checked },
                      },
                    }))
                  }
                />
              </div>
              {integrations.communication.twilio.enabled && (
                <div className="space-y-3">
                  <Input
                    placeholder="Account SID"
                    value={integrations.communication.twilio.accountSid}
                    onChange={(e) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        communication: {
                          ...prev.communication,
                          twilio: { ...prev.communication.twilio, accountSid: e.target.value },
                        },
                      }))
                    }
                  />
                  <Input
                    type={showPasswords ? "text" : "password"}
                    placeholder="Auth Token"
                    value={integrations.communication.twilio.authToken}
                    onChange={(e) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        communication: {
                          ...prev.communication,
                          twilio: { ...prev.communication.twilio, authToken: e.target.value },
                        },
                      }))
                    }
                  />
                  <Input
                    placeholder="Phone Number"
                    value={integrations.communication.twilio.phoneNumber}
                    onChange={(e) =>
                      setIntegrations((prev) => ({
                        ...prev,
                        communication: {
                          ...prev.communication,
                          twilio: { ...prev.communication.twilio, phoneNumber: e.target.value },
                        },
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPasswords(!showPasswords)}>
              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPasswords ? "Hide" : "Show"} API Keys
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
