"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { Text, Environment, Float } from "@react-three/drei"
import { motion, AnimatePresence } from "framer-motion"

interface WelcomeScreenProps {
  username: string
  onComplete: () => void
}

function Scene({ username }: { username: string }) {
  return (
    <>
      <Environment preset="city" />
      <Float speed={4} rotationIntensity={1} floatIntensity={2} position={[0, 0, 0]}>
        <Text
          font="/fonts/Geist_Bold.json"
          fontSize={0.5}
          position={[0, 0, 0]}
          color="#E11D48"
          anchorX="center"
          anchorY="middle"
        >
          {`Welcome, ${username}!`}
        </Text>
      </Float>
    </>
  )
}

export function WelcomeScreen({ username, onComplete }: WelcomeScreenProps) {
  const [show, setShow] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setShow(false)
      setTimeout(onComplete, 500) // Wait for exit animation
    }, 3000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-r from-cherry-950 to-cherry-900"
        >
          <div className="h-screen w-full">
            <Canvas camera={{ position: [0, 0, 5] }}>
              <Scene username={username} />
            </Canvas>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

