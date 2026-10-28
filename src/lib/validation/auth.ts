import { z } from "zod"

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Email address is too long.")
  .pipe(z.email("Enter a valid email address."))
  .transform((value) => value.toLowerCase())

/** New passwords: 8–72 chars (bcrypt limit), at least one letter and one number. */
export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.")

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(80, "Use at most 80 characters.")

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email,
  password: newPasswordSchema,
})

export const logInSchema = z.object({
  email,
  // Never apply new-password rules on login; just bound the input.
  password: z.string().min(1, "Enter your password.").max(256, "Password is too long."),
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(256),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: "Choose a password different from your current one.",
    path: ["password"],
  })

export const updateProfileSchema = z.object({ displayName: displayNameSchema })

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", { error: 'Type "DELETE" to confirm.' }),
})
