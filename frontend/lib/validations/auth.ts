import * as z from "zod"

// Password requirements
const passwordRequirements = {
  minLength: 8,
  maxLength: 72, // bcrypt max length
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}

// Password validation regex patterns
const passwordRegex = {
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[^A-Za-z0-9]/,
}

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Phone number validation regex (international format)
const phoneRegex = /^\+(?:[0-9] ?){6,14}[0-9]$/

// Login schema
export const loginSchema = z.object({
  identifier: z.string().optional(),
  password: z.string().optional(),
  remember: z.boolean().optional().default(false),
})

// Registration schema
export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 characters")
      .regex(/^\+?[0-9\s-()]+$/, "Please enter a valid phone number")
      .optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

// Types
export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>

// Password strength checker
export function checkPasswordStrength(password: string): number {
  let strength = 0

  // Length check
  if (password.length >= passwordRequirements.minLength) strength++

  // Character type checks
  if (passwordRegex.hasUpperCase.test(password)) strength++
  if (passwordRegex.hasLowerCase.test(password)) strength++
  if (passwordRegex.hasNumber.test(password)) strength++
  if (passwordRegex.hasSpecialChar.test(password)) strength++

  return strength
}

// Get password strength label
export function getPasswordStrengthLabel(strength: number): string {
  switch (strength) {
    case 0:
      return "Very Weak"
    case 1:
      return "Weak"
    case 2:
      return "Fair"
    case 3:
      return "Good"
    case 4:
      return "Strong"
    case 5:
      return "Very Strong"
    default:
      return "Very Weak"
  }
}

// Get password strength color
export function getPasswordStrengthColor(strength: number): string {
  switch (strength) {
    case 0:
      return "bg-red-500"
    case 1:
      return "bg-orange-500"
    case 2:
      return "bg-yellow-500"
    case 3:
      return "bg-lime-500"
    case 4:
      return "bg-green-500"
    case 5:
      return "bg-emerald-500"
    default:
      return "bg-red-500"
  }
}

// Validate password requirements
export function validatePasswordRequirements(password: string): {
  valid: boolean
  requirements: { requirement: string; met: boolean }[]
} {
  const requirements = [
    {
      requirement: `At least ${passwordRequirements.minLength} characters long`,
      met: password.length >= passwordRequirements.minLength,
    },
    {
      requirement: "Contains at least one uppercase letter",
      met: passwordRegex.hasUpperCase.test(password),
    },
    {
      requirement: "Contains at least one lowercase letter",
      met: passwordRegex.hasLowerCase.test(password),
    },
    {
      requirement: "Contains at least one number",
      met: passwordRegex.hasNumber.test(password),
    },
    {
      requirement: "Contains at least one special character",
      met: passwordRegex.hasSpecialChar.test(password),
    },
  ]

  return {
    valid: requirements.every((r) => r.met),
    requirements,
  }
}

