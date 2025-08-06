"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"

export default function LoginTester() {
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      // Validate form
      if (!formData.identifier || !formData.password) {
        throw new Error("Please fill in all required fields")
      }

      // Make API call directly instead of using context to see raw response
      const response = await api.post("/api/login", {
        identifier: formData.identifier,
        password: formData.password,
      })

      setResult({
        success: true,
        data: response.data,
        status: response.status,
      })

      toast({
        title: "Login Successful",
        description: "You have been logged in successfully.",
      })
    } catch (error: any) {
      console.error("Login error:", error)
      setResult({
        success: false,
        error: error.response?.data?.msg || error.message || "Login failed",
        status: error.response?.status,
        details: error.response?.data,
      })

      toast({
        title: "Login Failed",
        description: error.response?.data?.msg || error.message || "Login failed",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testInvalidLogin = async (testCase: string) => {
    setIsLoading(true)
    setResult(null)

    try {
      let testData = {}

      switch (testCase) {
        case "missing-fields":
          testData = { identifier: "test@example.com" }
          break
        case "invalid-credentials":
          testData = {
            identifier: "nonexistent@example.com",
            password: "WrongPassword123",
          }
          break
        case "unverified-email":
          // Use an email that's registered but not verified
          testData = {
            identifier: "unverified@example.com",
            password: "Password123",
          }
          break
        default:
          throw new Error("Invalid test case")
      }

      // Make API call expecting it to fail
      const response = await api.post("/api/login", testData)

      // If we get here, the test failed because it should have thrown an error
      setResult({
        success: false,
        error: "Validation failed: The request should have been rejected",
        status: response.status,
        details: response.data,
        testCase,
      })
    } catch (error: any) {
      // This is actually a success for our test
      setResult({
        success: true,
        data: {
          testCase,
          error: error.response?.data?.msg || error.message,
          status: error.response?.status,
        },
      })

      toast({
        title: "Validation Test Passed",
        description: `The API correctly rejected the ${testCase} test case`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="login">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="login">Login Form</TabsTrigger>
          <TabsTrigger value="validation">Validation Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Login Test</CardTitle>
              <CardDescription>Test the login process with email or phone</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or Phone</Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleInputChange}
                    placeholder="Email or Phone Number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col">
              {result && (
                <Alert variant={result.success ? "default" : "destructive"} className="w-full mt-4">
                  <AlertTitle className="flex items-center gap-2">
                    {result.success ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Login Successful
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Login Failed
                      </>
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 text-sm">
                      {result.success ? (
                        <div className="space-y-2">
                          <p>User logged in successfully!</p>
                          {result.data?.user && (
                            <>
                              <p>
                                <strong>User ID:</strong> {result.data.user.id}
                              </p>
                              <p>
                                <strong>Name:</strong> {result.data.user.name}
                              </p>
                              <p>
                                <strong>Email:</strong> {result.data.user.email || "N/A"}
                              </p>
                            </>
                          )}
                          {result.data?.access_token && (
                            <p>
                              <strong>Access Token:</strong>{" "}
                              <span className="text-xs break-all">{result.data.access_token.substring(0, 20)}...</span>
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
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Login Validation Tests</CardTitle>
              <CardDescription>Test validation rules for the login API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" onClick={() => testInvalidLogin("missing-fields")} disabled={isLoading}>
                    Test Missing Fields
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testInvalidLogin("invalid-credentials")}
                    disabled={isLoading}
                  >
                    Test Invalid Credentials
                  </Button>
                  <Button variant="outline" onClick={() => testInvalidLogin("unverified-email")} disabled={isLoading}>
                    Test Unverified Email
                  </Button>
                </div>

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

                {result && (
                  <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
                    <AlertTitle className="flex items-center gap-2">
                      {result.success ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Validation Test Passed
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          Validation Test Failed
                        </>
                      )}
                    </AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 text-sm">
                        {result.success ? (
                          <div className="space-y-2">
                            <p>
                              <strong>Test Case:</strong> {result.data?.testCase}
                            </p>
                            <p>
                              <strong>Error Message:</strong> {result.data?.error}
                            </p>
                            <p>
                              <strong>Status Code:</strong> {result.data?.status}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p>
                              <strong>Error:</strong> {result.error}
                            </p>
                            <p>
                              <strong>Test Case:</strong> {result.testCase}
                            </p>
                            <p>
                              <strong>Status:</strong> {result.status}
                            </p>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
