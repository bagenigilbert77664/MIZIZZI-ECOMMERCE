"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, CheckCircle, RefreshCw, PhoneCall, Server } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function MpesaTestClient() {
  const { toast } = useToast()
  const [apiUrl, setApiUrl] = useState<string>(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")
  const [phone, setPhone] = useState<string>("")
  const [amount, setAmount] = useState<string>("1")
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [queryLoading, setQueryLoading] = useState<boolean>(false)
  const [response, setResponse] = useState<any>(null)
  const [queryResponse, setQueryResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [logMessages, setLogMessages] = useState<string[]>([])
  const [useDirectFetch, setUseDirectFetch] = useState<boolean>(true)
  const [useSimulation, setUseSimulation] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>("stk-push")
  const [token, setToken] = useState<string | null>(null)

  // Load token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("mizizzi_token") || localStorage.getItem("token")
    setToken(savedToken)
  }, [])

  // Add log message
  const addLog = (message: string) => {
    setLogMessages((prev) => [...prev, `[${new Date().toISOString()}] ${message}`])
  }

  // Clear logs
  const clearLogs = () => {
    setLogMessages([])
  }

  // Format phone number
  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove any non-digit characters
    let formatted = phoneNumber.replace(/\D/g, "")

    // Handle different Kenyan phone formats
    if (formatted.startsWith("0")) {
      // Convert 07XXXXXXXX or 01XXXXXXXX to 254XXXXXXXX
      formatted = "254" + formatted.substring(1)
    } else if ((formatted.startsWith("7") || formatted.startsWith("1")) && formatted.length <= 9) {
      // If it starts with 7 or 1 and is short enough to be a local number
      formatted = "254" + formatted
    } else if (formatted.startsWith("+")) {
      // Remove the + if present
      formatted = formatted.substring(1)
    } else if (!formatted.startsWith("254")) {
      // Add country code if not present
      formatted = "254" + formatted
    }

    return formatted
  }

  // Test STK Push
  const testStkPush = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    const formattedPhone = formatPhoneNumber(phone)
    addLog(`Testing STK Push with phone: ${formattedPhone}, amount: ${amount}`)

    try {
      const endpoint = `${apiUrl}/api/mpesa/direct-payment`
      addLog(`Making request to: ${endpoint}`)

      const requestBody = {
        phone: formattedPhone,
        amount: Number.parseInt(amount),
        force_stk: true,
        account_reference: `TEST-${Date.now()}`,
        transaction_desc: "Test payment",
        simulate: useSimulation,
      }

      addLog(`Request payload: ${JSON.stringify(requestBody)}`)

      let response
      if (useDirectFetch) {
        // Use fetch API directly
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        response = { data }
      } else {
        // Use axios through the api module
        const api = (await import("@/lib/api")).default
        response = await api.post(endpoint, requestBody)
      }

      addLog(`Response received: ${JSON.stringify(response.data)}`)
      setResponse(response.data)

      if (response.data.success || response.data.ResponseCode === "0") {
        toast({
          title: "STK Push initiated",
          description: "Check your phone for the M-PESA prompt",
        })

        // Extract checkout request ID
        const checkoutId =
          response.data.checkout_request_id ||
          response.data.CheckoutRequestID ||
          (response.data.response && response.data.response.CheckoutRequestID)

        if (checkoutId) {
          setCheckoutRequestId(checkoutId)
          addLog(`Checkout Request ID: ${checkoutId}`)
        }
      } else {
        const errorMsg = response.data.error || response.data.message || "Unknown error"
        setError(errorMsg)
        addLog(`Error: ${errorMsg}`)
        toast({
          variant: "destructive",
          title: "STK Push failed",
          description: errorMsg,
        })
      }
    } catch (err: any) {
      console.error("Error testing STK Push:", err)
      const errorMsg = err.message || "An error occurred"
      setError(errorMsg)
      addLog(`Exception: ${errorMsg}`)
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  // Test Query Status
  const testQueryStatus = async () => {
    if (!checkoutRequestId) {
      setQueryError("Checkout Request ID is required")
      return
    }

    setQueryLoading(true)
    setQueryError(null)
    setQueryResponse(null)

    addLog(`Testing Query Status with Checkout Request ID: ${checkoutRequestId}`)

    try {
      const endpoint = `${apiUrl}/api/mpesa/query`
      addLog(`Making request to: ${endpoint}`)

      const requestBody = {
        checkout_request_id: checkoutRequestId,
      }

      addLog(`Request payload: ${JSON.stringify(requestBody)}`)

      let response
      if (useDirectFetch) {
        // Use fetch API directly
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        response = { data }
      } else {
        // Use axios through the api module
        const api = (await import("@/lib/api")).default
        response = await api.post(endpoint, requestBody)
      }

      addLog(`Response received: ${JSON.stringify(response.data)}`)
      setQueryResponse(response.data)

      // Interpret the result
      if (response.data.success) {
        const resultCode = response.data.response?.ResultCode
        if (resultCode === 0) {
          toast({
            title: "Payment successful",
            description: "The transaction was completed successfully",
          })
        } else if (resultCode === 1) {
          toast({
            title: "Payment pending",
            description: "The transaction is still being processed",
          })
        } else if (resultCode === 1032) {
          toast({
            variant: "destructive",
            title: "Payment cancelled",
            description: "The transaction was cancelled by the user",
          })
        } else {
          toast({
            variant: "destructive",
            title: "Payment failed",
            description: response.data.response?.ResultDesc || "Unknown error",
          })
        }
      } else {
        const errorMsg = response.data.error || "Failed to query payment status"
        setQueryError(errorMsg)
        addLog(`Error: ${errorMsg}`)
        toast({
          variant: "destructive",
          title: "Query failed",
          description: errorMsg,
        })
      }
    } catch (err: any) {
      console.error("Error querying status:", err)
      const errorMsg = err.message || "An error occurred"
      setQueryError(errorMsg)
      addLog(`Exception: ${errorMsg}`)
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setQueryLoading(false)
    }
  }

  // Test backend health
  const testBackendHealth = async () => {
    addLog("Testing backend health...")

    try {
      const endpoint = `${apiUrl}/api/health`
      addLog(`Making request to: ${endpoint}`)

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      addLog(`Backend health response: ${JSON.stringify(data)}`)

      toast({
        title: "Backend health check",
        description: data.status === "ok" ? "Backend is healthy" : "Backend status: " + data.status,
      })
    } catch (err: any) {
      console.error("Error checking backend health:", err)
      const errorMsg = err.message || "An error occurred"
      addLog(`Backend health check failed: ${errorMsg}`)
      toast({
        variant: "destructive",
        title: "Backend health check failed",
        description: errorMsg,
      })
    }
  }

  // Test M-PESA credentials
  const testMpesaCredentials = async () => {
    addLog("Testing M-PESA credentials...")

    try {
      const endpoint = `${apiUrl}/api/mpesa/test-auth`
      addLog(`Making request to: ${endpoint}`)

      let response
      if (useDirectFetch) {
        // Use fetch API directly
        response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        response = { data }
      } else {
        // Use axios through the api module
        const api = (await import("@/lib/api")).default
        response = await api.get(endpoint)
      }

      addLog(`M-PESA credentials test response: ${JSON.stringify(response.data)}`)

      toast({
        title: "M-PESA credentials test",
        description: response.data.success
          ? "M-PESA credentials are valid"
          : "M-PESA credentials test failed: " + response.data.error,
      })
    } catch (err: any) {
      console.error("Error testing M-PESA credentials:", err)
      const errorMsg = err.message || "An error occurred"
      addLog(`M-PESA credentials test failed: ${errorMsg}`)
      toast({
        variant: "destructive",
        title: "M-PESA credentials test failed",
        description: errorMsg,
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="mr-2 h-5 w-5" />
            Backend Configuration
          </CardTitle>
          <CardDescription>Configure the backend API settings for testing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">API URL</Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="direct-fetch" checked={useDirectFetch} onCheckedChange={setUseDirectFetch} />
              <Label htmlFor="direct-fetch">Use direct fetch API (bypass axios)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="simulation" checked={useSimulation} onCheckedChange={setUseSimulation} />
              <Label htmlFor="simulation">Enable simulation mode (for testing)</Label>
            </div>

            <div className="flex space-x-2">
              <Button onClick={testBackendHealth} variant="outline" size="sm">
                Test Backend Health
              </Button>
              <Button onClick={testMpesaCredentials} variant="outline" size="sm">
                Test M-PESA Credentials
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stk-push">STK Push Test</TabsTrigger>
          <TabsTrigger value="query-status">Query Status Test</TabsTrigger>
        </TabsList>

        <TabsContent value="stk-push">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PhoneCall className="mr-2 h-5 w-5" />
                Test M-PESA STK Push
              </CardTitle>
              <CardDescription>
                Test the M-PESA STK Push functionality by sending a request to your phone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XXXXXXXX or 254XXXXXXXXX"
                    />
                    <p className="text-xs text-gray-500">
                      Enter a valid Kenyan phone number. Will be formatted to 254XXXXXXXXX.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (KES)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500">Minimum amount is 1 KES for testing.</p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {response && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-sm font-medium mb-2">Response:</p>
                    <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded max-h-40">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={clearLogs}>
                Clear Logs
              </Button>
              <Button onClick={testStkPush} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test STK Push"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="query-status">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="mr-2 h-5 w-5" />
                Test M-PESA Query Status
              </CardTitle>
              <CardDescription>Check the status of an M-PESA transaction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="checkout-request-id">Checkout Request ID</Label>
                  <Input
                    id="checkout-request-id"
                    value={checkoutRequestId}
                    onChange={(e) => setCheckoutRequestId(e.target.value)}
                    placeholder="ws_CO_XXXXXXXXX"
                  />
                  <p className="text-xs text-gray-500">
                    Enter the CheckoutRequestID from the STK Push response to check its status.
                  </p>
                </div>

                {queryError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{queryError}</p>
                  </div>
                )}

                {queryResponse && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-sm font-medium mb-2">Response:</p>
                    <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded max-h-40">
                      {JSON.stringify(queryResponse, null, 2)}
                    </pre>

                    {queryResponse.response && typeof queryResponse.response.ResultCode !== "undefined" && (
                      <div
                        className={`mt-3 p-2 rounded ${
                          queryResponse.response.ResultCode === 0
                            ? "bg-green-100 border border-green-200"
                            : queryResponse.response.ResultCode === 1
                              ? "bg-yellow-100 border border-yellow-200"
                              : "bg-red-100 border border-red-200"
                        }`}
                      >
                        <div className="flex items-center">
                          {queryResponse.response.ResultCode === 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          ) : queryResponse.response.ResultCode === 1 ? (
                            <Loader2 className="h-5 w-5 text-yellow-500 mr-2" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          <p className="text-sm font-medium">
                            {queryResponse.response.ResultCode === 0
                              ? "Payment Successful"
                              : queryResponse.response.ResultCode === 1
                                ? "Payment Pending"
                                : "Payment Failed"}
                          </p>
                        </div>
                        <p className="text-xs mt-1 ml-7">{queryResponse.response.ResultDesc}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={clearLogs}>
                Clear Logs
              </Button>
              <Button onClick={testQueryStatus} disabled={queryLoading || !checkoutRequestId}>
                {queryLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Querying...
                  </>
                ) : (
                  "Query Status"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
          <CardDescription>Detailed logs of API requests and responses</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            readOnly
            className="font-mono text-xs h-64"
            value={logMessages.join("\n")}
            placeholder="Logs will appear here..."
          />
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={clearLogs} className="w-full">
            Clear Logs
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
