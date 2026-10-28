import { describe, expect, it } from "vitest"

import {
  changePasswordSchema,
  deleteAccountSchema,
  logInSchema,
  newPasswordSchema,
  resetPasswordSchema,
  signUpSchema,
  updateProfileSchema,
} from "./auth"

describe("signUpSchema", () => {
  const valid = {
    displayName: "  Ada  ",
    email: "  Ada@Example.COM ",
    password: "crabby123",
  }

  it("normalizes valid input", () => {
    expect(signUpSchema.parse(valid)).toEqual({
      displayName: "Ada",
      email: "ada@example.com",
      password: "crabby123",
    })
  })

  it("rejects an invalid email", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(
      false
    )
  })

  it("rejects an empty or overlong name", () => {
    expect(signUpSchema.safeParse({ ...valid, displayName: "   " }).success).toBe(false)
    expect(
      signUpSchema.safeParse({ ...valid, displayName: "a".repeat(81) }).success
    ).toBe(false)
  })
})

describe("newPasswordSchema", () => {
  it.each(["short1", "allletters", "12345678", "a1".repeat(37)])("rejects %j", (pw) => {
    expect(newPasswordSchema.safeParse(pw).success).toBe(false)
  })

  it("accepts 8+ chars with a letter and a number", () => {
    expect(newPasswordSchema.safeParse("crabby123").success).toBe(true)
  })
})

describe("logInSchema", () => {
  it("does not apply new-password rules to login", () => {
    expect(logInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true)
  })

  it("requires a password", () => {
    expect(logInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false)
  })
})

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "crabby123",
      confirmPassword: "crabby124",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"])
  })
})

describe("changePasswordSchema", () => {
  it("rejects reusing the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "crabby123",
      password: "crabby123",
      confirmPassword: "crabby123",
    })
    expect(result.success).toBe(false)
  })
})

describe("updateProfileSchema", () => {
  it("trims the display name", () => {
    expect(updateProfileSchema.parse({ displayName: " Bob " })).toEqual({
      displayName: "Bob",
    })
  })
})

describe("deleteAccountSchema", () => {
  it("requires the exact confirmation word", () => {
    expect(deleteAccountSchema.safeParse({ confirmation: "DELETE" }).success).toBe(true)
    expect(deleteAccountSchema.safeParse({ confirmation: "delete" }).success).toBe(false)
  })
})
