import { describe, expect, it } from "vitest"

import { authErrorMessage } from "./errors"

describe("authErrorMessage", () => {
  it("maps known codes to friendly messages", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe(
      "Incorrect email or password."
    )
  })

  it("treats HTTP 429 as rate limiting", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/)
  })

  it("never leaks unknown error details", () => {
    expect(authErrorMessage({ code: "unexpected_failure: db at 10.0.0.3" })).toBe(
      "Something went wrong. Please try again."
    )
    expect(authErrorMessage(null)).toBe("Something went wrong. Please try again.")
  })
})
