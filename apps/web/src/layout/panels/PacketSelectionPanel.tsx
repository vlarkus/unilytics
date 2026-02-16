/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from "react";
import type { PanelProps } from "../PanelRegistry";
import { robotTelemetryManager } from "../robot-telemetry-manager";
import { useRobotTelemetry } from "../use-robot-telemetry";

export const packetSelectionPanelTags = ["selection", "packets", "time-window", "analysis"];

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const PacketSelectionPanel: React.FC<PanelProps> = () => {
  const { telemetryRows, telemetryColumns, packetSelection } = useRobotTelemetry();
  const rowCount = telemetryRows.length;
  const maxIndex = Math.max(0, rowCount - 1);

  const startIndex = Math.min(packetSelection.startIndex, maxIndex);
  const endIndex = Math.min(packetSelection.endIndex, maxIndex);
  const endFollowsLatest = packetSelection.endFollowsLatest;

  const minPacketNumber = rowCount > 0 ? 1 : 0;
  const maxPacketNumber = rowCount;
  const startPacketNumber = rowCount > 0 ? startIndex + 1 : 0;
  const endPacketNumber = rowCount > 0 ? endIndex + 1 : 0;
  const startPacket = telemetryRows[startIndex];
  const endPacket = telemetryRows[endIndex];

  const [startInput, setStartInput] = useState(String(startPacketNumber));
  const [endInput, setEndInput] = useState(String(endPacketNumber));

  useEffect(() => {
    setStartInput(String(startPacketNumber));
  }, [startPacketNumber]);

  useEffect(() => {
    setEndInput(String(endPacketNumber));
  }, [endPacketNumber]);

  const clampPacketNumber = (rawValue: string, fallback: number) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.round(parsed), minPacketNumber), maxPacketNumber);
  };

  const commitStartInput = () => {
    const clamped = clampPacketNumber(startInput, startPacketNumber);
    setStartInput(String(clamped));
    robotTelemetryManager.setPacketSelectionStartByPacketNumber(clamped);
  };

  const commitEndInput = () => {
    const clamped = clampPacketNumber(endInput, endPacketNumber);
    setEndInput(String(clamped));
    robotTelemetryManager.setPacketSelectionEndByPacketNumber(clamped);
  };

  const startPercent = maxIndex > 0 ? (startIndex / maxIndex) * 100 : 0;
  const endPercent = maxIndex > 0 ? (endIndex / maxIndex) * 100 : 0;
  const effectiveEndPercent = endFollowsLatest ? 100 : endPercent;
  const activePacketCount = rowCount > 0 ? endIndex - startIndex + 1 : 0;
  const formatTimestamp = (timestamp: number | undefined) =>
    timestamp === undefined
      ? "-"
      : new Date(timestamp).toLocaleString([], {
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

  return (
    <div className="panel-content">
      <div className="panel-shell">
        <header className="panel-header">
          <h1 className="panel-title">Select Packets</h1>
          <p className="panel-subtitle">
            Select active packets by packet number (ordered by telemetry time).
          </p>
        </header>

        <section className="ui-card">
          {rowCount === 0 ? (
            <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              No packets available yet. Connect to robot telemetry or generate
              random data first.
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="ui-label" htmlFor="packet-start">
                    Start Packet
                  </label>
                  <input
                    id="packet-start"
                    type="text"
                    inputMode="numeric"
                    className="ui-input"
                    value={startInput}
                    onChange={(event) => setStartInput(digitsOnly(event.target.value))}
                    onBlur={commitStartInput}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitStartInput();
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="ui-label" htmlFor="packet-end">
                    Finish Packet
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="packet-end"
                      type="text"
                      inputMode="numeric"
                      className="ui-input"
                      value={endInput}
                      disabled={endFollowsLatest}
                      onChange={(event) => setEndInput(digitsOnly(event.target.value))}
                      onBlur={commitEndInput}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitEndInput();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="ui-btn h-10 w-10 p-0"
                      aria-label="Follow latest finish packet"
                      title="Follow latest finish packet"
                      onClick={() =>
                        robotTelemetryManager.setPacketSelectionFollowLatest(
                          !endFollowsLatest,
                        )
                      }
                      style={{
                        backgroundColor: endFollowsLatest
                          ? "hsl(var(--primary))"
                          : "hsl(var(--secondary))",
                        color: endFollowsLatest
                          ? "hsl(var(--primary-foreground))"
                          : "hsl(var(--secondary-foreground))",
                        borderColor: "transparent",
                        boxShadow: "none",
                      }}
                    >
                      <i className="fa-solid fa-flag-checkered" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="ui-range-dual">
                  <div className="ui-range-dual-track" />
                  <div
                    className="ui-range-dual-range"
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(effectiveEndPercent - startPercent, 0)}%`,
                    }}
                  />
                  <input
                    className="ui-range-dual-input ui-range-dual-input-start"
                    type="range"
                    min={0}
                    max={maxIndex}
                    step={1}
                    value={startIndex}
                    onChange={(event) =>
                      robotTelemetryManager.setPacketSelectionStartByIndex(
                        Number(event.target.value),
                      )
                    }
                  />
                  <input
                    className={`ui-range-dual-input ui-range-dual-input-end ${
                      endFollowsLatest ? "ui-range-dual-input-end-hidden" : ""
                    }`}
                    type="range"
                    min={0}
                    max={maxIndex}
                    step={1}
                    value={endIndex}
                    disabled={endFollowsLatest}
                    onChange={(event) =>
                      robotTelemetryManager.setPacketSelectionEndByIndex(
                        Number(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Start: #{startPacketNumber}</span>
                  <span>{endFollowsLatest ? "Finish: Latest" : `Finish: #${endPacketNumber}`}</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Active packets: {activePacketCount} / {rowCount}
                </div>
              </div>

              <div className="overflow-auto">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Selection</th>
                      <th>Packet #</th>
                      <th>Timestamp</th>
                      <th>Packet ID</th>
                      {telemetryColumns.map((column) => (
                        <th key={`header-${column}`}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Start</td>
                      <td>{startPacketNumber}</td>
                      <td>{formatTimestamp(startPacket?.timestamp)}</td>
                      <td>{startPacket?.id ?? "-"}</td>
                      {telemetryColumns.map((column) => (
                        <td key={`start-${column}`}>
                          {startPacket?.values[column] === undefined
                            ? "-"
                            : String(startPacket.values[column])}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Finish</td>
                      <td>{endFollowsLatest ? "Latest" : endPacketNumber}</td>
                      <td>{formatTimestamp(endPacket?.timestamp)}</td>
                      <td>{endPacket?.id ?? "-"}</td>
                      {telemetryColumns.map((column) => (
                        <td key={`end-${column}`}>
                          {endPacket?.values[column] === undefined
                            ? "-"
                            : String(endPacket.values[column])}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
