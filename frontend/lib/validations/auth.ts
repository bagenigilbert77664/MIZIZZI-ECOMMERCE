import * as z from "zod"

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Please enter your password" }),
  remember: z.boolean().default(false),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z
      .string()
      .min(10, { message: "Phone number must be at least 10 characters" })
      .regex(/^\+?[0-9]+$/, { message: "Please enter a valid phone number" })
      .optional(),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export function validatePasswordRequirements(password: string) {
  const requirements = [
    {
      requirement: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      requirement: "At least one uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      requirement: "At least one lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      requirement: "At least one number",
      met: /[0-9]/.test(password),
    },
    {
      requirement: "At least one special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ]

  const allMet = requirements.every((req) => req.met)

  return {
    requirements,
    allMet,
  }
}

