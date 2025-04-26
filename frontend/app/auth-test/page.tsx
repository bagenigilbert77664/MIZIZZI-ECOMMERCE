"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import LoginTester from "./login-tester"
import RegistrationTester from "./registration-tester"
import TokenTester from "./token-tester"
import VerificationTester from "./verification-tester"
import PasswordResetTester from "./password-reset-tester"
import CartAuthTester from "./cart-auth-tester"
import ProtectedRoutesTester from "./protected-routes-tester"

export default function AuthTestPage() {
  const [activeTab, setActiveTab] = useState("login")

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Auth Testing Suite</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-7">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="token">Token</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="password-reset">Password Reset</TabsTrigger>
          <TabsTrigger value="cart-auth">Cart Auth</TabsTrigger>
          <TabsTrigger value="protected-routes">Protected Routes</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login Testing</CardTitle>
                <CardDescription>Test the login functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <LoginTester />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Registration Testing</CardTitle>
                <CardDescription>Test the registration functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <RegistrationTester />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="token">
            <Card>
              <CardHeader>
                <CardTitle>Token Testing</CardTitle>
                <CardDescription>Test JWT token functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <TokenTester />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle>Email Verification Testing</CardTitle>
                <CardDescription>Test email verification functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <VerificationTester />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password-reset">
            <Card>
              <CardHeader>
                <CardTitle>Password Reset Testing</CardTitle>
                <CardDescription>Test password reset functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordResetTester />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cart-auth">
            <Card>
              <CardHeader>
                <CardTitle>Cart Authentication Testing</CardTitle>
                <CardDescription>Test cart authentication integration</CardDescription>
              </CardHeader>
              <CardContent>
                <CartAuthTester />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="protected-routes">
            <Card>
              <CardHeader>
                <CardTitle>Protected Routes Testing</CardTitle>
                <CardDescription>Test protected route functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <ProtectedRoutesTester />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
