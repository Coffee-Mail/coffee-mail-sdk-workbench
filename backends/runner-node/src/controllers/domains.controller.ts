import type { Request, Response } from "express";
import type { CreateDomainRequestDTO } from "@coffeemail/workbench-contracts";
import { extractExecutionContext } from "../helpers/context.helper.js";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";

export class DomainsController {
  constructor(private readonly service: CoffeeMailRunnerService) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const result = await this.service.listDomains(context);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const payload: CreateDomainRequestDTO = req.body;

    if (!payload?.name) {
      res.status(400).json({
        success: false,
        runner: this.service.getRunnerInfo(),
        executionTimeMs: 0,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "O campo 'name' é obrigatório para cadastrar um domínio.",
          status: 400,
          details: null,
        },
      });
      return;
    }

    const result = await this.service.createDomain(context, payload);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  public verify = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const domainId = req.params["id"] ?? "";

    const result = await this.service.verifyDomain(context, domainId);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };

  public getHealth = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const domainId = req.params["id"] ?? "";

    const result = await this.service.getDomainHealth(context, domainId);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };
}
