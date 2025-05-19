"use client"

import type React from "react"
import { forwardRef } from "react"
import { motion, type MotionProps } from "framer-motion"
import { useReducedMotion } from "framer-motion"

// Define proper types that extend MotionProps
type SafeMotionDivProps = MotionProps & React.HTMLAttributes<HTMLDivElement>

// Create a properly typed motion component
export const SafeMotionDiv = forwardRef<HTMLDivElement, SafeMotionDivProps>((props, ref) => {
  const prefersReducedMotion = useReducedMotion()

  // If user prefers reduced motion, remove animations
  if (prefersReducedMotion) {
    // Extract animation props we want to disable
    const { animate, transition, initial, whileHover, whileTap, whileFocus, whileInView, ...rest } = props

    // Return a regular div without animations
    return <div ref={ref} {...rest} />
  }

  // Otherwise, return a properly typed motion.div
  return <motion.div ref={ref} {...props} />
})

SafeMotionDiv.displayName = "SafeMotionDiv"

export default SafeMotionDiv
