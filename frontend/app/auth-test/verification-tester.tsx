"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

export default function VerificationTester() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [token, setToken] = useState("")

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      if (!token) {
        throw new Error("Please provide a verification token")
      }

      const response = await api.post("/api/verify-email", { token })

      setResult({
        success: true,
        data: response.data,
        status: response.status,
      })

      toast({
        title: "Verification Successful",
        description: "Your email has been verified successfully.",
      })
    } catch (error: any) {
      console.error("Verification error:", error)
      setResult({
        success: false,
        error: error.response?.data?.msg || error.message || "Failed to verify email",
        status: error.response?.status,
        details: error.response?.data,
      })

      toast({
        title: "Verification Failed",
        description: error.response?.data?.msg || error.message || "Failed to verify email",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await api.post("/api/resend-verification")

      setResult({
        success: true,
        data: response.data,
        status: response.status,
      })

      toast({
        title: "Verification Email Sent",
        description: "A new verification email has been sent to your address.",
      })
    } catch (error: any) {
      console.error("Resend verification error:", error)
      setResult({
        success: false,
        error: error.response?.data?.msg || error.message || "Failed to resend verification email",
        status: error.response?.status,
        details: error.response?.data,
      })

      toast({
        title: "Resend Failed",
        description: error.response?.data?.msg || error.message || "Failed to resend verification email",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Verification Token</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleResendVerification}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Resend Verification Email"
                )}
              </Button>
            </div>
          </form>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
              <AlertTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {token ? "Verification Successful" : "Verification Email Sent"}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    {token ? "Verification Failed" : "Resend Failed"}
                  </>
                )}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 text-sm">
                  {result.success ? (
                    <div className="space-y-2">
                      <p>{token ? "Email verified successfully!" : "Verification email sent successfully!"}</p>
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
    </div>
  )
}
