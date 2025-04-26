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
  hasNumber: /[0-9]/,
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

// Update the register schema to match backend validation
export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .refine((phone) => kenyaPhoneRegex.test(phone), {
        message: "Please enter a valid Kenyan phone number",
      }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((password) => passwordRegex.hasNumber.test(password), {
        message: "Password must contain at least one number",
      }),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions",
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

// Update the password schema to match backend validation
export const passwordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password must be less than 100 characters" })
    .refine((password) => passwordRegex.hasNumber.test(password), {
      message: "Password must contain at least one number",
    }),
})

// Update password strength checker to match simplified requirements
export function checkPasswordStrength(password: string): number {
  let strength = 0

  // Length check
  if (password.length >= 8) strength += 2

  // Number check
  if (passwordRegex.hasNumber.test(password)) strength += 3

  return strength
}

// Update password strength label
export function getPasswordStrengthLabel(strength: number): string {
  if (strength <= 0) return "Very Weak"
  if (strength <= 2) return "Weak"
  if (strength <= 3) return "Fair"
  if (strength <= 4) return "Good"
  return "Strong"
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

// Update password requirements validation to match backend
export function validatePasswordRequirements(password: string): {
  valid: boolean
  requirements: { requirement: string; met: boolean }[]
} {
  const requirements = [
    {
      requirement: "At least 8 characters long",
      met: password.length >= 8,
    },
    {
      requirement: "Contains at least one number",
      met: passwordRegex.hasNumber.test(password),
    },
  ]

  return {
    valid: requirements.every((r) => r.met),
    requirements,
  }
}
