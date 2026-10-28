import { afterEach, describe, expect, it, vi } from "vitest"

import { DataAccessError, isSchemaError } from "./errors"

afterEach(() => vi.restoreAllMocks())

describe("DataAccessError", () => {
  it("identifies a missing table as a schema/migration problem", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new DataAccessError("load profile", {
      code: "PGRST205",
      message: "Could not find the table 'public.profiles' in the schema cache",
    })
    expect(error.name).toBe("DatabaseSchemaError")
    expect(error.code).toBe("PGRST205")
    expect(error.message).toContain("database schema is missing")
    expect(error.message).toContain("supabase/migrations")
  })

  it("keeps other failures generic", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new DataAccessError("load profile", {
      code: "08006",
      message: "conn reset",
    })
    expect(error.name).toBe("DataAccessError")
    expect(error.message).toBe("Data access failed: load profile")
  })

  it("always logs the failure code server-side (never swallowed)", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    new DataAccessError("x", { code: "42P01", message: "relation does not exist" })
    expect(log).toHaveBeenCalledWith("[dal] x failed", {
      code: "42P01",
      message: "relation does not exist",
    })
  })

  it.each(["PGRST205", "PGRST204", "PGRST202", "42P01", "42703", "42883"])(
    "classifies %s as a schema error",
    (code) => expect(isSchemaError({ code })).toBe(true)
  )

  it("does not classify RLS denials as schema errors", () => {
    expect(isSchemaError({ code: "42501" })).toBe(false)
    expect(isSchemaError(null)).toBe(false)
  })
})
