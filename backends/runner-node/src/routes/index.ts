import { Router } from "express";
import type { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";
import { RunnerController } from "../controllers/runner.controller.js";
import { EmailsController } from "../controllers/emails.controller.js";
import { DomainsController } from "../controllers/domains.controller.js";
import { TemplatesController } from "../controllers/templates.controller.js";
import { AudiencesController } from "../controllers/audiences.controller.js";
import { SuppressionsController } from "../controllers/suppressions.controller.js";
import { WebhooksController } from "../controllers/webhooks.controller.js";
import { StatsController } from "../controllers/stats.controller.js";

export function createApiRouter(service: CoffeeMailRunnerService): Router {
  const router = Router();

  const runnerCtrl = new RunnerController(service);
  const emailsCtrl = new EmailsController(service);
  const domainsCtrl = new DomainsController(service);
  const templatesCtrl = new TemplatesController(service);
  const audiencesCtrl = new AudiencesController(service);
  const suppressionsCtrl = new SuppressionsController(service);
  const webhooksCtrl = new WebhooksController(service);
  const statsCtrl = new StatsController(service);

  router.get("/runner/info", runnerCtrl.getInfo);
  router.post("/client/introspect", runnerCtrl.introspect);

  router.post("/emails/send", emailsCtrl.send);
  router.get("/emails", emailsCtrl.list);

  router.get("/domains", domainsCtrl.list);
  router.post("/domains", domainsCtrl.create);
  router.post("/domains/:id/verify", domainsCtrl.verify);
  router.get("/domains/:id/health", domainsCtrl.getHealth);

  router.get("/templates", templatesCtrl.list);
  router.post("/templates", templatesCtrl.create);
  router.post("/templates/:id/preview", templatesCtrl.preview);

  router.get("/audiences", audiencesCtrl.list);
  router.post("/audiences", audiencesCtrl.create);
  router.get("/audiences/:id/contacts", audiencesCtrl.listContacts);
  router.post("/audiences/:id/contacts", audiencesCtrl.createContact);

  router.get("/suppressions", suppressionsCtrl.list);
  router.post("/suppressions", suppressionsCtrl.create);
  router.delete("/suppressions/:email", suppressionsCtrl.delete);

  router.get("/webhooks", webhooksCtrl.list);
  router.post("/webhooks", webhooksCtrl.create);
  router.post("/webhooks/:id/test", webhooksCtrl.test);

  router.get("/stats", statsCtrl.get);

  return router;
}
