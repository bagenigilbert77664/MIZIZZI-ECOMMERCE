"use client"

import { useState, useEffect, useRef } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"

export function useSoundEffects() {
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>("cartSoundEnabled", true)
  const [soundFile, setSoundFile] = useLocalStorage<string>("cartSoundFile", "/cart-success.mp3")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Only create audio element on client side
    if (typeof window !== "undefined") {
      // Create a new audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio(soundFile)
      } else {
        // Update the source if the audio element already exists
        audioRef.current.src = soundFile
      }

      // Set up event listeners
      const handleCanPlayThrough = () => setIsReady(true)
      audioRef.current.addEventListener("canplaythrough", handleCanPlayThrough)

      // Preload the audio
      audioRef.current.load()

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener("canplaythrough", handleCanPlayThrough)
        }
      }
    }
  }, [soundFile])

  const playSound = () => {
    if (!soundEnabled || !audioRef.current) return false

    try {
      // Reset the audio to the beginning
      audioRef.current.currentTime = 0
      audioRef.current.volume = 0.5

      // Create a promise to play the sound
      const playPromise = audioRef.current.play()

      // Handle potential play() promise rejection (happens in some browsers)
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Audio playback was prevented:", error)
        })
      }

      return true
    } catch (error) {
      console.error("Failed to play sound:", error)
      return false
    }
  }

  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)

    // Immediately update localStorage for instant persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("cartSoundEnabled", JSON.stringify(newValue))
    }

    // Play a test sound if enabling
    if (newValue && audioRef.current) {
      try {
        // Play at very low volume as feedback
        const originalVolume = audioRef.current.volume
        audioRef.current.volume = 0.1
        audioRef.current.currentTime = 0
        audioRef.current.play().catch((err) => console.warn("Could not play test sound:", err))

        // Restore original volume after playing
        setTimeout(() => {
          if (audioRef.current) audioRef.current.volume = originalVolume
        }, 300)
      } catch (e) {
        console.warn("Could not play test sound:", e)
      }
    }

    return newValue
  }

  const changeSound = (newSoundFile: string) => {
    setSoundFile(newSoundFile)

    // Update the audio element with the new sound
    if (audioRef.current) {
      audioRef.current.src = newSoundFile
      audioRef.current.load()
    }
  }

  const testSound = () => {
    return playSound()
  }

  return {
    soundEnabled,
    soundFile,
    toggleSound,
    changeSound,
    playSound,
    testSound,
  }
}
