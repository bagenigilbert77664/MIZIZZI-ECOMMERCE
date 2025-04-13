"use client"

import { useAuth } from "@/contexts/auth/auth-context"
import { PageTransition } from "./page-transition"

export function PageTransitionWrapper() {
  const { showPageTransition, handlePageTransitionComplete } = useAuth()

  return <PageTransition isVisible={showPageTransition} onComplete={handlePageTransitionComplete} duration={4000} />
}
