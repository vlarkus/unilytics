import React from "react";
import type { PanelProps } from "../PanelRegistry";
import { robotTelemetryManager } from "../robot-telemetry-manager";
import { useRobotTelemetry } from "../use-robot-telemetry";

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const TelemetryTablePanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows } = useRobotTelemetry();
  const rows = [...telemetryRows].reverse();

  return (
    <div className="panel-content">
      <div className="panel-shell">
        <header className="panel-header">
          <h1 className="panel-title">Telemetry Table</h1>
          <p className="panel-subtitle">
            Timestamped telemetry rows from the shared robot data manager.
          </p>
        </header>

        <section className="ui-card">
          <div className="mb-3 grid gap-2">
            <div className="text-sm text-muted-foreground">
              Rows: <span className="font-medium text-foreground">{rows.length}</span>
            </div>
            <div className="flex items-center justify-start gap-2">
              <button
                className="ui-btn ui-btn-secondary"
                onClick={robotTelemetryManager.generateRandomTelemetrySample}
              >
                Generate Random Data
              </button>
              <button
                className="ui-btn ui-btn-outline"
                onClick={robotTelemetryManager.clearTelemetry}
                disabled={rows.length === 0}
              >
                Clear Data
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              No telemetry yet. Connect in the Robot Connection panel or use
              "Generate Random Data" to seed test rows.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    {telemetryColumns.map((column) => (
                      <th key={column}>{column}</th>
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
