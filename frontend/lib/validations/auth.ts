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

// Kenyan phone number validation
// Supports formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
const kenyaPhoneRegex = /^(?:\+254|254|0)[17][0-9]{8}$/

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine((email) => emailRegex.test(email), {
      message: "Please enter a valid email address",
    }),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(false),
})

// Registration schema with Kenyan validation
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters" })
      .max(50, { message: "Name must be less than 50 characters" })
      .refine((name) => /^[a-zA-Z\s'-]+$/.test(name), {
        message: "Name should only contain letters, spaces, hyphens, and apostrophes",
      }),
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" })
      .refine((email) => emailRegex.test(email), {
        message: "Please enter a valid email address",
      }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(100, { message: "Password must be less than 100 characters" })
      .regex(passwordRegex.hasUpperCase, "Password must contain at least one uppercase letter")
      .regex(passwordRegex.hasLowerCase, "Password must contain at least one lowercase letter")
      .regex(passwordRegex.hasNumber, "Password must contain at least one number")
      .regex(passwordRegex.hasSpecialChar, "Password must contain at least one special character"),
    confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
    phone: z
      .string()
      .min(1, { message: "Phone number is required" })
      .refine((phone) => kenyaPhoneRegex.test(phone), {
        message: "Please enter a valid Kenyan phone number (e.g., +254712345678 or 0712345678)",
      }),
    terms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and conditions" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const identifierSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" })
    .refine((email) => emailRegex.test(email), {
      message: "Please enter a valid email address",
    }),
})

export const passwordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password must be less than 100 characters" }),
})

// Types
export type IdentifierFormValues = z.infer<typeof identifierSchema>
export type PasswordFormValues = z.infer<typeof passwordSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type LoginFormValues = z.infer<typeof loginSchema>

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

// Format Kenyan phone number to international format
export function formatKenyanPhoneNumber(phone: string): string {
  if (!phone) return phone

  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, "")

  // Handle different formats
  if (digits.startsWith("254")) {
    return `+${digits}`
  } else if (digits.startsWith("0")) {
    return `+254${digits.substring(1)}`
  } else if (digits.length === 9) {
    // Assume it's a 9-digit number without the leading 0
    return `+254${digits}`
  }

  // Return original if no pattern matches
  return phone
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

