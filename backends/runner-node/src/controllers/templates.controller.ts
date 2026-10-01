import type { Request, Response } from "express";
import type { CreateTemplateRequestDTO } from "@coffeemail/workbench-contracts";
import { extractExecutionContext } from "../helpers/context.helper.js";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";

export class TemplatesController {
  constructor(private readonly service: CoffeeMailRunnerService) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const page = Math.max(1, Number(req.query["page"] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 10)));

    const result = await this.service.listTemplates(context, { page, limit });
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const payload: CreateTemplateRequestDTO = req.body;

    if (!payload?.name || !payload?.subject || !payload?.html) {
      res.status(400).json({
        success: false,
        runner: this.service.getRunnerInfo(),
        executionTimeMs: 0,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Campos 'name', 'subject' e 'html' são obrigatórios.",
          status: 400,
          details: null,
        },
      });
      return;
    }

    const result = await this.service.createTemplate(context, payload);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  public preview = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const templateId = req.params["id"] ?? "";

    const result = await this.service.previewTemplate(context, templateId);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };
}
