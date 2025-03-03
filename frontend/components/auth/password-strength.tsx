"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { checkPasswordStrength, getPasswordStrengthLabel, getPasswordStrengthColor } from "../../lib/validations/auth"

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0)
  const [label, setLabel] = useState("")
  const [color, setColor] = useState("")

  useEffect(() => {
    const pwdStrength = checkPasswordStrength(password)
    setStrength(pwdStrength)
    setLabel(getPasswordStrengthLabel(pwdStrength))
    setColor(getPasswordStrengthColor(pwdStrength))
  }, [password])

  return (
    <div className="space-y-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${(strength / 5) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Password Strength: <span className="font-medium">{label}</span>
      </p>
    </div>
  )
}
