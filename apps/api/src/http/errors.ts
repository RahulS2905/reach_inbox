export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthorized: (msg = "Authentication required") => new AppError(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "Not allowed to access this resource") => new AppError(403, "FORBIDDEN", msg),
  notFound: (msg = "Resource not found") => new AppError(404, "NOT_FOUND", msg),
  badRequest: (msg: string, details?: unknown) => new AppError(400, "BAD_REQUEST", msg, details),
  conflict: (msg: string, details?: unknown) => new AppError(409, "CONFLICT", msg, details),
  internal: (msg = "Internal server error") => new AppError(500, "INTERNAL", msg),
};
