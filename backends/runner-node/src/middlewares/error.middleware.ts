import type { NextFunction, Request, Response } from "express";
import type { StandardApiResponse } from "@coffeemail/workbench-contracts";

export function globalErrorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const errorMessage =
    err instanceof Error ? err.message : "Erro interno inesperado";

  const errorResponse: StandardApiResponse<null> = {
    success: false,
    runner: {
      language: "node",
      runtime: process.version,
      sdkVersion: "0.1.6",
      status: "degraded",
    },
    executionTimeMs: 0,
    data: null,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: errorMessage,
      status: 500,
      details: null,
    },
  };

  res.status(500).json(errorResponse);
}
