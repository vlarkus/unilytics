export type RobotConnectionStatus = "disconnected" | "connecting" | "connected";
export type TelemetryValue = string | number | boolean;

export interface TelemetryDatum {
  name: string;
  value: TelemetryValue;
}

export interface TelemetryRow {
  id: number;
  timestamp: number;
  values: Record<string, TelemetryValue>;
}

export interface PacketSelection {
  startIndex: number;
  endIndex: number;
  endFollowsLatest: boolean;
}

export interface RobotTelemetrySnapshot {
  connectionStatus: RobotConnectionStatus;
  ipAddress: string;
  telemetryColumns: string[];
  telemetryRows: TelemetryRow[];
  packetSelection: PacketSelection;
  streamPaused: boolean;
}

const STORAGE_KEY = "adaptive.robotTelemetry.v1";
const MAX_TELEMETRY_ROWS = 1000;

interface PersistedTelemetryState {
  ipAddress: string;
  nextRowId: number;
  telemetryColumns: string[];
  telemetryRows: TelemetryRow[];
  packetSelection: PacketSelection;
  streamPaused: boolean;
}

class RobotTelemetryManager {
  private connectionStatus: RobotConnectionStatus = "disconnected";

  private ipAddress = "192.168.43.1";

  private telemetryColumns: string[] = [];

  private telemetryRows: TelemetryRow[] = [];

  private nextRowId = 1;

  private packetSelection: PacketSelection = {
    startIndex: 0,
    endIndex: 0,
    endFollowsLatest: true,
  };

  private listeners = new Set<() => void>();

  private connectTimer: number | null = null;

  private mockStreamTimer: number | null = null;

  private streamPaused = false;

  private snapshot: RobotTelemetrySnapshot = {
    connectionStatus: this.connectionStatus,
    ipAddress: this.ipAddress,
    telemetryColumns: this.telemetryColumns,
    telemetryRows: this.telemetryRows,
    packetSelection: this.packetSelection,
    streamPaused: this.streamPaused,
  };

