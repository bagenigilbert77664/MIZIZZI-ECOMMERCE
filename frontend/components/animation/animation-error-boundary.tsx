"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * AnimationErrorBoundary catches errors in animations and prevents them from crashing the app
 * This is especially useful for Framer Motion animations that might fail due to complex color values
 */
class AnimationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error("Animation error caught by boundary:", error)
    console.error("Component stack:", errorInfo.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if the error is related to animation
      const isAnimationError =
        this.state.error?.message?.includes("animatable color") ||
        this.state.error?.message?.includes("animation") ||
        this.state.error?.message?.includes("motion") ||
        this.state.error?.stack?.includes("framer-motion")

      // If it's an animation error and we have a fallback, show it
      if (isAnimationError && this.props.fallback) {
        return this.props.fallback
      }

      // For animation errors without a fallback, render children without animation
      if (isAnimationError) {
        return this.props.children
      }

      // For other errors, show a generic error message
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">{this.state.error?.message || "An unknown error occurred"}</p>
        </div>
      )
    }

    return this.props.children
  }
}

export default AnimationErrorBoundary
