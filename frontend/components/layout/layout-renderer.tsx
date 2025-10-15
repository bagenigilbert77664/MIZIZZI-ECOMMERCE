"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { TopBar } from "@/components/layout/top-bar"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { motion, AnimatePresence } from "framer-motion"
import ScrollToTop from "@/components/shared/scroll-to-top"

export function LayoutRenderer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith("/admin")

  // Don't render standard layout components for admin routes
  if (isAdminRoute) {
    return children
  }

  return (
    <>
      <TopBar />
      <Header />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          className="min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
       <ScrollToTop />
      <Footer />
    </>
  )
}