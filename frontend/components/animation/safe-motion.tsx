"use client"

import type React from "react"
import { forwardRef } from "react"
import { motion, type MotionProps } from "framer-motion"
import { safeColorForAnimation } from "@/lib/utils"

// Define the HTML elements we want to support
type SupportedHTMLElements =
  | "div"
  | "span"
  | "button"
  | "a"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "ul"
  | "ol"
  | "li"
  | "img"
  | "section"
  | "article"
  | "nav"
  | "header"
  | "footer"
  | "main"
  | "aside"
  | "form"
  | "input"
  | "textarea"
  | "select"
  | "option"
  | "label"
  | "table"
  | "tr"
  | "td"
  | "th"
  | "thead"
  | "tbody"
  | "tfoot"

// Type for the SafeMotion component
type SafeMotionComponent = {
  [K in SupportedHTMLElements]: React.ForwardRefExoticComponent<
    MotionProps & React.ComponentPropsWithoutRef<K> & React.RefAttributes<HTMLElement>
  >
}

// Helper function to process style properties and make them safe for animation
function processSafeStyles(props: any): any {
  const { style, animate, initial, whileHover, whileTap, whileFocus, whileDrag, exit, variants, ...rest } = props

  // Process style object if it exists
  const safeStyle = style ? processCSSProperties(style) : undefined

  // Process animation variants
  const safeAnimate = animate ? processAnimationVariant(animate) : undefined
  const safeInitial = initial ? processAnimationVariant(initial) : undefined
  const safeWhileHover = whileHover ? processAnimationVariant(whileHover) : undefined
  const safeWhileTap = whileTap ? processAnimationVariant(whileTap) : undefined
  const safeWhileFocus = whileFocus ? processAnimationVariant(whileFocus) : undefined
  const safeWhileDrag = whileDrag ? processAnimationVariant(whileDrag) : undefined
  const safeExit = exit ? processAnimationVariant(exit) : undefined
  const safeVariants = variants ? processVariants(variants) : undefined

  return {
    ...rest,
    style: safeStyle,
    animate: safeAnimate,
    initial: safeInitial,
    whileHover: safeWhileHover,
    whileTap: safeWhileTap,
    whileFocus: safeWhileFocus,
    whileDrag: safeWhileDrag,
    exit: safeExit,
    variants: safeVariants,
  }
}

// Process CSS properties to make them safe for animation
function processCSSProperties(style: Record<string, any>): Record<string, any> {
  const safeStyle: Record<string, any> = {}

  for (const key in style) {
    const value = style[key]

    // If this is a color property and it's a string
    if (
      typeof value === "string" &&
      (key.includes("color") ||
        key.includes("background") ||
        key === "fill" ||
        key === "stroke" ||
        key.includes("border") ||
        key.includes("shadow"))
    ) {
      safeStyle[key] = safeColorForAnimation(value)
    } else if (
      typeof value === "string" &&
      (value.includes("rgb") || value.includes("rgba") || value.includes("#")) &&
      (value.includes("none") || value.includes("repeat") || value.includes("scroll"))
    ) {
      // Handle complex background values that mix colors with other properties
      // Extract just the color part for animation
      const colorMatch = value.match(/(rgb$$[^)]+$$|rgba$$[^)]+$$|#[0-9a-f]{3,8})/i)
      if (colorMatch) {
        safeStyle[key] = colorMatch[0]
      } else {
        safeStyle[key] = value
      }
    } else {
      safeStyle[key] = value
    }
  }

  return safeStyle
}

// Process variants object
function processVariants(variants: Record<string, any>): Record<string, any> {
  const safeVariants: Record<string, any> = {}

  for (const key in variants) {
    safeVariants[key] = processAnimationVariant(variants[key])
  }

  return safeVariants
}

// Process animation variants to make them safe
function processAnimationVariant(variant: any): any {
  // Handle null or undefined
  if (variant === null || variant === undefined) {
    return variant
  }

  // Handle strings (could be color values)
  if (typeof variant === "string" && (variant.includes("rgb") || variant.includes("#") || variant.includes("hsl"))) {
    return safeColorForAnimation(variant)
  }

  // Handle objects (animation properties)
  if (typeof variant === "object" && !Array.isArray(variant)) {
    const safeVariant: Record<string, any> = {}

    for (const key in variant) {
      const value = variant[key]

      if (
        typeof value === "string" &&
        (key.includes("color") ||
          key.includes("background") ||
          key === "fill" ||
          key === "stroke" ||
          key.includes("border") ||
          key.includes("shadow"))
      ) {
        safeVariant[key] = safeColorForAnimation(value)
      } else if (
        typeof value === "string" &&
        (value.includes("rgb") || value.includes("rgba") || value.includes("#")) &&
        (value.includes("none") || value.includes("repeat") || value.includes("scroll"))
      ) {
        // Handle complex background values that mix colors with other properties
        const colorMatch = value.match(/(rgb$$[^)]+$$|rgba$$[^)]+$$|#[0-9a-f]{3,8})/i)
        if (colorMatch) {
          safeVariant[key] = colorMatch[0]
        } else {
          safeVariant[key] = value
        }
      } else if (typeof value === "object" && value !== null) {
        // Recursively process nested objects
        safeVariant[key] = processAnimationVariant(value)
      } else {
        safeVariant[key] = value
      }
    }

    return safeVariant
  } else if (Array.isArray(variant)) {
    // If it's an array of variants
    return variant.map((v) => processAnimationVariant(v))
  }

  // If it's not an object or array, return as is
  return variant
}

// Create a higher-order component that wraps motion components
function createSafeMotionComponent(Component: SupportedHTMLElements) {
  return forwardRef<HTMLElement, any>((props, ref) => {
    const safeProps = processSafeStyles(props)
    const MotionComponent = motion[Component] as React.ForwardRefExoticComponent<
      MotionProps & React.ComponentPropsWithoutRef<typeof Component> & React.RefAttributes<HTMLElement>
    >

    return <MotionComponent ref={ref} {...safeProps} />
  })
}

// Create the SafeMotion object with supported HTML elements
const SafeMotion = {} as SafeMotionComponent

// Manually add each supported element to avoid type issues
const supportedElements: SupportedHTMLElements[] = [
  "div",
  "span",
  "button",
  "a",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "img",
  "section",
  "article",
  "nav",
  "header",
  "footer",
  "main",
  "aside",
  "form",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "tfoot",
]

supportedElements.forEach((element) => {
  SafeMotion[element] = createSafeMotionComponent(element)
})

export default SafeMotion
