import type { Request, Response } from "express";
import type { CreateSuppressionRequestDTO } from "@coffeemail/workbench-contracts";
import { extractExecutionContext } from "../helpers/context.helper.js";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";

export class SuppressionsController {
  constructor(private readonly service: CoffeeMailRunnerService) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const page = Math.max(1, Number(req.query["page"] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 10)));

    const result = await this.service.listSuppressions(context, { page, limit });
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const payload: CreateSuppressionRequestDTO = req.body;

    if (!payload?.email || !payload?.reason) {
      res.status(400).json({
        success: false,
        runner: this.service.getRunnerInfo(),
        executionTimeMs: 0,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Campos 'email' e 'reason' são obrigatórios.",
          status: 400,
          details: null,
        },
      });
      return;
    }

    const result = await this.service.createSuppression(context, payload);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const email = req.params["email"] ?? "";

    const result = await this.service.deleteSuppression(context, email);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };
}
