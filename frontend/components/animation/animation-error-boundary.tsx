import type React from "react"
import { Component, type ErrorInfo } from "react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

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
    console.error("Animation error caught by boundary:", error, errorInfo)

    // Check if this is a known animation error
    if (error.message.includes("not an animatable color") || error.message.includes("Cannot animate between")) {
      console.info("Caught a known animation error. Rendering fallback UI.")
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        this.props.fallback || (
          <div className="p-4">
            <p className="text-sm text-gray-500">
              An animation error occurred. The content is still functional but animations may be disabled.
            </p>
            {this.props.children}
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default AnimationErrorBoundary
