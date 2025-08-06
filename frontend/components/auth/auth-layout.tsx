"use client"

import { useState, useEffect } from "react"
import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

interface AuthLayoutProps {
  children: React.ReactNode
  className?: string
}

const testimonials = [
  {
    name: "Sofia Davis",
    role: "Premium Customer",
    initials: "SD",
    quote: "Mizizzi has transformed how I shop online. The experience is seamless and the products are amazing!"
  },
  {
    name: "James Miller",
    role: "Verified Buyer",
    initials: "JM",
    quote: "Great quality, fast delivery, and an overall smooth experience. Mizizzi never disappoints!"
  },
  {
    name: "Amina Khan",
    role: "Loyal Customer",
    initials: "AK",
    quote: "I love how intuitive the platform is. Shopping with Mizizzi feels personalized every time!"
  },
  {
    name: "Emeka Nwosu",
    role: "Business Owner",
    initials: "EN",
    quote: "Mizizzi helps me restock with ease. I rely on it for both quality and consistency."
  },
  {
    name: "Lily Zhang",
    role: "Happy Customer",
    initials: "LZ",
    quote: "From browsing to checkout, everything is smooth. The attention to detail is what sets Mizizzi apart."
  },
]

export function AuthLayout({ children, className }: AuthLayoutProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length)
    }, 5000) // 5s interval

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex justify-center items-center py-12 px-4 min-h-screen bg-[#f9f9f9]">
      <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-5 bg-white rounded-xl shadow-lg overflow-hidden">

        {/* Image Section */}
        <div className="relative hidden md:block md:col-span-2 bg-gray-100">
          <Image
            src="/ten.jpg"
            alt="Authentication"
            width={800}
            height={800}
            className="h-full w-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/10 to-transparent flex flex-col justify-end p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="bg-black/50 backdrop-blur-sm p-4 rounded-lg mb-4 border border-white/10 shadow-lg"
              >
                <blockquote className="text-base font-medium text-white">
                  “{testimonials[current].quote}”
                </blockquote>
                <footer className="text-sm text-white/80 mt-3 flex items-center">
                  <div className="w-8 h-8 rounded-full bg-white/20 mr-3 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {testimonials[current].initials}
                    </span>
                  </div>
                  {testimonials[current].name}, {testimonials[current].role}
                </footer>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Form Section */}
        <div className={cn("p-8 md:p-10 md:col-span-3 flex flex-col justify-center", className)}>
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="mb-6 flex items-center">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                alt="Mizizzi"
                width={40}
                height={40}
                className="mr-2"
              />
              <span className="text-2xl font-bold text-gray-800">Mizizzi Store</span>
            </Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}