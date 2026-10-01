import type { Request, Response } from "express";
import type { SendEmailRequestDTO } from "@coffeemail/workbench-contracts";
import { extractExecutionContext } from "../helpers/context.helper.js";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";

export class EmailsController {
  constructor(private readonly service: CoffeeMailRunnerService) {}

  public send = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const payload: SendEmailRequestDTO = req.body;

    if (!payload?.from || !payload?.to || !payload?.subject) {
      res.status(400).json({
        success: false,
        runner: this.service.getRunnerInfo(),
        executionTimeMs: 0,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Campos 'from', 'to' e 'subject' são obrigatórios.",
          status: 400,
          details: null,
        },
      });
      return;
    }

    const result = await this.service.sendEmail(context, payload);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };

  public list = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const page = Math.max(1, Number(req.query["page"] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 10)));

    const result = await this.service.listEmails(context, { page, limit });
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };
}
