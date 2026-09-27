import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { logger } from "../logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as Request & { id?: string }).id;

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        requestId,
        details: err.flatten(),
      },
    });
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, requestId }, err.message);
    }
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, requestId, details: err.details },
    });
  }

  logger.error({ err, requestId }, "Unhandled error");
  return res.status(500).json({
    error: { code: "INTERNAL", message: "Internal server error", requestId },
  });
}
