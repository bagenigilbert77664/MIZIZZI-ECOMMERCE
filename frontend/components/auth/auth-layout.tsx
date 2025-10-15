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
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex justify-center items-start min-h-screen px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 pt-16">
      {/* Adjusted container size for a more compact, Apple-like aesthetic */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.92, rotateX: -5 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{
          duration: 1.2,
          ease: [0.22, 1, 0.36, 1],
          type: "spring",
          damping: 20,
          stiffness: 100,
        }}
        className="w-full max-w-[900px] grid grid-cols-1 md:grid-cols-5 rounded-2xl shadow-xl overflow-hidden border border-gray-200/50 bg-white/95 backdrop-blur-2xl"
      >
        {/* Left / Image + Testimonial Section */}
        <motion.div
          className="relative hidden md:flex md:col-span-2 bg-gray-100"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Image
            src="/ten.jpg"
            alt="Authentication"
            width={600}
            height={600}
            className="h-full w-full object-cover"
            priority
          />

          {/* Overlay Testimonials with compact padding */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 flex flex-col justify-end p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className="bg-black/50 backdrop-blur-xl p-4 md:p-6 rounded-xl border border-white/30 shadow-lg"
              >
                <blockquote className="text-base sm:text-lg md:text-xl font-medium text-white leading-relaxed tracking-wide">
                  “{testimonials[current].quote}”
                </blockquote>
                <footer className="mt-3 flex items-center text-xs md:text-sm text-gray-100">
                  <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center mr-2 shadow-md">
                    <span className="text-white text-xs md:text-sm font-semibold">
                      {testimonials[current].initials}
                    </span>
                  </div>
                  <span className="font-semibold">{testimonials[current].name}</span>,{" "}
                  <span className="opacity-80">{testimonials[current].role}</span>
                </footer>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right / Form Section with tighter padding */}
        <div className={cn(
          "p-6 sm:p-8 md:col-span-3 flex flex-col justify-center bg-white/95 backdrop-blur-lg",
          className
        )}>
          <div className="mx-auto w-full max-w-sm">
            {/* Logo with compact size */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.0, delay: 0.3, type: "spring", stiffness: 120, damping: 15 }}
              className="mb-6 flex items-center justify-center md:justify-start"
            >
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                  alt="Mizizzi"
                  width={40}
                  height={40}
                  className="rounded-lg shadow-md"
                />
                <span className="text-xl md:text-2xl font-bold text-gray-900 tracking-tighter">
                  Mizizzi Store
                </span>
              </Link>
            </motion.div>

            {/* Form fields */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}