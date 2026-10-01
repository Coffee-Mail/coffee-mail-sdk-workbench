import { describe, expect, it } from "vitest";
import type {
  ICoffeeMailSdkAdapter,
} from "../adapters/coffee-mail-adapter.interface.js";
import { CoffeeMailRunnerService } from "../services/coffee-mail-runner.service.js";
import type {
  RunnerInfoDTO,
  SendEmailRequestDTO,
  SendEmailResponseDTO,
} from "@coffeemail/workbench-contracts";

class MockCoffeeMailAdapter implements Partial<ICoffeeMailSdkAdapter> {
  public getRunnerInfo(): RunnerInfoDTO {
    return {
      language: "node",
      runtime: "v22.0.0",
      sdkVersion: "0.1.6",
      status: "online",
    };
  }

  public async sendEmail(
    _context: { readonly apiKey: string },
    payload: SendEmailRequestDTO,
  ): Promise<SendEmailResponseDTO> {
    if (!payload.from) {
      throw new Error("Remetente ausente");
    }

    return {
      id: "email_mock_123",
      status: "queued",
      createdAt: "2026-10-01T00:00:00.000Z",
    };
  }
}

describe("CoffeeMailRunnerService", () => {
  it("deve retornar metadados corretos do runner", () => {
    const mockAdapter = new MockCoffeeMailAdapter() as ICoffeeMailSdkAdapter;
    const service = new CoffeeMailRunnerService(mockAdapter);

    const info = service.getRunnerInfo();

    expect(info.language).toBe("node");
    expect(info.status).toBe("online");
    expect(info.sdkVersion).toBe("0.1.6");
  });

  it("deve encapsular resposta bem-sucedida com tempo de execução e status success=true", async () => {
    const mockAdapter = new MockCoffeeMailAdapter() as ICoffeeMailSdkAdapter;
    const service = new CoffeeMailRunnerService(mockAdapter);

    const response = await service.sendEmail(
      { apiKey: "cm_live_testkey" },
      {
        from: "sender@example.com",
        to: "recipient@example.com",
        subject: "Teste unitário",
      },
    );

    expect(response.success).toBe(true);
    expect(response.error).toBeNull();
    expect(response.data?.id).toBe("email_mock_123");
    expect(typeof response.executionTimeMs).toBe("number");
    expect(response.runner.language).toBe("node");
  });

  it("deve capturar falhas no adapter e retornar payload de erro padronizado", async () => {
    const mockAdapter = new MockCoffeeMailAdapter() as ICoffeeMailSdkAdapter;
    const service = new CoffeeMailRunnerService(mockAdapter);

    const response = await service.sendEmail(
      { apiKey: "cm_live_testkey" },
      {
        from: "",
        to: "recipient@example.com",
        subject: "Teste unitário falha",
      },
    );

    expect(response.success).toBe(false);
    expect(response.data).toBeNull();
    expect(response.error?.code).toBe("RUNNER_EXECUTION_ERROR");
    expect(response.error?.message).toContain("Remetente ausente");
  });
});
