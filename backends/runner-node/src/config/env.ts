import dotenv from "dotenv";

dotenv.config();

export interface ServerConfig {
  readonly port: number;
}

export const serverConfig: ServerConfig = {
  port: Number(process.env["PORT"] ?? 4001),
};
