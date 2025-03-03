import * as z from "zod"

const passwordRegex = {
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[^A-Za-z0-9]/,
  validLength: /.{8,}/,
}

// Helper function to validate email domain
const validateEmailDomain = (email: string) => {
  const domain = email.split("@")[1]
  // Basic check for domain format and common TLDs
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(domain)
}

// Helper function to validate phone number format
const validatePhoneNumber = (phone: string) => {
  // Allow +, spaces, and numbers
  if (!/^\+?[\d\s-]{8,}$/.test(phone)) return false
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, "")
  // Check if the number of digits is reasonable (between 8 and 15)
  return digitsOnly.length >= 8 && digitsOnly.length <= 15
}

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" })
    .refine(validateEmailDomain, { message: "Please enter a valid email domain" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
  remember: z.boolean().default(false),
})

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters" })
      .max(50, { message: "Name must be less than 50 characters" })
      .regex(/^[a-zA-Z\s]*$/, { message: "Name can only contain letters and spaces" })
      .refine((val) => val.trim().includes(" "), {
        message: "Please enter your full name (first & last name)",
      })
      .transform((val) => {
        // Capitalize each word
        return val
          .trim()
          .toLowerCase()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      }),
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" })
      .refine(validateEmailDomain, { message: "Please enter a valid email domain" })
      .transform((val) => val.toLowerCase()),
    phone: z.string().min(1, { message: "Phone number is required" }).refine(validatePhoneNumber, {
      message: "Please enter a valid phone number",
    }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(passwordRegex.hasUpperCase, { message: "Password must contain at least one uppercase letter" })
      .regex(passwordRegex.hasLowerCase, { message: "Password must contain at least one lowercase letter" })
      .regex(passwordRegex.hasNumber, { message: "Password must contain at least one number" })
      .regex(passwordRegex.hasSpecialChar, { message: "Password must contain at least one special character" }),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>

// Password strength checker
export const checkPasswordStrength = (password: string): number => {
  let strength = 0
  if (password.length >= 8) strength++
  if (passwordRegex.hasUpperCase.test(password)) strength++
  if (passwordRegex.hasLowerCase.test(password)) strength++
  if (passwordRegex.hasNumber.test(password)) strength++
  if (passwordRegex.hasSpecialChar.test(password)) strength++
  return strength
}

// Get password strength label
export const getPasswordStrengthLabel = (strength: number): string => {
  switch (strength) {
    case 0:
    case 1:
      return "Very Weak"
    case 2:
      return "Weak"
    case 3:
      return "Medium"
    case 4:
      return "Strong"
    case 5:
      return "Very Strong"
    default:
      return "Very Weak"
  }
}

// Get password strength color
export const getPasswordStrengthColor = (strength: number): string => {
  switch (strength) {
    case 0:
    case 1:
      return "bg-red-500"
    case 2:
      return "bg-orange-500"
    case 3:
      return "bg-yellow-500"
    case 4:
      return "bg-green-500"
    case 5:
      return "bg-emerald-500"
    default:
      return "bg-red-500"
  }
}
