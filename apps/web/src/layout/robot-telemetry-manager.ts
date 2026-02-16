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
  connectionMessage: string | null;
  telemetryColumns: string[];
  telemetryRows: TelemetryRow[];
  packetSelection: PacketSelection;
  streamPaused: boolean;
}

const MAX_TELEMETRY_ROWS = 1000;

interface ImportTelemetryRow {
  id?: number;
  timestamp: number;
  values: Record<string, TelemetryValue>;
}

class RobotTelemetryManager {
  private connectionStatus: RobotConnectionStatus = "disconnected";

  private ipAddress = "192.168.43.1";

  private connectionMessage: string | null = null;

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

  private socket: WebSocket | null = null;

  private mockStreamTimer: number | null = null;

  private streamPaused = false;

  private isDemoMode = false;

  private snapshot: RobotTelemetrySnapshot = {
    connectionStatus: this.connectionStatus,
    ipAddress: this.ipAddress,
    connectionMessage: this.connectionMessage,
    telemetryColumns: this.telemetryColumns,
    telemetryRows: this.telemetryRows,
    packetSelection: this.packetSelection,
    streamPaused: this.streamPaused,
  };

  constructor() {
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
    const sanitized = ipAddress.replace(/\s+/g, "");
    if (sanitized === this.ipAddress) return;
    this.ipAddress = sanitized;
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

    this.emit();
  };

  setStreamPaused = (paused: boolean) => {
    if (this.streamPaused === paused) return;
    this.streamPaused = paused;
    if (this.streamPaused) {
      this.stopMockStream();
    } else if (this.connectionStatus === "connected" && this.isDemoMode) {
      this.startMockStream();
    }
    this.emit();
  };

  toggleStreamPaused = () => {
    this.setStreamPaused(!this.streamPaused);
  };

  connect = () => {
    if (this.connectionStatus !== "disconnected") return;
    const connectTarget = this.ipAddress.trim();
    if (!connectTarget) {
      this.connectionMessage = "Enter a robot address or type demo.";
      this.emit();
      return;
    }

    this.connectionStatus = "connecting";
    this.connectionMessage = null;
    this.emit();

    this.clearConnectTimer();
    if (connectTarget.toLowerCase() === "demo") {
      this.isDemoMode = true;
      this.connectTimer = window.setTimeout(() => {
        this.connectionStatus = "connected";
        this.connectionMessage = "Connected in demo mode.";
        if (!this.streamPaused) {
          this.startMockStream();
        }
        this.emit();
      }, 700);
      return;
    }

    this.isDemoMode = false;
    this.connectToRobotSocket(connectTarget);
  };

  disconnect = () => {
    this.clearConnectTimer();
    this.stopMockStream();
    this.closeSocket();
    this.isDemoMode = false;
    if (this.connectionStatus === "disconnected") return;
    this.connectionStatus = "disconnected";
    this.connectionMessage = null;
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
    this.emit();
  };

  exportTelemetryCsv = () => {
    const columns = [...this.telemetryColumns];
    const header = ["id", "timestamp", ...columns];
    const rows = this.telemetryRows.map((row) => {
      const cells = [
        String(row.id),
        String(row.timestamp),
        ...columns.map((column) => this.toCsvCell(row.values[column])),
      ];
      return cells.join(",");
    });
    return [header.join(","), ...rows].join("\n");
  };

  importTelemetryCsv = (csvText: string) => {
    const lines = this.parseCsvLines(csvText);
    if (lines.length < 2) {
      throw new Error("CSV must include a header row and at least one data row.");
    }

    const header = lines[0].map((cell) => cell.trim());
    const idIndex = header.findIndex((h) => h.toLowerCase() === "id");
    const timestampIndex = header.findIndex((h) => h.toLowerCase() === "timestamp");
    if (timestampIndex < 0) {
      throw new Error("CSV header must include a timestamp column.");
    }

    const valueColumns = header
      .map((column, index) => ({ column, index }))
      .filter(
        ({ index, column }) =>
          index !== idIndex &&
          index !== timestampIndex &&
          column.length > 0,
      );

    const importedRows: ImportTelemetryRow[] = [];
    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const row = lines[lineIndex];
      const timestampCell = row[timestampIndex];
      const timestamp = Number(timestampCell);
      if (!Number.isFinite(timestamp)) {
        continue;
      }

      const values: Record<string, TelemetryValue> = {};
      valueColumns.forEach(({ column, index }) => {
        const raw = row[index] ?? "";
        values[column] = this.parseTelemetryCell(raw);
      });

      const idCell = idIndex >= 0 ? row[idIndex] : undefined;
      const id = idCell !== undefined && idCell !== "" ? Number(idCell) : undefined;
      importedRows.push({
        id: Number.isFinite(id) ? id : undefined,
        timestamp,
        values,
      });
    }

    if (importedRows.length === 0) {
      throw new Error("No valid packet rows found in CSV.");
    }

