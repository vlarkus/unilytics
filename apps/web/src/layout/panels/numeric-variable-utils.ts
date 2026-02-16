import type {
  PacketSelection,
  TelemetryRow,
} from "../robot-telemetry-manager";

export const PACKET_NUMBER_KEY = "__packet_number__";
export const TIMESTAMP_KEY = "__timestamp__";

export interface NumericVariableOption {
  value: string;
  label: string;
}

export interface SelectedRowEntry {
  row: TelemetryRow;
  packetNumber: number;
}

export const getNumericVariableOptions = (
  telemetryColumns: string[],
): NumericVariableOption[] => [
  { value: PACKET_NUMBER_KEY, label: "Packet Number" },
  { value: TIMESTAMP_KEY, label: "Timestamp (ms)" },
  ...telemetryColumns.map((column) => ({ value: column, label: column })),
];

export const getSelectedRowEntries = (
  telemetryRows: TelemetryRow[],
  packetSelection: PacketSelection,
): SelectedRowEntry[] => {
  if (telemetryRows.length === 0) return [];

  const maxIndex = telemetryRows.length - 1;
  const startIndex = Math.min(Math.max(packetSelection.startIndex, 0), maxIndex);
  const endIndex = Math.min(Math.max(packetSelection.endIndex, 0), maxIndex);
  const lower = Math.min(startIndex, endIndex);
  const upper = Math.max(startIndex, endIndex);

  return telemetryRows.slice(lower, upper + 1).map((row, index) => ({
    row,
    packetNumber: lower + index + 1,
  }));
};

export const getNumericVariableValue = (
  entry: SelectedRowEntry,
  variable: string,
): number | null => {
  if (variable === PACKET_NUMBER_KEY) return entry.packetNumber;
  if (variable === TIMESTAMP_KEY) return entry.row.timestamp;

  const rawValue = entry.row.values[variable];
  const parsed =
    typeof rawValue === "number" ? rawValue : rawValue === undefined ? NaN : Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