  constructor() {
    this.loadPersistedState();
    this.rebuildSnapshot();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  setIpAddress = (ipAddress: string) => {
    const sanitized = ipAddress.replace(/[^0-9.]/g, "");
    if (sanitized === this.ipAddress) return;
    this.ipAddress = sanitized;
    this.persistState();
    this.emit();
  };

  setPacketSelectionStartByIndex = (startIndex: number) => {
    const maxIndex = Math.max(0, this.telemetryRows.length - 1);
    const clampedStart = Math.min(Math.max(Math.round(startIndex), 0), maxIndex);
    const nextEnd = Math.max(this.packetSelection.endIndex, clampedStart);

    this.packetSelection = {
      ...this.packetSelection,
      startIndex: clampedStart,
      endIndex: nextEnd,
    };
    this.persistState();
    this.emit();
  };

  setPacketSelectionEndByIndex = (endIndex: number) => {
    const maxIndex = Math.max(0, this.telemetryRows.length - 1);
    const clampedEnd = Math.min(Math.max(Math.round(endIndex), 0), maxIndex);
    const nextStart = Math.min(this.packetSelection.startIndex, clampedEnd);

    this.packetSelection = {
      startIndex: nextStart,
      endIndex: clampedEnd,
      endFollowsLatest: false,
    };
    this.persistState();
    this.emit();
  };

  setPacketSelectionStartByPacketNumber = (packetNumber: number) => {
    this.setPacketSelectionStartByIndex(packetNumber - 1);
  };

  setPacketSelectionEndByPacketNumber = (packetNumber: number) => {
    this.setPacketSelectionEndByIndex(packetNumber - 1);
  };

  setPacketSelectionStartByTimestamp = (timestamp: number) => {
    const nearestIndex = this.findNearestRowIndexForTimestamp(timestamp);
    if (nearestIndex === null) return;
    this.setPacketSelectionStartByIndex(nearestIndex);
  };

  setPacketSelectionEndByTimestamp = (timestamp: number) => {
    const nearestIndex = this.findNearestRowIndexForTimestamp(timestamp);
    if (nearestIndex === null) return;
    this.setPacketSelectionEndByIndex(nearestIndex);
  };

  setPacketSelectionFollowLatest = (endFollowsLatest: boolean) => {
    const lastIndex = Math.max(0, this.telemetryRows.length - 1);

    if (endFollowsLatest) {
      this.packetSelection = {
        startIndex: Math.min(this.packetSelection.startIndex, lastIndex),
        endIndex: lastIndex,
        endFollowsLatest: true,
      };
    } else {
      this.packetSelection = {
        ...this.packetSelection,
        endFollowsLatest: false,
      };
    }

    this.persistState();
    this.emit();
  };

  setStreamPaused = (paused: boolean) => {
    if (this.streamPaused === paused) return;
    this.streamPaused = paused;
    if (this.streamPaused) {
      this.stopMockStream();
    } else if (this.connectionStatus === "connected") {
      this.startMockStream();
    }
    this.persistState();
    this.emit();
  };

  toggleStreamPaused = () => {
    this.setStreamPaused(!this.streamPaused);
  };

  connect = () => {
    if (this.connectionStatus !== "disconnected") return;

    this.connectionStatus = "connecting";
    this.emit();

    this.clearConnectTimer();
    this.connectTimer = window.setTimeout(() => {
      this.connectionStatus = "connected";
      if (!this.streamPaused) {
        this.startMockStream();
      }
      this.emit();
    }, 700);
  };

  disconnect = () => {
    this.clearConnectTimer();
    this.stopMockStream();
    if (this.connectionStatus === "disconnected") return;
    this.connectionStatus = "disconnected";
    this.streamPaused = false;
    this.emit();
  };

  toggleConnection = () => {
    if (this.connectionStatus === "disconnected") {
      this.connect();
      return;
    }
    this.disconnect();
  };

  generateRandomTelemetrySample = () => {
    const now = Date.now();
    this.addTelemetrySample(this.createRandomTelemetryDatums(now), now);
  };

  addTelemetrySample = (data: TelemetryDatum[], timestamp = Date.now()) => {
    const values: Record<string, TelemetryValue> = {};

    data.forEach((datum) => {
      const name = datum.name.trim();
      if (!name) return;
      if (!this.telemetryColumns.includes(name)) {
        this.telemetryColumns = [...this.telemetryColumns, name];
      }
      values[name] = datum.value;
    });

    if (Object.keys(values).length === 0) return;

    const row: TelemetryRow = {
      id: this.nextRowId++,
      timestamp,
      values,
    };

    const nextRows = [...this.telemetryRows, row];
    this.telemetryRows =
      nextRows.length > MAX_TELEMETRY_ROWS
        ? nextRows.slice(nextRows.length - MAX_TELEMETRY_ROWS)
        : nextRows;
    this.reconcileSelectionWithRows();

    this.persistState();
    this.emit();
  };

  clearTelemetry = () => {
    this.telemetryColumns = [];
    this.telemetryRows = [];
    this.nextRowId = 1;
    this.packetSelection = {
      startIndex: 0,
      endIndex: 0,
      endFollowsLatest: true,
    };
    this.persistState();
    this.emit();
  };

  private emit = () => {
    this.rebuildSnapshot();
    this.listeners.forEach((listener) => listener());
  };

  private rebuildSnapshot = () => {
    this.snapshot = {
      connectionStatus: this.connectionStatus,
      ipAddress: this.ipAddress,
      telemetryColumns: [...this.telemetryColumns],
      telemetryRows: this.telemetryRows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        values: { ...row.values },
      })),
      packetSelection: { ...this.packetSelection },
      streamPaused: this.streamPaused,
    };
  };

  private reconcileSelectionWithRows = () => {
    const lastIndex = Math.max(0, this.telemetryRows.length - 1);
    let startIndex = Math.min(Math.max(this.packetSelection.startIndex, 0), lastIndex);
    let endIndex = this.packetSelection.endFollowsLatest
      ? lastIndex
      : Math.min(Math.max(this.packetSelection.endIndex, 0), lastIndex);

    if (startIndex > endIndex) {
      startIndex = endIndex;
    }

    this.packetSelection = {
      startIndex,
      endIndex,
      endFollowsLatest: this.packetSelection.endFollowsLatest,
    };
  };

  private findNearestRowIndexForTimestamp = (timestamp: number): number | null => {
    if (!Number.isFinite(timestamp) || this.telemetryRows.length === 0) {
      return null;
    }

    let nearestIndex = 0;
    let nearestDistance = Math.abs(this.telemetryRows[0].timestamp - timestamp);

    for (let i = 1; i < this.telemetryRows.length; i += 1) {
      const distance = Math.abs(this.telemetryRows[i].timestamp - timestamp);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  };

  private startMockStream = () => {
    this.stopMockStream();

    this.mockStreamTimer = window.setInterval(() => {
      const now = Date.now();
      this.addTelemetrySample(this.createRandomTelemetryDatums(now), now);
    }, 1000);
  };

  private createRandomTelemetryDatums = (timestamp: number): TelemetryDatum[] => {
    const phase = timestamp / 1000;
    const headingDeg = Number((Math.random() * 360).toFixed(2));
    const xIn = Number((Math.sin(phase * 0.8) * 52 + Math.sin(phase * 0.17) * 12).toFixed(2));
    const yIn = Number((Math.cos(phase * 0.65) * 54 + Math.cos(phase * 0.13) * 10).toFixed(2));
    const flywheelSpeedRpm = Math.round(Math.random() * 2000);
    const deflectorAngle = Number(Math.random().toFixed(3));
    const yawAngleDeg = Number((Math.random() * 540 - 270).toFixed(2));
    const ballCount = Math.floor(Math.random() * 4);

    const batteryVoltage = Number(
      (12.4 + Math.sin(phase / 7) * 0.45 + (Math.random() - 0.5) * 0.06).toFixed(2),
    );
    const loopTimeMs = Math.round(14 + Math.random() * 10);
    const drivetrainSpeedInPerSec = Number((Math.random() * 85).toFixed(2));
    const intakeCurrentA = Number((2 + Math.random() * 9).toFixed(2));
    const shooterTempC = Number((36 + Math.random() * 18).toFixed(1));
    const targetVisible = Math.random() > 0.35;

    return [
      { name: "headingDeg", value: headingDeg },
      { name: "xIn", value: xIn },
      { name: "yIn", value: yIn },
      { name: "flywheelSpeedRpm", value: flywheelSpeedRpm },
      { name: "deflectorAngle", value: deflectorAngle },
      { name: "yawAngleDeg", value: yawAngleDeg },
      { name: "ballCount", value: ballCount },
      { name: "loopTimeMs", value: loopTimeMs },
      { name: "batteryVoltage", value: batteryVoltage },
      { name: "drivetrainSpeedInPerSec", value: drivetrainSpeedInPerSec },
      { name: "intakeCurrentA", value: intakeCurrentA },
      { name: "shooterTempC", value: shooterTempC },
      { name: "targetVisible", value: targetVisible },
    ];
  };

  private stopMockStream = () => {
    if (this.mockStreamTimer === null) return;
    window.clearInterval(this.mockStreamTimer);
    this.mockStreamTimer = null;
  };

  private clearConnectTimer = () => {
    if (this.connectTimer === null) return;
    window.clearTimeout(this.connectTimer);
    this.connectTimer = null;
  };

  private loadPersistedState = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<PersistedTelemetryState>;
      if (typeof parsed.ipAddress === "string") {
        this.ipAddress = parsed.ipAddress.replace(/[^0-9.]/g, "");
      }
      if (typeof parsed.nextRowId === "number" && parsed.nextRowId > 0) {
        this.nextRowId = parsed.nextRowId;
      }
      if (Array.isArray(parsed.telemetryColumns)) {
        this.telemetryColumns = parsed.telemetryColumns.filter(
          (column): column is string => typeof column === "string" && column.length > 0,
        );
      }
      if (Array.isArray(parsed.telemetryRows)) {
        this.telemetryRows = parsed.telemetryRows
          .filter(
            (row): row is TelemetryRow =>
              typeof row === "object" &&
              row !== null &&
              typeof row.id === "number" &&
              typeof row.timestamp === "number" &&
              typeof row.values === "object" &&
              row.values !== null,
          )
          .slice(-MAX_TELEMETRY_ROWS);
      }
      if (parsed.packetSelection && typeof parsed.packetSelection === "object") {
        const { startIndex, endIndex, endFollowsLatest } = parsed.packetSelection;
        if (
          typeof startIndex === "number" &&
          typeof endIndex === "number" &&
          typeof endFollowsLatest === "boolean"
        ) {
          this.packetSelection = {
            startIndex: Math.max(0, Math.round(startIndex)),
            endIndex: Math.max(0, Math.round(endIndex)),
            endFollowsLatest,
          };
        }
      }
      if (typeof parsed.streamPaused === "boolean") {
        this.streamPaused = parsed.streamPaused;
      }
      this.reconcileSelectionWithRows();
    } catch {
      // ignore corrupt persisted state
    }
  };

  private persistState = () => {
    const state: PersistedTelemetryState = {
      ipAddress: this.ipAddress,
      nextRowId: this.nextRowId,
      telemetryColumns: this.telemetryColumns,
      telemetryRows: this.telemetryRows,
      packetSelection: this.packetSelection,
      streamPaused: this.streamPaused,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage can fail in private mode or quota cases
    }
  };
}

export const robotTelemetryManager = new RobotTelemetryManager();
