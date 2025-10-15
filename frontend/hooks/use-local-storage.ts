"use client"

import { useState, useEffect, useRef } from "react"

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const isInitialized = useRef(false)

  // Initialize the state
  useEffect(() => {
    if (isInitialized.current) return

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      if (item) {
        setStoredValue(JSON.parse(item))
      }
      isInitialized.current = true
    } catch (error) {
      console.error("Error reading from localStorage:", error)
      // If error, return initialValue
      setStoredValue(initialValue)
      isInitialized.current = true
    }
  }, [key, initialValue])

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      // Save state
      setStoredValue(valueToStore)
      // Save to local storage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error("Error writing to localStorage:", error)
    }
  }

  return [storedValue, setValue]
}

