import { serverConfig } from "./config/env.js";
import { createServer } from "./server.js";

const app = createServer();

app.listen(serverConfig.port, () => {
  process.stdout.write(
    `[CoffeeMail Runner Node] Servidor em execução na porta ${serverConfig.port}\n`,
  );
});
