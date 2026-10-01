import type { Request, Response } from "express";
import { extractExecutionContext } from "../helpers/context.helper.js";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";

export class StatsController {
  constructor(private readonly service: CoffeeMailRunnerService) {}

  public get = async (req: Request, res: Response): Promise<void> => {
    const context = extractExecutionContext(req);
    const startDate =
      typeof req.query["startDate"] === "string"
        ? req.query["startDate"]
        : undefined;
    const endDate =
      typeof req.query["endDate"] === "string"
        ? req.query["endDate"]
        : undefined;
    const periodParam = req.query["period"];
    const period =
      periodParam === "last7d" ||
      periodParam === "last30d" ||
      periodParam === "last90d"
        ? periodParam
        : undefined;

    const result = await this.service.getStats(context, {
      startDate,
      endDate,
      period,
    });
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  };
}
