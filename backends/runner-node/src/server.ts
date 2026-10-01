import express, { type Express } from "express";
import cors from "cors";
import { CoffeeMailNodeAdapter } from "./adapters/coffee-mail-node.adapter.js";
import { CoffeeMailRunnerService } from "./services/coffee-mail-runner.service.js";
import { createApiRouter } from "./routes/index.js";
import { globalErrorMiddleware } from "./middlewares/error.middleware.js";

export function createServer(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const adapter = new CoffeeMailNodeAdapter();
  const service = new CoffeeMailRunnerService(adapter);

  app.use("/api/v1", createApiRouter(service));

  app.use(globalErrorMiddleware);

  return app;
}
