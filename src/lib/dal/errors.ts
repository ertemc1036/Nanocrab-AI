import "server-only"

type Cause = { code?: string; message?: string } | null | undefined

/**
 * PostgREST / Postgres codes that mean the database schema doesn't match the
 * app — almost always because supabase/migrations haven't been applied.
 */
const SCHEMA_ERROR_CODES = new Set([
  "PGRST205", // table not found in schema cache
  "PGRST204", // column not found in schema cache
  "PGRST202", // function not found in schema cache
  "42P01", // undefined_table
  "42703", // undefined_column
  "42883", // undefined_function
])

export function isSchemaError(cause: Cause): boolean {
  return Boolean(cause?.code && SCHEMA_ERROR_CODES.has(cause.code))
}

/** Logs a data access failure server-side (code + message only, no payloads). */
export function logDataAccessFailure(operation: string, cause?: Cause) {
  console.error(`[dal] ${operation} failed`, {
    code: cause?.code,
    message: cause?.message,
  })
}

/**
 * Thrown when a database operation fails unexpectedly. The original error is
 * logged server-side and a generic message is exposed.
 */
export class DataAccessError extends Error {
  readonly code: string | undefined

  constructor(operation: string, cause?: Cause) {
    super(
      isSchemaError(cause)
        ? `Data access failed: ${operation}. The database schema is missing objects this app needs (${cause?.code}). Apply the migrations in supabase/migrations — see docs/SUPABASE_SETUP.md.`
        : `Data access failed: ${operation}`
    )
    this.name = isSchemaError(cause) ? "DatabaseSchemaError" : "DataAccessError"
    this.code = cause?.code
    logDataAccessFailure(operation, cause)
  }
}
