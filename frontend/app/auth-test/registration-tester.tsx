"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Mail, Phone } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

export default function RegistrationTester() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [availabilityResult, setAvailabilityResult] = useState<{
    email?: boolean
    phone?: boolean
    loading?: boolean
    error?: string
  } | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const checkAvailability = async (type: "email" | "phone") => {
    try {
      setAvailabilityResult((prev) => ({ ...prev, loading: true }))

      const value = type === "email" ? formData.email : formData.phone
      if (!value) {
        toast({
          title: "Input required",
          description: `Please enter a ${type} to check`,
          variant: "destructive",
        })
        setAvailabilityResult((prev) => ({ ...prev, loading: false }))
        return
      }

      const response = await api.post("/api/check-availability", {
        [type]: value,
      })

      setAvailabilityResult({
        ...availabilityResult,
        [type]: response.data[`${type}_available`],
        loading: false,
      })

      toast({
        title: response.data[`${type}_available`] ? "Available" : "Not Available",
        description: response.data[`${type}_available`]
          ? `The ${type} is available for registration`
          : `The ${type} is already registered`,
        variant: response.data[`${type}_available`] ? "default" : "destructive",
      })
    } catch (error: any) {
      console.error(`Error checking ${type} availability:`, error)
      setAvailabilityResult({
        ...availabilityResult,
        error: error.response?.data?.msg || `Failed to check ${type} availability`,
        loading: false,
      })
      toast({
        title: "Error",
        description: error.response?.data?.msg || `Failed to check ${type} availability`,
        variant: "destructive",
      })
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      // Validate form
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      if (!formData.name || (!formData.email && !formData.phone) || !formData.password) {
        throw new Error("Please fill in all required fields")
      }

      // Prepare registration data
      const registrationData = {
        name: formData.name,
        password: formData.password,
      }

      if (formData.email) {
        Object.assign(registrationData, { email: formData.email })
      }

      if (formData.phone) {
        Object.assign(registrationData, { phone: formData.phone })
      }

      // Make API call
      const response = await api.post("/api/register", registrationData)

      setResult({
        success: true,
        data: response.data,
        status: response.status,
      })

      toast({
        title: "Registration Successful",
        description: "User registered successfully. Check verification tab to verify the account.",
      })
    } catch (error: any) {
      console.error("Registration error:", error)
      setResult({
        success: false,
        error: error.response?.data?.msg || error.message || "Registration failed",
        status: error.response?.status,
        details: error.response?.data,
      })

      toast({
        title: "Registration Failed",
        description: error.response?.data?.msg || error.message || "Registration failed",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testInvalidRegistration = async (testCase: string) => {
    setIsLoading(true)
    setResult(null)

    try {
      let testData = {}

      switch (testCase) {
        case "missing-fields":
          testData = { name: "Test User" }
          break
        case "invalid-email":
          testData = {
            name: "Test User",
            email: "not-an-email",
            password: "Password123",
          }
          break
        case "weak-password":
          testData = {
            name: "Test User",
            email: "test@example.com",
            password: "weak",
          }
          break
        case "duplicate-email":
          // Use an email that's likely to be registered already
          testData = {
            name: "Test User",
            email: "admin@mizizzi.com",
            password: "Password123",
          }
          break
        default:
          throw new Error("Invalid test case")
      }

      // Make API call expecting it to fail
      const response = await api.post("/api/register", testData)

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
      <Tabs defaultValue="register">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="register">Registration Form</TabsTrigger>
          <TabsTrigger value="availability">Availability Check</TabsTrigger>
          <TabsTrigger value="validation">Validation Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Registration Test</CardTitle>
              <CardDescription>Test the registration process with email or phone</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional if phone provided)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional if email provided)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+254712345678"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register"
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
                        Registration Successful
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Registration Failed
                      </>
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 text-sm">
                      {result.success ? (
                        <div className="space-y-2">
                          <p>User registered successfully!</p>
                          {result.data?.user_id && (
                            <p>
                              <strong>User ID:</strong> {result.data.user_id}
                            </p>
                          )}
                          {result.data?.msg && (
                            <p>
                              <strong>Message:</strong> {result.data.msg}
                            </p>
                          )}
                          <p className="text-amber-600 font-medium">
                            Note: The user needs to be verified. Go to the Verification tab to test verification.
                          </p>
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

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email & Phone Availability Check</CardTitle>
              <CardDescription>Check if an email or phone is available for registration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="check-email">Email to Check</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="check-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                    />
                    <Button
                      onClick={() => checkAvailability("email")}
                      disabled={availabilityResult?.loading || !formData.email}
                    >
                      {availabilityResult?.loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      <span className="ml-2">Check</span>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label htmlFor="check-phone">Phone to Check</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="check-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+254712345678"
                    />
                    <Button
                      onClick={() => checkAvailability("phone")}
                      disabled={availabilityResult?.loading || !formData.phone}
                    >
                      {availabilityResult?.loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                      <span className="ml-2">Check</span>
                    </Button>
                  </div>
                </div>
              </div>

              {availabilityResult && !availabilityResult.loading && (
                <div className="space-y-4">
                  <Separator />
                  <h3 className="text-lg font-medium">Results</h3>

                  {availabilityResult.email !== undefined && (
                    <div className="flex items-center space-x-2">
                      <span>Email:</span>
                      {availabilityResult.email ? (
                        <span className="text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Available
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          Already registered
                        </span>
                      )}
                    </div>
                  )}

                  {availabilityResult.phone !== undefined && (
                    <div className="flex items-center space-x-2">
                      <span>Phone:</span>
                      {availabilityResult.phone ? (
                        <span className="text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Available
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          Already registered
                        </span>
                      )}
                    </div>
                  )}

                  {availabilityResult.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{availabilityResult.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registration Validation Tests</CardTitle>
              <CardDescription>Test validation rules for the registration API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => testInvalidRegistration("missing-fields")}
                    disabled={isLoading}
                  >
                    Test Missing Fields
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testInvalidRegistration("invalid-email")}
                    disabled={isLoading}
                  >
                    Test Invalid Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testInvalidRegistration("weak-password")}
                    disabled={isLoading}
                  >
                    Test Weak Password
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testInvalidRegistration("duplicate-email")}
                    disabled={isLoading}
                  >
                    Test Duplicate Email
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
