/* eslint-disable react-refresh/only-export-components */
import React from "react";
import type { PanelProps } from "../PanelRegistry";
import { robotTelemetryManager } from "../robot-telemetry-manager";
import { useRobotTelemetry } from "../use-robot-telemetry";

export const telemetryTablePanelTags = ["telemetry", "data", "table", "logs"];

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const TelemetryTablePanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows } = useRobotTelemetry();
  const [sortColumn, setSortColumn] = React.useState<string | "timestamp">("timestamp");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  const rows = React.useMemo(() => {
    const sorted = [...telemetryRows];

    const compareValues = (left: unknown, right: unknown) => {
      if (left === right) return 0;
      if (left === undefined) return 1;
      if (right === undefined) return -1;

      if (typeof left === "number" && typeof right === "number") {
        return left - right;
      }

      if (typeof left === "boolean" && typeof right === "boolean") {
        return Number(left) - Number(right);
      }

      return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    };

    sorted.sort((left, right) => {
      const leftValue =
        sortColumn === "timestamp" ? left.timestamp : left.values[sortColumn];
      const rightValue =
        sortColumn === "timestamp" ? right.timestamp : right.values[sortColumn];
      const result = compareValues(leftValue, rightValue);
      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [sortColumn, sortDirection, telemetryRows]);

  const handleSort = (column: string | "timestamp") => {
    if (sortColumn === column) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  };

  const getSortIndicator = (column: string | "timestamp") => {
    if (sortColumn !== column) return "";
    return sortDirection === "asc" ? " ^" : " v";
  };

  return (
    <div className="panel-content">
      <div className="panel-shell">
        <header className="panel-header">
          <h1 className="panel-title">Data Table</h1>
          <p className="panel-subtitle">
            Timestamped telemetry rows from the shared robot data manager.
          </p>
        </header>

        <section className="ui-card">
          <div className="mb-3 grid gap-2">
            <div className="text-sm text-muted-foreground">
              Rows: <span className="font-medium text-foreground">{rows.length}</span>
            </div>
            <button
              className="ui-btn ui-btn-outline w-fit"
              onClick={robotTelemetryManager.clearTelemetry}
              disabled={rows.length === 0}
            >
              Clear Data
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              No telemetry yet. Connect in the Connection panel to start collecting packets.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        className="inline-flex items-center whitespace-nowrap font-semibold"
                        onClick={() => handleSort("timestamp")}
                      >
                        Time{getSortIndicator("timestamp")}
                      </button>
                    </th>
                    {telemetryColumns.map((column) => (
                      <th key={column}>
                        <button
                          type="button"
                          className="inline-flex items-center whitespace-nowrap font-semibold"
                          onClick={() => handleSort(column)}
                        >
                          {column}
                          {getSortIndicator(column)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatTimestamp(row.timestamp)}</td>
                      {telemetryColumns.map((column) => (
                        <td key={`${row.id}-${column}`}>
                          {row.values[column] === undefined ? "-" : String(row.values[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
