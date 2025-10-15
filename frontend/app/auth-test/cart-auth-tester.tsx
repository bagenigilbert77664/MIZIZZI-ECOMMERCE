"use client"

import { useAuth } from "@/contexts/auth/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, ShoppingCart, LogIn } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CartAuthTester() {
  const { user, isAuthenticated, loading } = useAuth()
  const [showDetails, setShowDetails] = useState(false)
  const router = useRouter()

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/cart")
      return
    }

    // Simulate adding to cart
    alert("Item added to cart!")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Alert variant={isAuthenticated ? "default" : "destructive"}>
              <AlertTitle className="flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Authentication Status: Authenticated
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Authentication Status: Not Authenticated
                  </>
                )}
              </AlertTitle>
              <AlertDescription>
                {loading ? (
                  "Checking authentication status..."
                ) : isAuthenticated ? (
                  <div className="mt-2">
                    <p>User is authenticated and can add items to cart.</p>
                    <Button variant="link" className="p-0 h-auto text-sm" onClick={() => setShowDetails(!showDetails)}>
                      {showDetails ? "Hide Details" : "Show Details"}
                    </Button>

                    {showDetails && (
                      <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                        <p>
                          <strong>User ID:</strong> {user?.id}
                        </p>
                        <p>
                          <strong>Email:</strong> {user?.email}
                        </p>
                        {user?.name && (
                          <p>
                            <strong>Name:</strong> {user.name}
                          </p>
                        )}
                        <p>
                          <strong>Verified:</strong> {user?.emailVerified ? "Yes" : "No"}
                        </p>
                        {user?.role && (
                          <p>
                            <strong>Role:</strong> {user.role}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2">User is not authenticated. Please log in to add items to cart.</p>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAddToCart} className="flex-1">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>

              {!isAuthenticated && (
                <Button variant="outline" className="flex-1" onClick={() => router.push("/auth/login")}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
