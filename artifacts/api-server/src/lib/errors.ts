export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DiagnosticError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DiagnosticError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string = "Too many requests. Please try again later.",
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function isDiagnosticError(error: unknown): error is DiagnosticError {
  return error instanceof DiagnosticError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove potential file paths and replace with generic message
    const message = error.message;
    return message
      .replace(/\/[^\s]+\//g, '/[PATH]/')
      .replace(/\\[^\s]+\\/g, '\\[PATH]\\')
      .substring(0, 200); // Limit length
  }
  return "An unexpected error occurred";
}