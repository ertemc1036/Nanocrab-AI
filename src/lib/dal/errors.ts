import "server-only"

type Cause = { code?: string; message?: string } | null | undefined

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
  constructor(operation: string, cause?: Cause) {
    super(`Data access failed: ${operation}`)
    this.name = "DataAccessError"
    logDataAccessFailure(operation, cause)
  }
}
