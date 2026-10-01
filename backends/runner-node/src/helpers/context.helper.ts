import type { Request } from "express";
import { RUNNER_HEADERS } from "@coffeemail/workbench-contracts";
import type { RequestExecutionContext } from "../types/context.js";

export function extractExecutionContext(req: Request): RequestExecutionContext {
  const headerKey = req.header(RUNNER_HEADERS.API_KEY);
  const apiKey = typeof headerKey === "string" ? headerKey.trim() : "";

  return { apiKey };
}
