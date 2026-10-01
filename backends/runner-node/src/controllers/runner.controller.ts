import type { Request, Response } from "express";
import { extractExecutionContext } from "../helpers/context.helper.js";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";

export class RunnerController {
  constructor(private readonly service: CoffeeMailRunnerService) {}

  public getInfo = (_req: Request, res: Response): void => {
    const info = this.service.getRunnerInfo();
    res.status(200).json({
      success: true,
      runner: info,
      executionTimeMs: 0,
      data: info,
      error: null,
    });
  };

  public introspect = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const result = await this.service.introspect(context);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };
}
