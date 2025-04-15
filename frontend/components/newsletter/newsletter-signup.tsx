"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Mail } from "lucide-react"

export function NewsletterSignup() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Success!",
        description: "You've been subscribed to our newsletter.",
      })

      setEmail("")
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Failed to subscribe to the newsletter. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg shadow-sm border border-orange-200 my-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-500" />
            Join Our Newsletter
          </h3>
          <p className="text-gray-600 max-w-md">
            Subscribe to our newsletter for exclusive deals, new arrivals, and shopping tips.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full md:w-auto gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full md:w-64 bg-white"
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </div>
  )
}
