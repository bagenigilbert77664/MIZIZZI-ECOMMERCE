"use client"

import { cn } from "@/lib/utils"

interface AppleSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function AppleSpinner({ className, size = "md" }: AppleSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0">
        <div className="apple-spinner">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="apple-spinner-dot"
              style={{
                transform: `rotate(${i * 30}deg) translate(0, -140%)`,
                animationDelay: `${i * 0.083}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        .apple-spinner {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .apple-spinner-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8%;
          height: 25%;
          background: currentColor;
          border-radius: 50px;
          transform-origin: 0 0;
          opacity: 0.3;
          animation: apple-spinner-fade 1s linear infinite;
        }

        @keyframes apple-spinner-fade {
          0% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
