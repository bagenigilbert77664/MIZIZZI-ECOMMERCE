"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { RegisterForm } from "@/components/auth/register-form"
import { MapPin, Heart, Clock } from "lucide-react"

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-cherry-950 overflow-hidden relative">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1470&auto=format&fit=crop"
          alt="Luxury Ring Background"
          fill
          className="object-cover opacity-30 mix-blend-overlay"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cherry-950/90 to-cherry-900/80" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-12 md:py-20 flex flex-col lg:flex-row items-center justify-between min-h-screen">
        {/* Left side content */}
        <div className="w-full lg:w-5/12 text-white mb-10 lg:mb-0">
          <div className="flex items-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 mr-3 shadow-lg">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                alt="Mizizzi Logo"
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight">Mizizzi Store</span>
              <span className="text-sm text-gray-300">Exclusive Collection</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Begin your luxury journey with us</h1>

          <p className="text-lg text-gray-200 mb-10 max-w-lg">
            Join Mizizzi today and discover a world where craftsmanship meets elegance. Our curated collections of
            jewelry and fashion pieces are designed to elevate your style.
          </p>

          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mr-4">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Global Shipping</h3>
                <p className="text-gray-300">We deliver our premium pieces to doorsteps worldwide</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mr-4">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Crafted with Love</h3>
                <p className="text-gray-300">Each piece is meticulously designed with passion and precision</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mr-4">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Timeless Elegance</h3>
                <p className="text-gray-300">Our designs transcend trends, becoming heirlooms for generations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Registration form */}
        <div className="w-full lg:w-6/12 xl:w-5/12">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <RegisterForm />
          </div>
        </div>
      </main>
    </div>
  )
}

