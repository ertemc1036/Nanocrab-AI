import "server-only"

/**
 * Thrown when a database operation fails unexpectedly. The original error is
 * logged server-side (code + message only) and a generic message is exposed.
 */
export class DataAccessError extends Error {
  constructor(operation: string, cause?: { code?: string; message?: string } | null) {
    super(`Data access failed: ${operation}`)
    this.name = "DataAccessError"
    console.error(`[dal] ${operation} failed`, {
      code: cause?.code,
      message: cause?.message,
    })
  }
}
