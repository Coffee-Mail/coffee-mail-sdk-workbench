import type { Request, Response } from "express";
import type {
  CreateAudienceRequestDTO,
  CreateContactRequestDTO,
} from "@coffeemail/workbench-contracts";
import { extractExecutionContext } from "../helpers/context.helper.js";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";

export class AudiencesController {
  constructor(private readonly service: CoffeeMailRunnerService) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const result = await this.service.listAudiences(context);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const payload: CreateAudienceRequestDTO = req.body;

    if (!payload?.name) {
      res.status(400).json({
        success: false,
        runner: this.service.getRunnerInfo(),
        executionTimeMs: 0,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "O campo 'name' é obrigatório para cadastrar uma audiência.",
          status: 400,
          details: null,
        },
      });
      return;
    }

    const result = await this.service.createAudience(context, payload);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  public listContacts = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const audienceId = req.params["id"] ?? "";
    const page = Math.max(1, Number(req.query["page"] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 10)));

    const result = await this.service.listContacts(context, audienceId, {
      page,
      limit,
    });
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };

  public createContact = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const audienceId = req.params["id"] ?? "";
    const payload: CreateContactRequestDTO = req.body;

    if (!payload?.email) {
      res.status(400).json({
        success: false,
        runner: this.service.getRunnerInfo(),
        executionTimeMs: 0,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "O campo 'email' é obrigatório para cadastrar um contato.",
          status: 400,
          details: null,
        },
      });
      return;
    }

    const result = await this.service.createContact(context, audienceId, payload);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };
}
