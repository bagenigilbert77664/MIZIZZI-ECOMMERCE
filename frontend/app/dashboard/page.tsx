import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductLiveUpdates } from "@/components/dashboard/product-live-updates"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "User dashboard with recent orders, wishlist, and account information",
}

export default function DashboardPage() {
  // Server-side redirect if not authenticated
  // In a real implementation, you would check the session server-side
  const isAuthenticated = true // Mock authentication for example

  if (!isAuthenticated) {
    redirect("/auth/login?callbackUrl=/dashboard")
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your recent purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">You have no recent orders.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Wishlist</CardTitle>
                <CardDescription>Items you've saved for later</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Account</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Update your profile and preferences.</p>
              </CardContent>
            </Card>
          </div>

          {/* Add the ProductLiveUpdates component to show real-time updates */}
          <ProductLiveUpdates />
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>View and track your orders</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">You have no orders yet.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wishlist">
          <Card>
            <CardHeader>
              <CardTitle>My Wishlist</CardTitle>
              <CardDescription>Items you've saved for later</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Update your profile information and preferences.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

