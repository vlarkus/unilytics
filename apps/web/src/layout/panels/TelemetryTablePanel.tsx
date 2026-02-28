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
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      // Add any new columns that aren't already tracked
      telemetryColumns.forEach((col) => {
        if (!prev.has(col)) {
          next.add(col);
        }
      });
      return next;
    });
  }, [telemetryColumns]);

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
        <section className="ui-card mb-4">
          <div className="ui-card-title">Column Configuration</div>
          {telemetryColumns.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No columns available to configure.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-btn ui-btn-outline text-xs"
                onClick={() => setVisibleColumns(new Set(telemetryColumns))}
              >
                Select All
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-outline text-xs"
                onClick={() => setVisibleColumns(new Set())}
              >
                Deselect All
              </button>
              <div className="w-full border-t border-border my-1" />
              {telemetryColumns.map((column) => (
                <button
                  key={column}
                  type="button"
                  className={`ui-btn text-xs ${visibleColumns.has(column)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "ui-btn-outline opacity-50 hover:opacity-100"
                    }`}
                  onClick={() => {
                    const next = new Set(visibleColumns);
                    if (next.has(column)) {
                      next.delete(column);
                    } else {
                      next.add(column);
                    }
                    setVisibleColumns(next);
                  }}
                >
                  {column}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="ui-card overflow-hidden flex flex-col min-h-0">
          <div className="mb-3 grid gap-2 flex-shrink-0">
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
            <div className="overflow-auto flex-1 min-h-0">
              <table className="ui-table">
                <thead className="sticky top-0 bg-card z-10 shadow-sm">
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
                    {telemetryColumns
                      .filter((col) => visibleColumns.has(col))
                      .map((column) => (
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
                      {telemetryColumns
                        .filter((col) => visibleColumns.has(col))
                        .map((column) => (
                          <td key={`${row.id}-${column}`}>
                            {row.values[column] === undefined
                              ? "-"
                              : String(row.values[column])}
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

