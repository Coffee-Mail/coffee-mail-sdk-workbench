import { useCallback, useEffect, useState } from "react";
import type { RunnerInfoDTO, StandardApiResponse } from "@coffeemail/workbench-contracts";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";

export interface UseRunnerStatusResult {
  readonly runnerInfo: RunnerInfoDTO | null;
  readonly isOnline: boolean;
  readonly isChecking: boolean;
  readonly checkConnection: () => Promise<void>;
}

export function useRunnerStatus(runnerBaseUrl: string): UseRunnerStatusResult {
  const [runnerInfo, setRunnerInfo] = useState<RunnerInfoDTO | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);

    try {
      const response = await fetch(`${runnerBaseUrl}${RUNNER_ENDPOINTS.RUNNER_INFO}`);
      if (!response.ok) {
        setIsOnline(false);
        setRunnerInfo(null);
        return;
      }

      const payload: StandardApiResponse<RunnerInfoDTO> = await response.json();
      if (payload.success && payload.data) {
        setIsOnline(true);
        setRunnerInfo(payload.data);
        return;
      }

      setIsOnline(false);
      setRunnerInfo(null);
    } catch {
      setIsOnline(false);
      setRunnerInfo(null);
    } finally {
      setIsChecking(false);
    }
  }, [runnerBaseUrl]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  return {
    runnerInfo,
    isOnline,
    isChecking,
    checkConnection,
  };
}
