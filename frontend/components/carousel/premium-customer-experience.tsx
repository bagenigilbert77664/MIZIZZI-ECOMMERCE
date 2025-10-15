"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Award, Timer, TrendingUp, Users } from "lucide-react"

const experiences = [
  {
    title: "MIZIZZI EXCELLENCE",
    metric: "98.7%",
    description: "Customer Satisfaction Rate",
    icon: Award,
    image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1200&q=80",
    gradient: "from-amber-500 to-yellow-600",
    bgColor: "bg-gradient-to-br from-amber-50 to-yellow-50",
    textColor: "text-amber-900",
    accentColor: "text-amber-600",
    features: ["Premium Service", "Quality Guarantee", "Expert Curation", "Authentic Products"],
  },
  {
    title: "KENYA DELIVERY",
    metric: "24H",
    description: "Average Delivery Time",
    icon: Timer,
    image: "https://media.istockphoto.com/id/1073908632/photo/womens-fashion-for-christmas-eve.webp?a=1&s=612x612&w=0&k=20&c=_5Wa7RciLm_QvpatMkAr5xMRr7BPNwGYVZMApdTJYyc=",
    gradient: "from-emerald-500 to-green-600",
    bgColor: "bg-gradient-to-br from-emerald-50 to-green-50",
    textColor: "text-emerald-900",
    accentColor: "text-emerald-600",
    features: ["Nairobi Same Day", "Nationwide Express", "Secure Packaging", "Live Tracking"],
  },
  {
    title: "CUSTOMER SAVINGS",
    metric: "KSh 156K",
    description: "Total Savings This Month",
    icon: TrendingUp,
    image: "https://media.istockphoto.com/id/1441553933/photo/3d-illustration.jpg?b=1&s=612x612&w=0&k=20&c=hIc6hAb3XggxvuPdo6adGjN28fJDHrLl_hNnUmwO72s=",
    gradient: "from-rose-500 to-red-600",
    bgColor: "bg-gradient-to-br from-rose-50 to-red-50",
    textColor: "text-rose-900",
    accentColor: "text-rose-600",
    features: ["Best Prices", "Flash Deals", "Bulk Discounts", "Loyalty Rewards"],
  },
  {
    title: "MIZIZZI FAMILY",
    metric: "12.8K",
    description: "Happy Customers & Growing",
    icon: Users,
    image: "https://media.istockphoto.com/id/1441553933/photo/3d-illustration.jpg?b=1&s=612x612&w=0&k=20&c=hIc6hAb3XggxvuPdo6adGjN28fJDHrLl_hNnUmwO72s=",
    gradient: "from-purple-500 to-indigo-600",
    bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50",
    textColor: "text-purple-900",
    accentColor: "text-purple-600",
    features: ["Community Driven", "Cultural Pride", "Local Support", "African Heritage"],
  },
]