    this.replaceTelemetryRows(importedRows);
    return { importedCount: importedRows.length };
  };

  private replaceTelemetryRows = (rows: ImportTelemetryRow[]) => {
    const nextRows = rows.slice(-MAX_TELEMETRY_ROWS).map((row, index) => ({
      id: row.id ?? index + 1,
      timestamp: row.timestamp,
      values: { ...row.values },
    }));

    const columnSet = new Set<string>();
    nextRows.forEach((row) => {
      Object.keys(row.values).forEach((column) => {
        if (column.trim().length > 0) columnSet.add(column);
      });
    });

    this.telemetryColumns = Array.from(columnSet);
    this.telemetryRows = nextRows;
    this.nextRowId =
      (nextRows.reduce((maxId, row) => Math.max(maxId, row.id), 0) || 0) + 1;
    this.reconcileSelectionWithRows();
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
      connectionMessage: this.connectionMessage,
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
    const endIndex = this.packetSelection.endFollowsLatest
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

  private connectToRobotSocket = (connectTarget: string) => {
    const socketUrl =
      connectTarget.startsWith("ws://") || connectTarget.startsWith("wss://")
        ? connectTarget
        : `ws://${connectTarget}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(socketUrl);
    } catch {
      this.connectionStatus = "disconnected";
      this.connectionMessage = `Unable to connect to ${connectTarget}.`;
      this.emit();
      return;
    }

    this.socket = socket;
    let settled = false;

    const failConnect = (message: string) => {
      if (settled) return;
      settled = true;
      this.clearConnectTimer();
      if (this.socket === socket) {
        this.socket = null;
      }
      if (this.connectionStatus === "connecting") {
        this.connectionStatus = "disconnected";
        this.connectionMessage = message;
        this.emit();
      }
      socket.close();
    };

    this.connectTimer = window.setTimeout(() => {
      failConnect(`Connection timed out for ${connectTarget}.`);
    }, 3000);

    socket.onopen = () => {
      if (settled) return;
      settled = true;
      this.clearConnectTimer();
      this.connectionStatus = "connected";
      this.connectionMessage = `Connected to ${connectTarget}.`;
      this.emit();
    };

    socket.onerror = () => {
      failConnect(`Failed to connect to ${connectTarget}.`);
    };

    socket.onclose = (event) => {
      if (!settled) {
        failConnect(`Failed to connect to ${connectTarget}.`);
        return;
      }

      if (this.connectionStatus === "connected") {
        this.closeSocket();
        this.stopMockStream();
        this.isDemoMode = false;
        this.connectionStatus = "disconnected";
        this.streamPaused = false;
        this.connectionMessage = event.wasClean
          ? "Connection closed."
          : `Connection lost to ${connectTarget}.`;
        this.emit();
      }
    };

    socket.onmessage = (event) => {
      const data = this.toTelemetryDatums(event.data);
      if (!data || data.length === 0) return;
      this.addTelemetrySample(data, Date.now());
    };
  };

  private closeSocket = () => {
    if (!this.socket) return;
    this.socket.onopen = null;
    this.socket.onmessage = null;
    this.socket.onerror = null;
    this.socket.onclose = null;
    this.socket.close();
    this.socket = null;
  };

  private toTelemetryDatums = (payload: unknown): TelemetryDatum[] | null => {
    if (typeof payload !== "string") {
      return null;
    }

    try {
      const parsed = JSON.parse(payload) as unknown;

      if (Array.isArray(parsed)) {
        if (
          parsed.every(
            (entry) =>
              typeof entry === "object" &&
              entry !== null &&
              "name" in entry &&
              "value" in entry,
          )
        ) {
          return parsed as TelemetryDatum[];
        }
      }

      if (typeof parsed === "object" && parsed !== null) {
        const asRecord = parsed as Record<string, unknown>;

        if (Array.isArray(asRecord.telemetry)) {
          const telemetry = asRecord.telemetry;
          if (
            telemetry.every(
              (entry) =>
                typeof entry === "object" &&
                entry !== null &&
                "name" in entry &&
                "value" in entry,
            )
          ) {
            return telemetry as TelemetryDatum[];
          }
        }

        const datums = Object.entries(asRecord)
          .filter(([, value]) =>
            ["string", "number", "boolean"].includes(typeof value),
          )
          .map(([name, value]) => ({
            name,
            value: value as TelemetryValue,
          }));

        if (datums.length > 0) {
          return datums;
        }
      }
    } catch {
      return null;
    }

    return null;
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

  private toCsvCell = (value: TelemetryValue | undefined) => {
    const raw = value === undefined ? "" : String(value);
    if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
      return `"${raw.replaceAll("\"", "\"\"")}"`;
    }
    return raw;
  };

  private parseTelemetryCell = (raw: string): TelemetryValue => {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return raw;
  };

  private parseCsvLines = (csvText: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i += 1) {
      const char = csvText[i];
      const next = csvText[i + 1];

      if (char === "\"") {
        if (inQuotes && next === "\"") {
          cell += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && char === ",") {
        row.push(cell);
        cell = "";
        continue;
      }

      if (!inQuotes && (char === "\n" || char === "\r")) {
        if (char === "\r" && next === "\n") {
          i += 1;
        }
        row.push(cell);
        if (row.some((entry) => entry.length > 0)) {
          rows.push(row);
        }
        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      if (row.some((entry) => entry.length > 0)) {
        rows.push(row);
      }
    }

    return rows;
  };
}

export const robotTelemetryManager = new RobotTelemetryManager();
