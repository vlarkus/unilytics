/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from "react";
import { Hash, Film } from "lucide-react";
import type { PanelProps } from "../PanelRegistry";
import { robotTelemetryManager } from "../robot-telemetry-manager";
import { useRobotTelemetry } from "../use-robot-telemetry";
import { useVideoSyncSnapshot } from "../video-sync-manager";

export const packetSelectionPanelTags = ["selection", "packets", "time-window", "analysis"];

const digitsOnly = (value: string) => value.replace(/\D/g, "");
type SelectionType = "range" | "single";
type SingleMode = "number" | "latest" | "video";
type EndSelectionMode = "packet" | "latest" | "video";
type StartSelectionMode = "packet" | "start" | "video";

export const PacketSelectionPanel: React.FC<PanelProps> = () => {
  const { telemetryRows, telemetryColumns, packetSelection } = useRobotTelemetry();
  const { selectedTime: selectedVideoTelemetryTime } = useVideoSyncSnapshot();
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
  const [startMode, setStartMode] = useState<StartSelectionMode>("packet");
  const [endMode, setEndMode] = useState<EndSelectionMode>(
    endFollowsLatest ? "latest" : "packet",
  );
  const [selectionType, setSelectionType] = useState<SelectionType>("range");
  const [singleInput, setSingleInput] = useState(String(startPacketNumber));
  const [singleMode, setSingleMode] = useState<SingleMode>("number");

  useEffect(() => {
    setStartInput(String(startPacketNumber));
  }, [startPacketNumber]);

  useEffect(() => {
    setEndInput(String(endPacketNumber));
  }, [endPacketNumber]);

  useEffect(() => {
    if (endFollowsLatest) {
      setEndMode("latest");
    }
  }, [endFollowsLatest]);

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

  const commitSingleInput = () => {
    const clamped = clampPacketNumber(singleInput, startPacketNumber);
    setSingleInput(String(clamped));
    robotTelemetryManager.setPacketSelectionStartByPacketNumber(clamped);
    robotTelemetryManager.setPacketSelectionEndByPacketNumber(clamped);
  };

  const applyVideoStartSelection = () => {
    if (rowCount === 0) return;
    if (selectedVideoTelemetryTime === null || !Number.isFinite(selectedVideoTelemetryTime)) {
      return;
    }

    let targetIndex = 0;
    for (let i = 0; i < telemetryRows.length; i += 1) {
      if (telemetryRows[i].timestamp <= selectedVideoTelemetryTime) {
        targetIndex = i;
      } else {
        break;
      }
    }
    robotTelemetryManager.setPacketSelectionStartByIndex(targetIndex);
  };

  const applyVideoEndSelection = () => {
    if (rowCount === 0) return;
    if (selectedVideoTelemetryTime === null || !Number.isFinite(selectedVideoTelemetryTime)) {
      return;
    }

    let targetIndex = 0;
    for (let i = 0; i < telemetryRows.length; i += 1) {
      if (telemetryRows[i].timestamp <= selectedVideoTelemetryTime) {
        targetIndex = i;
      } else {
        break;
      }
    }
    robotTelemetryManager.setPacketSelectionEndByIndex(targetIndex);
  };

  useEffect(() => {
    if (startMode === "start") {
      if (packetSelection.startIndex !== 0) {
        robotTelemetryManager.setPacketSelectionStartByIndex(0);
      }
    }
    if (startMode === "video") {
      applyVideoStartSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMode, selectedVideoTelemetryTime, rowCount, packetSelection.startIndex]);

  useEffect(() => {
    if (endMode !== "video") return;
    applyVideoEndSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endMode, selectedVideoTelemetryTime, rowCount]);

  const applyVideoSingleSelection = () => {
    if (rowCount === 0) return;
    if (selectedVideoTelemetryTime === null || !Number.isFinite(selectedVideoTelemetryTime)) return;
    let idx = 0;
    for (let i = 0; i < telemetryRows.length; i += 1) {
      if (telemetryRows[i].timestamp <= selectedVideoTelemetryTime) idx = i;
      else break;
    }
    robotTelemetryManager.setPacketSelectionStartByIndex(idx);
    robotTelemetryManager.setPacketSelectionEndByIndex(idx);
  };

  useEffect(() => {
    if (selectionType !== "single") return;
    if (singleMode === "latest") {
      robotTelemetryManager.setPacketSelectionEndByIndex(maxIndex);
      robotTelemetryManager.setPacketSelectionStartByIndex(maxIndex);
    } else if (singleMode === "video") {
      applyVideoSingleSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleMode, selectionType, selectedVideoTelemetryTime, rowCount, maxIndex]);

  const startPercent = maxIndex > 0 ? (startIndex / maxIndex) * 100 : 0;
  const endPercent = maxIndex > 0 ? (endIndex / maxIndex) * 100 : 0;
  const startLocked = startMode !== "packet";
  const endLocked = endMode !== "packet";
  const effectiveStartPercent = startLocked ? 0 : startPercent;
  const effectiveEndPercent = endLocked ? 100 : endPercent;
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
        <section className="ui-card">
          {rowCount === 0 ? (
            <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              No packets available yet. Connect to robot telemetry or generate
              random data first.
            </div>
          ) : (
            <div className="grid gap-4">
              {/* Mode toggle */}
              <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Selection mode">
                {(["range", "single"] as SelectionType[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className="flex-1 py-1.5 text-xs font-semibold capitalize transition-colors"
                    style={{
                      background: selectionType === mode ? "hsl(var(--primary))" : "transparent",
                      color: selectionType === mode ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                      border: "none",
                    }}
                    onClick={() => {
                      setSelectionType(mode);
                      if (mode === "single") {
                        // Collapse to single: pin both ends to the current start
                        const n = startPacketNumber || 1;
                        setSingleInput(String(n));
                        robotTelemetryManager.setPacketSelectionEndByPacketNumber(n);
                        robotTelemetryManager.setPacketSelectionStartByPacketNumber(n);
                      }
                    }}
                  >
                    {mode === "range" ? "Range" : "Single Packet"}
                  </button>
                ))}
              </div>

              {selectionType === "single" ? (
                <div className="grid gap-3">
                  <label className="ui-label" htmlFor="packet-single">Packet</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="packet-single"
                      type="text"
                      inputMode="numeric"
                      className="ui-input"
                      disabled={singleMode !== "number"}
                      value={singleMode === "latest" ? String(maxPacketNumber) : singleMode === "video" ? String(startPacketNumber) : singleInput}
                      onChange={(e) => setSingleInput(digitsOnly(e.target.value))}
                      onBlur={commitSingleInput}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitSingleInput(); } }}
                    />
                    <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
                      <button
                        type="button"
                        className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                        aria-label="Select by packet number"
                        title="Select by packet number"
                        onClick={() => setSingleMode("number")}
                        style={{
                          backgroundColor: singleMode === "number" ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                          color: singleMode === "number" ? "hsl(var(--primary-foreground))" : "hsl(var(--secondary-foreground))",
                          boxShadow: "none",
                        }}
                      >
                        <Hash size={16} />
                      </button>
                      <button
                        type="button"
                        className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                        aria-label="Always show latest packet"
                        title="Always show latest packet"
                        onClick={() => setSingleMode("latest")}
                        style={{
                          backgroundColor: singleMode === "latest" ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                          color: singleMode === "latest" ? "hsl(var(--primary-foreground))" : "hsl(var(--secondary-foreground))",
                          boxShadow: "none",
                        }}
                      >
                        <i className="fa-solid fa-flag-checkered" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                        aria-label="Set by video time"
                        title="Set by video time"
                        onClick={() => setSingleMode("video")}
                        style={{
                          backgroundColor: singleMode === "video" ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                          color: singleMode === "video" ? "hsl(var(--primary-foreground))" : "hsl(var(--secondary-foreground))",
                          boxShadow: "none",
                        }}
                      >
                        <Film size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {singleMode === "latest"
                      ? `Latest — Packet #${maxPacketNumber}`
                      : singleMode === "video"
                        ? `Video sync — Packet #${startPacketNumber}`
                        : `Packet #${startPacketNumber}`}
                    {" "}&mdash; {formatTimestamp(startPacket?.timestamp)}
                  </div>
                  {singleMode === "number" && (
                    <input
                      className="ui-range"
                      type="range"
                      min={0}
                      max={maxIndex}
                      step={1}
                      value={startIndex}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        setSingleInput(String(idx + 1));
                        robotTelemetryManager.setPacketSelectionStartByIndex(idx);
                        robotTelemetryManager.setPacketSelectionEndByIndex(idx);
                      }}
                    />
                  )}
                </div>
              ) : (
                /* ── Range picker (existing UI) ── */
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>

                  <div>
                    <label className="ui-label" htmlFor="packet-start">
                      Start Packet
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="packet-start"
                        type="text"
                        inputMode="numeric"
                        className="ui-input"
                        value={startInput}
                        disabled={startMode !== "packet"}
                        onChange={(event) => setStartInput(digitsOnly(event.target.value))}
                        onBlur={commitStartInput}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitStartInput();
                          }
                        }}
                      />
                      <div className="flex shrink-0 overflow-hidden rounded-md">
                        <button
                          type="button"
                          className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                          aria-label="Select start packet number"
                          title="Select start packet number"
                          onClick={() => {
                            setStartMode("packet");
                          }}
                          style={{
                            backgroundColor:
                              startMode === "packet"
                                ? "hsl(var(--primary))"
                                : "hsl(var(--secondary))",
                            color:
                              startMode === "packet"
                                ? "hsl(var(--primary-foreground))"
                                : "hsl(var(--secondary-foreground))",
                            boxShadow: "none",
                          }}
                        >
                          <Hash size={16} />
                        </button>
                        <button
                          type="button"
                          className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                          aria-label="Start from beginning"
                          title="Start from beginning"
                          onClick={() => {
                            setStartMode("start");
                            robotTelemetryManager.setPacketSelectionStartByIndex(0);
                          }}
                          style={{
                            backgroundColor:
                              startMode === "start"
                                ? "hsl(var(--primary))"
                                : "hsl(var(--secondary))",
                            color:
                              startMode === "start"
                                ? "hsl(var(--primary-foreground))"
                                : "hsl(var(--secondary-foreground))",
                            boxShadow: "none",
                          }}
                        >
                          <i className="fa-solid fa-flag-checkered" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                          aria-label="Set start packet by current video time"
                          title="Set start packet by current video time"
                          onClick={() => {
                            setStartMode("video");
                            applyVideoStartSelection();
                          }}
                          style={{
                            backgroundColor:
                              startMode === "video"
                                ? "hsl(var(--primary))"
                                : "hsl(var(--secondary))",
                            color:
                              startMode === "video"
                                ? "hsl(var(--primary-foreground))"
                                : "hsl(var(--secondary-foreground))",
                            boxShadow: "none",
                          }}
                        >
                          <Film size={16} />
                        </button>
                      </div>
                    </div>
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
                        disabled={endMode !== "packet"}
                        onChange={(event) => setEndInput(digitsOnly(event.target.value))}
                        onBlur={commitEndInput}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitEndInput();
                          }
                        }}
                      />
                      <div className="flex shrink-0 overflow-hidden rounded-md">
                        <button
                          type="button"
                          className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                          aria-label="Select finish packet number"
                          title="Select finish packet number"
                          onClick={() => {
                            setEndMode("packet");
                            robotTelemetryManager.setPacketSelectionFollowLatest(false);
                          }}
                          style={{
                            backgroundColor:
                              endMode === "packet"
                                ? "hsl(var(--primary))"
                                : "hsl(var(--secondary))",
                            color:
                              endMode === "packet"
                                ? "hsl(var(--primary-foreground))"
                                : "hsl(var(--secondary-foreground))",
                            boxShadow: "none",
                          }}
                        >
                          <Hash size={16} />
                        </button>
                        <button
                          type="button"
                          className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                          aria-label="Follow latest finish packet"
                          title="Follow latest finish packet"
                          onClick={() => {
                            setEndMode("latest");
                            robotTelemetryManager.setPacketSelectionFollowLatest(true);
                          }}
                          style={{
                            backgroundColor:
                              endMode === "latest"
                                ? "hsl(var(--primary))"
                                : "hsl(var(--secondary))",
                            color:
                              endMode === "latest"
                                ? "hsl(var(--primary-foreground))"
                                : "hsl(var(--secondary-foreground))",
                            boxShadow: "none",
                          }}
                        >
                          <i className="fa-solid fa-flag-checkered" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="ui-btn h-8 w-8 p-0 rounded-none border-0"
                          aria-label="Set finish packet by current video time"
                          title="Set finish packet by current video time"
                          onClick={() => {
                            setEndMode("video");
                            robotTelemetryManager.setPacketSelectionFollowLatest(false);
                            applyVideoEndSelection();
                          }}
                          style={{
                            backgroundColor:
                              endMode === "video"
                                ? "hsl(var(--primary))"
                                : "hsl(var(--secondary))",
                            color:
                              endMode === "video"
                                ? "hsl(var(--primary-foreground))"
                                : "hsl(var(--secondary-foreground))",
                            boxShadow: "none",
                          }}
                        >
                          <Film size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectionType === "range" && (
                <div className="grid gap-2">
                  <div className="ui-range-dual">
                    <div className="ui-range-dual-track" />
                    <div
                      className="ui-range-dual-range"
                      style={{
                        left: `${effectiveStartPercent}%`,
                        width: `${Math.max(effectiveEndPercent - effectiveStartPercent, 0)}%`,
                      }}
                    />
                    <input
                      className={`ui-range-dual-input ui-range-dual-input-start ${startLocked ? "hidden" : ""
                        }`}
                      type="range"
                      min={0}
                      max={maxIndex}
                      step={1}
                      value={startIndex}
                      disabled={startLocked}
                      onChange={(event) =>
                        robotTelemetryManager.setPacketSelectionStartByIndex(
                          Number(event.target.value),
                        )
                      }
                    />
                    <input
                      className={`ui-range-dual-input ui-range-dual-input-end ${endLocked ? "ui-range-dual-input-end-hidden" : ""
                        }`}
                      type="range"
                      min={0}
                      max={maxIndex}
                      step={1}
                      value={endIndex}
                      disabled={endLocked}
                      onChange={(event) =>
                        robotTelemetryManager.setPacketSelectionEndByIndex(
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {startMode === "start"
                        ? "Start: Start"
                        : startMode === "video"
                          ? `Start: Video (#${startPacketNumber})`
                          : `Start: #${startPacketNumber}`}
                    </span>
                    <span>
                      {endMode === "latest"
                        ? "Finish: Latest"
                        : endMode === "video"
                          ? `Finish: Video (#${endPacketNumber})`
                          : `Finish: #${endPacketNumber}`}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Active packets: {activePacketCount} / {rowCount}
                  </div>
                </div>
              )}


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
                      <td>
                        {startMode === "start"
                          ? "Start"
                          : startMode === "video"
                            ? `${startPacketNumber} (Video)`
                            : startPacketNumber}
                      </td>
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
                      <td>
                        {endMode === "latest"
                          ? "Latest"
                          : endMode === "video"
                            ? `${endPacketNumber} (Video)`
                            : endPacketNumber}
                      </td>
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

