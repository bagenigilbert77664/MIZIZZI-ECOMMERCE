import * as z from "zod"

// Password requirements based on backend's simplified validation
// Backend: min 8 chars, at least one number
const passwordRequirements = {
  minLength: 8,
  requireNumbers: true,
}

// Password validation regex patterns
const passwordRegex = {
  hasNumber: /[0-9]/,
}

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Update the Kenyan phone number validation regex to support both 07 and 01 formats
// Supports formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
const kenyaPhoneRegex = /^(?:\+254|254|0)[17]\d{8}$/

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

// Update the register schema to match backend validation (min 8 chars, at least one number)
export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
    email: z.string().email("Please enter a valid email address").optional().or(z.literal("")), // Email is optional if phone is provided
    phone: z
      .string()
      .min(1, "Phone number is required")
      .refine((phone) => kenyaPhoneRegex.test(phone), {
        message: "Please enter a valid Kenyan phone number",
      })
      .optional()
      .or(z.literal("")), // Phone is optional if email is provided
    password: z
      .string()
      .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters`)
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
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"], // Can point to either, or a general path
  })

export const identifierSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" })
      .refine((email) => emailRegex.test(email), {
        message: "Please enter a valid email address",
      })
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .refine((phone) => kenyaPhoneRegex.test(phone), {
        message: "Please enter a valid Kenyan phone number",
      })
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"], // Can point to either, or a general path
  })

// Update the password schema to match backend validation (min 8 chars, at least one number)
export const passwordSchema = z.object({
  password: z
    .string()
    .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters`)
    .max(100, { message: "Password must be less than 100 characters" })
    .refine((password) => passwordRegex.hasNumber.test(password), {
      message: "Password must contain at least one number",
    }),
})

// Update password strength checker to match simplified requirements
export function checkPasswordStrength(password: string): number {
  let strength = 0

  // Length check
  if (password.length >= passwordRequirements.minLength) strength += 1

  // Number check
  if (passwordRegex.hasNumber.test(password)) strength += 1

  return strength
}

// Update password strength label
export function getPasswordStrengthLabel(strength: number): string {
  if (strength === 0) return "Very Weak"
  if (strength === 1) return "Weak"
  if (strength >= 2) return "Good" // "Good" for meeting both backend requirements
  return "Very Weak"
}

// Get password strength color
export function getPasswordStrengthColor(strength: number): string {
  switch (strength) {
    case 0:
      return "bg-red-500"
    case 1:
      return "bg-orange-500"
    case 2:
      return "bg-green-500"
    default:
      return "bg-red-500"
  }
}

// Update password requirements validation to match backend (min 8 chars, at least one number)
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
      requirement: "Contains at least one number",
      met: passwordRegex.hasNumber.test(password),
    },
  ]

  return {
    valid: requirements.every((r) => r.met),
    requirements,
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
  } else if (digits.startsWith("7") || digits.startsWith("1")) {
    // Assume it's a 9-digit number without the leading 0
    if (digits.length === 9) {
      return `+254${digits}`
    }
  }

  // Return original if no pattern matches
  return phone
}
