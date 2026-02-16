import React from "react";
import type { PanelProps } from "../PanelRegistry";
import { robotTelemetryManager } from "../robot-telemetry-manager";
import { useRobotTelemetry } from "../use-robot-telemetry";

export const robotConnectionPanelTags = ["network", "robot", "connection", "io"];

export const RobotConnectionPanel: React.FC<PanelProps> = () => {
  const { connectionStatus, ipAddress, streamPaused } = useRobotTelemetry();

  const isConnecting = connectionStatus === "connecting";
  const isConnected = connectionStatus === "connected";
  const isDisconnectMode = isConnecting || isConnected;
  const buttonTitle = isDisconnectMode ? "Disconnect" : "Connect";

  const ipStatusColor = isConnected
    ? "hsl(var(--success))"
    : isConnecting
      ? "hsl(var(--warning))"
      : "hsl(var(--error))";
  const ipStatusFill = isConnected
    ? "hsl(var(--success) / 0.15)"
    : isConnecting
      ? "hsl(var(--warning) / 0.15)"
      : "hsl(var(--error) / 0.15)";

  return (
    <div className="panel-content">
      <div className="panel-shell">
        <div className="flex items-center gap-2">
          <input
            id="robot-ip"
            className="ui-input flex-1 max-w-30 min-w-30"
            inputMode="decimal"
            autoComplete="off"
            placeholder="192.168.43.1"
            value={ipAddress}
            onChange={(e) => robotTelemetryManager.setIpAddress(e.target.value)}
            style={{
              borderColor: ipStatusColor,
              backgroundColor: ipStatusFill,
              color: ipStatusColor,
              boxShadow: `0 0 0 1px ${ipStatusColor}40`,
            }}
          />
          <button
            type="button"
            className="ui-btn p-0 text-base font-bold"
            onClick={robotTelemetryManager.toggleConnection}
            title={buttonTitle}
            aria-label={buttonTitle}
            style={{
              width: "2.5rem",
              height: "2.5rem",
              minWidth: "2.5rem",
              minHeight: "2.5rem",
              maxWidth: "2.5rem",
              maxHeight: "2.5rem",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              backgroundColor: isDisconnectMode
                ? "hsl(var(--error))"
                : "hsl(var(--success))",
              color: "#ffffff",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "relative",
                display: "inline-flex",
                width: "1rem",
                height: "1rem",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fa-solid fa-wifi" style={{ fontSize: "0.95rem", lineHeight: 1 }} />
              {isDisconnectMode ? (
                <i
                  className="fa-solid fa-circle-xmark"
                  style={{
                    position: "absolute",
                    right: "-0.35rem",
                    bottom: "-0.35rem",
                    fontSize: "0.62rem",
                    lineHeight: 1,
                  }}
                />
              ) : null}
            </span>
          </button>
          {isConnected ? (
            <button
              type="button"
              className="ui-btn h-10 w-10 p-0 text-base"
              onClick={robotTelemetryManager.toggleStreamPaused}
              title={streamPaused ? "Resume packets" : "Pause packets"}
              aria-label={streamPaused ? "Resume packets" : "Pause packets"}
              style={{
                backgroundColor: streamPaused
                  ? "hsl(var(--success))"
                  : "hsl(var(--warning))",
                color: "#ffffff",
                borderColor: "transparent",
              }}
            >
              <i
                className={`fa-solid ${streamPaused ? "fa-play" : "fa-pause"}`}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