export const PremiumCustomerExperience = React.memo(() => {
  const [currentExperience, setCurrentExperience] = useState(0)
  const [nextExperience, setNextExperience] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)

      setTimeout(() => {
        setCurrentExperience((prev) => (prev + 1) % experiences.length)
        setNextExperience((prev) => (prev + 1) % experiences.length)
        setIsTransitioning(false)
      }, 2000) // Transition duration
    }, 10000) // Stay for 10 seconds

    return () => clearInterval(interval)
  }, [])

  const experience = experiences[currentExperience]
  const IconComponent = experience.icon

  return (
    <section
      className="h-full w-full max-w-md md:max-w-lg mx-auto rounded-2xl overflow-hidden shadow-lg bg-white/80 backdrop-blur-md border border-gray-100 relative"
      aria-label="Premium customer experience"
    >
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        {experiences.map((exp, index) => (
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{
              opacity: index === currentExperience ? 1 : 0,
              scale: index === currentExperience ? 1 : 1.05,
            }}
            transition={{
              duration: 4,
              ease: [0.16, 1, 0.3, 1], // Luxury easing curve
            }}
          >
            <img
              src={exp.image || "/placeholder.svg"}
              alt={exp.title}
              className="w-full h-full object-cover object-center"
              style={{ filter: "brightness(1.1) contrast(1.15) saturate(1.1)" }}
            />
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/40 to-black/50"
              animate={{
                background: [
                  "linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.5) 100%)",
                  "linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.55) 100%)",
                  "linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.5) 100%)",
                ],
              }}
              transition={{
                duration: 8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentExperience}
            initial={{
              opacity: 0,
              y: 30,
              filter: "blur(10px)",
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -30,
              filter: "blur(10px)",
              scale: 1.05,
            }}
            transition={{
              duration: 2.5,
              ease: [0.16, 1, 0.3, 1], // Luxury cubic-bezier
              staggerChildren: 0.1,
            }}
            className="h-full p-5 md:p-7 flex flex-col justify-between"
          >
            {/* Floating Particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${experience.gradient} opacity-30`}
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${10 + i * 12}%`,
                  }}
                  animate={{
                    y: [-10, 10, -10],
                    x: [-5, 5, -5],
                    opacity: [0.2, 0.6, 0.2],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 4 + i * 0.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>

            {/* Header */}
            <motion.div
              className="flex items-center gap-3 mb-4"
              variants={{
                hidden: { opacity: 0, x: -40, filter: "blur(5px)" },
                visible: { opacity: 1, x: 0, filter: "blur(0px)" },
              }}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className={`p-3 rounded-xl bg-gradient-to-br ${experience.gradient} shadow-xl backdrop-blur-sm`}
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0],
                  boxShadow: [
                    "0 10px 25px rgba(0,0,0,0.1)",
                    "0 15px 35px rgba(0,0,0,0.15)",
                    "0 10px 25px rgba(0,0,0,0.1)",
                  ],
                }}
                transition={{
                  duration: 6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <IconComponent className="h-6 w-6 text-white drop-shadow-lg" />
              </motion.div>
              <motion.div
                animate={{
                  y: [0, -2, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <h3 className="text-sm md:text-base font-extrabold font-serif text-white uppercase tracking-wider drop-shadow-lg">
                  {experience.title}
                </h3>
              </motion.div>
            </motion.div>

            {/* Metric */}
            <motion.div
              className="mb-3"
              variants={{
                hidden: { opacity: 0, scale: 0.8, y: 20, filter: "blur(5px)" },
                visible: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
              }}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.6, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="text-2xl md:text-3xl font-black font-serif text-white mb-1 drop-shadow-xl"
                animate={{
                  textShadow: [
                    "0 2px 10px rgba(0,0,0,0.3)",
                    "0 4px 20px rgba(0,0,0,0.4)",
                    "0 2px 10px rgba(0,0,0,0.3)",
                  ],
                }}
                transition={{
                  duration: 5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                {experience.metric}
              </motion.div>
              <motion.p
                className="text-xs md:text-sm text-white opacity-95 font-medium font-serif drop-shadow-md"
                animate={{
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                {experience.description}
              </motion.p>
            </motion.div>

            {/* Features */}
            <motion.div
              className="relative"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.9, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="space-y-2 mt-2">
                {(typeof window !== "undefined" && window.innerWidth >= 768
                  ? experience.features
                  : experience.features.slice(0, 3)
                ).map((feature, index) => (
                  <motion.div
                    key={feature}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20, filter: "blur(3px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    transition={{
                      delay: 1.2 + index * 0.15,
                      duration: 1.2,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <motion.div
                      className={`w-2 h-2 rounded-full bg-gradient-to-r ${experience.gradient} shadow-lg`}
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.8, 1, 0.8],
                        boxShadow: [
                          "0 0 5px rgba(255,255,255,0.3)",
                          "0 0 15px rgba(255,255,255,0.5)",
                          "0 0 5px rgba(255,255,255,0.3)",
                        ],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: index * 0.4,
                      }}
                    />
                    <motion.span
                      className="text-xs md:text-sm text-white opacity-95 font-semibold font-serif drop-shadow-md"
                      animate={{
                        y: [0, -1, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: index * 0.2,
                      }}
                    >
                      {feature}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Luxury Accent */}
            <motion.div
              className={`absolute top-4 right-4 w-4 h-4 rounded-full bg-gradient-to-r ${experience.gradient} opacity-60`}
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.4, 0.8, 0.4],
                rotate: [0, 180, 360],
                filter: ["blur(1px)", "blur(3px)", "blur(1px)"],
              }}
              transition={{
                duration: 8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subtle Progress Indicator */}
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
        {experiences.map((_, index) => (
          <motion.div
            key={index}
            className={`h-0.5 rounded-full transition-all duration-1000 ${
              index === currentExperience ? `w-8 bg-gradient-to-r ${experience.gradient}` : "w-2 bg-white/30"
            }`}
            animate={{
              opacity: index === currentExperience ? 1 : 0.5,
            }}
            transition={{ duration: 1 }}
          />
        ))}
      </div>
    </section>
  )
})

PremiumCustomerExperience.displayName = "PremiumCustomerExperience"
