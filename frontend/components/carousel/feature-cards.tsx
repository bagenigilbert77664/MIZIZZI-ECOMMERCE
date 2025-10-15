"use client"

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { featureCards } from "@/constants/carousel"

export const FeatureCards = React.memo(() => {
  return (
    <div className="grid grid-cols-2 gap-3 flex-1">
      {featureCards.map((card, index) => {
        const IconComponent = card.icon

        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.08,
              duration: 0.3,
              ease: "easeOut",
            }}
          >
            <Link
              href={card.href}
              className="feature-card block h-24 p-3 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-cherry-300 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center h-full gap-1.5">
                {/* Icon */}
                <motion.div
                  className={`${card.iconBg} p-1.5 rounded-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm group-hover:bg-cherry-100`}
                  whileHover={{ rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <IconComponent
                    className={`h-3.5 w-3.5 ${card.iconColor} transition-colors duration-300 group-hover:text-cherry-700`}
                  />
                </motion.div>

                {/* Text */}
                <div className="space-y-0.5">
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide leading-tight transition-colors duration-300 group-hover:text-cherry-800">
                    {card.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-tight line-clamp-1 transition-colors duration-300 group-hover:text-cherry-700">
                    {card.description}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
})

FeatureCards.displayName = "FeatureCards"
