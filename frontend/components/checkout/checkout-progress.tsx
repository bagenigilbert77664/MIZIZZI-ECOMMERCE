"use client"

import { useMemo } from "react"
import { Check } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { SafeMotionDiv } from "@/components/animation/safe-motion"

interface CheckoutProgressProps {
  activeStep: number
  steps: string[]
  variant?: "default" | "minimal" | "elegant"
  colorScheme?: "cherry" | "gold" | "gradient"
}

export function CheckoutProgress({
  activeStep,
  steps,
  variant = "default",
  colorScheme = "gradient",
}: CheckoutProgressProps) {
  // Ensure activeStep is a number between 1 and steps.length
  const safeActiveStep = Math.max(1, Math.min(activeStep, steps.length))

  // Memoize color classes to prevent recalculation on each render
  const colorClasses = useMemo(() => {
    switch (colorScheme) {
      case "cherry":
        return {
          active: "border-cherry-900 text-cherry-900",
          completed: "bg-cherry-900 text-white",
          completedGradient: "from-cherry-800 to-cherry-900",
          indicator: "bg-cherry-900",
          text: {
            active: "text-cherry-900",
            completed: "text-cherry-800",
          },
          line: {
            active: "from-cherry-700 to-cherry-900",
            completed: "from-cherry-900 to-cherry-700",
          },
        }
      case "gold":
        return {
          active: "border-amber-600 text-amber-800",
          completed: "bg-amber-600 text-white",
          completedGradient: "from-amber-600 to-amber-700",
          indicator: "bg-amber-600",
          text: {
            active: "text-amber-700",
            completed: "text-amber-600",
          },
          line: {
            active: "from-amber-500 to-amber-700",
            completed: "from-amber-700 to-amber-500",
          },
        }
      case "gradient":
      default:
        return {
          active: "border-red-600 text-red-900",
          completed: "from-red-600 via-red-700 to-red-800 text-white",
          completedGradient: "from-red-600 via-red-700 to-red-800",
          indicator: "from-red-600 to-red-800",
          text: {
            active: "text-red-700",
            completed: "text-red-800",
          },
          line: {
            active: "from-red-600 via-red-700 to-red-800",
            completed: "from-red-800 via-red-700 to-red-600",
          },
        }
    }
  }, [colorScheme])

  // Memoize variant styles
  const variantStyles = useMemo(() => {
    switch (variant) {
      case "minimal":
        return {
          step: "h-10 w-10",
          line: "h-[2px]",
          container: "max-w-2xl",
          text: "text-xs",
          indicator: "w-12 h-[2px]",
        }
      case "elegant":
        return {
          step: "h-16 w-16",
          line: "h-[3px]",
          container: "max-w-4xl",
          text: "text-sm tracking-wider",
          indicator: "w-24 h-[2px]",
        }
      case "default":
      default:
        return {
          step: "h-14 w-14",
          line: "h-[3px]",
          container: "max-w-3xl",
          text: "text-sm",
          indicator: "w-20 h-[2px]",
        }
    }
  }, [variant])

  return (
    <div className="mb-10 px-4 w-full">
      <div className={cn("flex items-center justify-between mx-auto", variantStyles.container)}>
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === safeActiveStep
          const isCompleted = stepNumber < safeActiveStep

          return (
            <div key={step} className="flex flex-1 flex-col items-center relative">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <SafeMotionDiv
                    className={cn(
                      variantStyles.line,
                      "w-full transition-all duration-700 ease-in-out",
                      isCompleted || (isActive && index === 1) || (safeActiveStep === 3 && index === 1)
                        ? `bg-gradient-to-r ${colorClasses.line.active}`
                        : "bg-gray-200",
                    )}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                      scaleX: 1,
                      opacity: 1,
                      backgroundColor:
                        isCompleted || (isActive && index === 1) || (safeActiveStep === 3 && index === 1)
                          ? undefined
                          : "#e5e7eb",
                    }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                )}

                <SafeMotionDiv
                  className={cn(
                    "flex items-center justify-center rounded-full text-sm font-medium transition-all duration-500",
                    variantStyles.step,
                    isActive
                      ? `border-2 ${colorClasses.active} bg-white shadow-[0_0_15px_rgba(220,38,38,0.4)]`
                      : isCompleted
                        ? `bg-gradient-to-r ${colorClasses.completed} shadow-lg`
                        : "border border-gray-300 bg-white text-gray-400",
                  )}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: index * 0.15,
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(220,38,38,0.5)",
                    transition: { duration: 0.2 },
                  }}
                >
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <SafeMotionDiv
                        key="completed"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{ duration: 0.4, type: "spring", stiffness: 260 }}
                      >
                        <Check className="h-6 w-6" />
                      </SafeMotionDiv>
                    ) : (
                      <SafeMotionDiv
                        key="number"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.3 }}
                        className="font-semibold text-base"
                      >
                        {stepNumber}
                      </SafeMotionDiv>
                    )}
                  </AnimatePresence>
                </SafeMotionDiv>

                {index < steps.length - 1 && (
                  <SafeMotionDiv
                    className={cn(
                      variantStyles.line,
                      "w-full transition-all duration-700 ease-in-out",
                      isCompleted || (safeActiveStep === 3 && index === 1)
                        ? `bg-gradient-to-r ${colorClasses.line.completed}`
                        : "bg-gray-200",
                    )}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                      scaleX: 1,
                      opacity: 1,
                      backgroundColor: isCompleted || (safeActiveStep === 3 && index === 1) ? undefined : "#e5e7eb",
                    }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.1 }}
                  />
                )}
              </div>

              <SafeMotionDiv
                className={cn(
                  "mt-4 font-medium uppercase transition-colors duration-300",
                  variantStyles.text,
                  isActive
                    ? `${colorClasses.text.active} font-semibold`
                    : isCompleted
                      ? colorClasses.text.completed
                      : "text-gray-500",
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.2 }}
              >
                {step}
              </SafeMotionDiv>

              {isActive && (
                <SafeMotionDiv
                  className={cn(
                    "absolute -bottom-1 left-1/2 transform -translate-x-1/2",
                    variantStyles.indicator,
                    colorScheme === "gradient" ? `bg-gradient-to-r ${colorClasses.indicator}` : colorClasses.indicator,
                  )}
                  layoutId="activeIndicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CheckoutProgress
