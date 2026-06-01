import { useRef, useSyncExternalStore } from "react";
import {
  robotTelemetryManager,
  type RobotTelemetrySnapshot,
} from "./robot-telemetry-manager";

export const useRobotTelemetry = () =>
  useSyncExternalStore(
    robotTelemetryManager.subscribe,
    robotTelemetryManager.getSnapshot,
    robotTelemetryManager.getSnapshot,
  );

export function useRobotTelemetrySelector<T>(
  selector: (snapshot: RobotTelemetrySnapshot) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const prevRef = useRef<{ value: T } | null>(null);

  const getSelection = () => {
    const snapshot = robotTelemetryManager.getSnapshot();
    const next = selector(snapshot);
    if (prevRef.current !== null && isEqual(prevRef.current.value, next)) {
      return prevRef.current.value;
    }
    prevRef.current = { value: next };
    return next;
  };

  return useSyncExternalStore(
    robotTelemetryManager.subscribe,
    getSelection,
    getSelection,
  );
}
