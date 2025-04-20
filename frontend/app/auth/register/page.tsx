"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Diamond, Heart, Award, Shield, Clock } from "lucide-react"
import { useAuth } from "@/contexts/auth/auth-context"
import { Loader } from "@/components/ui/loader"
import { RegisterForm as RegisterFormComponent } from "@/components/auth/register-form"

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // If user is already authenticated, redirect to home
    if (isAuthenticated && !isLoading && mounted) {
      router.push("/")
    }
  }, [isAuthenticated, router, isLoading, mounted])

  if (!mounted) return null

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-white to-gray-50">
        <Loader size="lg" className="text-cherry-800" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cherry-950 overflow-hidden relative">
        {/* Luxury background with enhanced overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-04-09%2009-17-02-BQXMGELSvRMZnOdcW9r3N4cdzJNNHy.png"
            alt="Luxury Ring Background"
            fill
            className="object-cover opacity-20 mix-blend-overlay"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cherry-950/95 via-cherry-950/90 to-cherry-900/85" />

          {/* Subtle pattern overlay for luxury feel */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
            }}
          />

          {/* Gold accent elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-400/0 via-gold-400/50 to-gold-400/0 rounded-full blur-sm"></div>
        </div>

        <main className="relative z-10 container mx-auto px-4 py-8 md:py-12 lg:py-16 flex flex-col lg:flex-row items-center justify-center min-h-screen">
          {/* Left side content - enhanced luxury presentation */}
          <div className="w-full lg:w-5/12 text-white mb-6 lg:mb-0 animate-fade-in-up">
            <div className="flex items-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cherry-800/40 to-cherry-900/40 backdrop-blur-sm p-1 mr-3 shadow-lg border border-white/10 group transition-all duration-500 hover:border-gold-400/30">
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold-300/20 to-gold-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                    alt="Mizizzi Logo"
                    width={32}
                    height={32}
                    className="h-full w-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight gold-gradient-text">Mizizzi Store</span>
                <span className="text-sm text-gold-200/80">Exclusive Collection</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
              <span className="block gold-gradient-text">Join our exclusive</span>
              <span className="block">community today</span>
            </h1>

            <p className="text-base text-gray-200 mb-4 max-w-lg leading-relaxed">
              Create your Mizizzi account and unlock a world of premium jewelry and fashion. Enjoy personalized
              recommendations, exclusive offers, and a seamless shopping experience.
            </p>

            {/* Enhanced feature boxes with luxury styling */}
            <div className="space-y-4 max-w-md">
              <div className="flex items-start group">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cherry-800/30 to-cherry-900/30 backdrop-blur-sm flex items-center justify-center mr-3 border border-white/10 transition-all duration-300 group-hover:border-gold-400/30">
                  <Diamond className="h-4 w-4 text-gold-200 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-gold-200 transition-colors duration-300">
                    Member Benefits
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm">
                    Enjoy exclusive discounts, early access to new collections, and special birthday offers
                  </p>
                </div>
              </div>

              <div className="flex items-start group">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cherry-800/30 to-cherry-900/30 backdrop-blur-sm flex items-center justify-center mr-3 border border-white/10 transition-all duration-300 group-hover:border-gold-400/30">
                  <Heart className="h-4 w-4 text-gold-200 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-gold-200 transition-colors duration-300">
                    Wishlist & Favorites
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm">
                    Save your favorite items and create wishlists for future purchases or special occasions
                  </p>
                </div>
              </div>

              <div className="flex items-start group">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cherry-800/30 to-cherry-900/30 backdrop-blur-sm flex items-center justify-center mr-3 border border-white/10 transition-all duration-300 group-hover:border-gold-400/30">
                  <Award className="h-4 w-4 text-gold-200 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-gold-200 transition-colors duration-300">
                    Order Tracking
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm">
                    Track your orders in real-time and access your complete purchase history
                  </p>
                </div>
              </div>
            </div>

            {/* Luxury badge */}
            <div className="hidden md:flex items-center mt-4 space-x-4">
              <div className="flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-cherry-800/20 to-cherry-900/20 backdrop-blur-sm border border-white/10">
                <Shield className="h-3 w-3 text-gold-300 mr-1" />
                <span className="text-sm text-gold-100">Secure Account</span>
              </div>
              <div className="flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-cherry-800/20 to-cherry-900/20 backdrop-blur-sm border border-white/10">
                <Clock className="h-3 w-3 text-gold-300 mr-1" />
                <span className="text-sm text-gold-100">Quick Registration</span>
              </div>
            </div>
          </div>

          {/* Right side: Register form with enhanced luxury styling */}
          <div className="w-full sm:w-10/12 md:w-8/12 lg:w-6/12 xl:w-5/12 animate-fade-in-up animation-delay-300">
            <div className="relative">
              {/* Gold accent elements */}
              <div className="absolute -top-1 -left-1 right-1 h-1 bg-gradient-to-r from-gold-400/0 via-gold-400/50 to-gold-400/0 rounded-full blur-sm"></div>
              <div className="absolute -bottom-1 -right-1 left-1 h-1 bg-gradient-to-r from-gold-400/0 via-gold-400/50 to-gold-400/0 rounded-full blur-sm"></div>

              {/* Enhanced card with luxury styling */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden border border-white/70 transform transition-all duration-500 hover:shadow-[0_25px_60px_rgba(0,0,0,0.35)] hover:translate-y-[-5px] p-4">
                <RegisterFormComponent />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return null
}
