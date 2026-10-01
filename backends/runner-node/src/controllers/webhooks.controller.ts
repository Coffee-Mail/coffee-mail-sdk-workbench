import type { Request, Response } from "express";
import type { CreateWebhookRequestDTO } from "@coffeemail/workbench-contracts";
import { extractExecutionContext } from "../helpers/context.helper.js";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";

export class WebhooksController {
  constructor(private readonly service: CoffeeMailRunnerService) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const result = await this.service.listWebhooks(context);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const payload: CreateWebhookRequestDTO = req.body;

    if (!payload?.url || !Array.isArray(payload.events) || payload.events.length === 0) {
      res.status(400).json({
        success: false,
        runner: this.service.getRunnerInfo(),
        executionTimeMs: 0,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Campos 'url' e array de 'events' são obrigatórios.",
          status: 400,
          details: null,
        },
      });
      return;
    }

    const result = await this.service.createWebhook(context, payload);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  public test = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const webhookId = req.params["id"] ?? "";

    const result = await this.service.testWebhook(context, webhookId);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };
}
