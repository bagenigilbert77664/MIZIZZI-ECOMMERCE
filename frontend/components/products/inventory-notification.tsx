import { useState } from "react"
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface InventoryNotificationProps {
  productId: number
  productName: string
  variantId?: number
  variantName?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function InventoryNotification({
  productId,
  productName,
  variantId,
  variantName,
  className = "",
  size = "md"
}: InventoryNotificationProps) {
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Size classes
  const sizeClasses = {
    sm: "text-xs h-7 px-2",
    md: "text-sm h-9 px-3",
    lg: "text-base h-10 px-4"
  }

  const handleSubscribe = async () => {
    if (!email && !isAuthenticated) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to receive notifications.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Here you would call your API to subscribe the user
      // For now, we'll simulate a successful subscription
      await new Promise(resolve => setTimeout(resolve, 1000))

      setIsSubscribed(true)
      setIsDialogOpen(false)

      toast({
        title: "Notification Set",
        description: "We'll notify you when this product is back in stock.",
      })
    } catch (error) {
      console.error("Error subscribing to notifications:", error)
      toast({
        title: "Subscription Failed",
        description: "We couldn't set up your notification. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnsubscribe = async () => {
    setIsSubmitting(true)

    try {
      // Here you would call your API to unsubscribe the user
      // For now, we'll simulate a successful unsubscription
      await new Promise(resolve => setTimeout(resolve, 1000))

      setIsSubscribed(false)

      toast({
        title: "Notification Removed",
        description: "You will no longer receive notifications for this product.",
      })
    } catch (error) {
      console.error("Error unsubscribing from notifications:", error)
      toast({
        title: "Unsubscribe Failed",
        description: "We couldn't remove your notification. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubscribed) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`${sizeClasses[size]} ${className} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800`}
        onClick={handleUnsubscribe}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <BellOff className="mr-2 h-4 w-4" />
        )}
        Cancel Notification
      </Button>
    )
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`${sizeClasses[size]} ${className} border-cherry-200 bg-cherry-50 text-cherry-700 hover:bg-cherry-100 hover:text-cherry-800`}
        >
          <Bell className="mr-2 h-4 w-4" />
          Notify Me
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Get Back In Stock Notification</DialogTitle>
          <DialogDescription>
            We'll send you an email when {productName} {variantName ? `(${variantName})` : ""} is back in stock.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!isAuthenticated && (
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="col-span-4 text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="col-span-4"
              />
            </div>
          )}
          {isAuthenticated && (
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
              We'll send the notification to: {user?.email}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubscribe} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bell className="mr-2 h-4 w-4" />
            )}
            Notify Me
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
