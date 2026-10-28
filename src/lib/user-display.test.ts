import { describe, expect, it } from "vitest"

import { displayNameOrEmail, initials } from "./user-display"

describe("initials", () => {
  it("uses first and last name initials", () => {
    expect(initials("Ada Byron Lovelace", "a@x.io")).toBe("AL")
  })
  it("uses the first two letters of a single name", () => {
    expect(initials("ada", "a@x.io")).toBe("AD")
  })
  it("falls back to the email local part", () => {
    expect(initials(null, "zed@x.io")).toBe("ZE")
    expect(initials("   ", "zed@x.io")).toBe("ZE")
  })
})

describe("displayNameOrEmail", () => {
  it("prefers the display name", () => {
    expect(displayNameOrEmail(" Ada ", "a@x.io")).toBe("Ada")
  })
  it("falls back to the email local part", () => {
    expect(displayNameOrEmail(null, "ada@x.io")).toBe("ada")
  })
})
