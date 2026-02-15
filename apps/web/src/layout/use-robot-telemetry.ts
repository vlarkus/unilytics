import { useSyncExternalStore } from "react";
import { robotTelemetryManager } from "./robot-telemetry-manager";

export const useRobotTelemetry = () =>
  useSyncExternalStore(
    robotTelemetryManager.subscribe,
    robotTelemetryManager.getSnapshot,
    robotTelemetryManager.getSnapshot,
  );
