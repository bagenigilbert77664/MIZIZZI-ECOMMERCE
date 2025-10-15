"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

export default function PasswordResetTester() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [requestFormData, setRequestFormData] = useState({
    email: "",
  })
  const [resetFormData, setResetFormData] = useState({
    token: "",
    password: "",
    confirmPassword: "",
  })

  const handleRequestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setRequestFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleResetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setResetFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      if (!requestFormData.email) {
        throw new Error("Please provide an email address")
      }

      const response = await api.post("/api/forgot-password", {
        email: requestFormData.email,
      })

      setResult({
        success: true,
        data: response.data,
        status: response.status,
      })

      toast({
        title: "Reset Email Sent",
        description: "A password reset email has been sent to your address.",
      })
    } catch (error: any) {
      console.error("Password reset request error:", error)
      setResult({
        success: false,
        error: error.response?.data?.msg || error.message || "Failed to request password reset",
        status: error.response?.status,
        details: error.response?.data,
      })

      toast({
        title: "Request Failed",
        description: error.response?.data?.msg || error.message || "Failed to request password reset",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      if (!resetFormData.token || !resetFormData.password) {
        throw new Error("Please provide both token and new password")
      }

      if (resetFormData.password !== resetFormData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      const response = await api.post("/api/reset-password", {
        token: resetFormData.token,
        password: resetFormData.password,
      })

      setResult({
        success: true,
        data: response.data,
        status: response.status,
      })

      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset successfully.",
      })
    } catch (error: any) {
      console.error("Password reset error:", error)
      setResult({
        success: false,
        error: error.response?.data?.msg || error.message || "Failed to reset password",
        status: error.response?.status,
        details: error.response?.data,
      })

      toast({
        title: "Reset Failed",
        description: error.response?.data?.msg || error.message || "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="request">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="request">Request Reset</TabsTrigger>
          <TabsTrigger value="reset">Reset Password</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Password Reset</CardTitle>
              <CardDescription>Request a password reset email</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={requestFormData.email}
                    onChange={handleRequestInputChange}
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Request Reset Email"
                  )}
                </Button>
              </form>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
                  <AlertTitle className="flex items-center gap-2">
                    {result.success ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Reset Email Sent
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Request Failed
                      </>
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 text-sm">
                      {result.success ? (
                        <div className="space-y-2">
                          <p>Password reset email sent successfully!</p>
                          {result.data?.msg && (
                            <p>
                              <strong>Message:</strong> {result.data.msg}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>
                            <strong>Error:</strong> {result.error}
                          </p>
                          {result.status && (
                            <p>
                              <strong>Status:</strong> {result.status}
                            </p>
                          )}
                          {result.details && (
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Reset your password with a token</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">Reset Token</Label>
                  <Input
                    id="token"
                    name="token"
                    value={resetFormData.token}
                    onChange={handleResetInputChange}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={resetFormData.password}
                    onChange={handleResetInputChange}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={resetFormData.confirmPassword}
                    onChange={handleResetInputChange}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
                  <AlertTitle className="flex items-center gap-2">
                    {result.success ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Password Reset Successful
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Password Reset Failed
                      </>
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 text-sm">
                      {result.success ? (
                        <div className="space-y-2">
                          <p>Password has been reset successfully!</p>
                          {result.data?.msg && (
                            <p>
                              <strong>Message:</strong> {result.data.msg}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>
                            <strong>Error:</strong> {result.error}
                          </p>
                          {result.status && (
                            <p>
                              <strong>Status:</strong> {result.status}
                            </p>
                          )}
                          {result.details && (
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
