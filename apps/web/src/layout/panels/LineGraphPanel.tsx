/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useMemo, useState } from "react";
import type { PanelProps } from "../PanelRegistry";
import { useRobotTelemetry } from "../use-robot-telemetry";
import {
  getNumericVariableOptions,
  getNumericVariableValue,
  getSelectedRowEntries,
  PACKET_NUMBER_KEY,
  TIMESTAMP_KEY,
} from "./numeric-variable-utils";

export const lineGraphPanelTags = ["chart", "line", "timeseries", "analysis"];

type ScaleMode = "auto" | "manual";
type XAxisMode = typeof PACKET_NUMBER_KEY | typeof TIMESTAMP_KEY;
type FullScreenFitMode = "fill" | "square";

const sanitizeSignedDecimalInput = (value: string) => {
  const hasLeadingMinus = value.trimStart().startsWith("-");
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [first, ...rest] = cleaned.split(".");
  const normalized = rest.length === 0 ? first : `${first}.${rest.join("")}`;
  return hasLeadingMinus ? `-${normalized}` : normalized;
};

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const LineGraphPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } = useRobotTelemetry();
  const variableOptions = useMemo(
    () => getNumericVariableOptions(telemetryColumns),
    [telemetryColumns],
  );

  const [xAxisMode, setXAxisMode] = useState<XAxisMode>(TIMESTAMP_KEY);
  const [yVariable, setYVariable] = useState(telemetryColumns[0] ?? PACKET_NUMBER_KEY);
  const [yScaleMode, setYScaleMode] = useState<ScaleMode>("auto");
  const [yMinInput, setYMinInput] = useState("-100");
  const [yMaxInput, setYMaxInput] = useState("100");
  const [showPoints, setShowPoints] = useState(true);
  const [isFullScale, setIsFullScale] = useState(false);
  const [fullScreenFitMode, setFullScreenFitMode] = useState<FullScreenFitMode>("fill");

  useEffect(() => {
    if (!variableOptions.some((option) => option.value === yVariable)) {
      queueMicrotask(() =>
        setYVariable(variableOptions[0]?.value ?? PACKET_NUMBER_KEY),
      );
    }
  }, [variableOptions, yVariable]);

  const selectedEntries = useMemo(
    () => getSelectedRowEntries(telemetryRows, packetSelection),
    [packetSelection, telemetryRows],
  );

  const points = useMemo(
    () =>
      selectedEntries
        .map((entry) => {
          const x = xAxisMode === TIMESTAMP_KEY ? entry.row.timestamp : entry.packetNumber;
          const y = getNumericVariableValue(entry, yVariable);
          if (y === null) return null;
          return { x, y };
        })
        .filter((point): point is { x: number; y: number } => point !== null),
    [selectedEntries, xAxisMode, yVariable],
  );

  const xMin = points.length > 0 ? Math.min(...points.map((point) => point.x)) : 0;
  const xMax = points.length > 0 ? Math.max(...points.map((point) => point.x)) : 1;
  const yAutoMin = points.length > 0 ? Math.min(...points.map((point) => point.y)) : -100;
  const yAutoMax = points.length > 0 ? Math.max(...points.map((point) => point.y)) : 100;
  const yManualMin = parseNumber(yMinInput, yAutoMin);
  const yManualMax = parseNumber(yMaxInput, yAutoMax);
  const yMin = yScaleMode === "auto" ? yAutoMin : Math.min(yManualMin, yManualMax);
  const yMax = yScaleMode === "auto" ? yAutoMax : Math.max(yManualMin, yManualMax);
  const xSpan = Math.max(xMax - xMin, Number.EPSILON);
  const ySpan = Math.max(yMax - yMin, Number.EPSILON);

  const visiblePoints = useMemo(
    () => points.filter((point) => point.y >= yMin && point.y <= yMax),
    [points, yMax, yMin],
  );

  const chartSize = 700;
  const padding = 62;
  const plotWidth = chartSize - padding * 2;
  const plotHeight = chartSize - padding * 2;

  const toSvgX = (x: number) => padding + ((x - xMin) / xSpan) * plotWidth;
  const toSvgY = (y: number) => chartSize - padding - ((y - yMin) / ySpan) * plotHeight;

  const xLabel = xAxisMode === TIMESTAMP_KEY ? "Timestamp (ms)" : "Packet Number";
  const yLabel = variableOptions.find((option) => option.value === yVariable)?.label ?? yVariable;
  const isStretchFill = isFullScale && fullScreenFitMode === "fill";

  const chartCard = (
    <section
      className={`ui-card relative ${isFullScale ? "h-full p-0 overflow-hidden border-0" : ""}`}
    >
      <button
        type="button"
        className="ui-btn absolute right-3 top-3 z-10 h-8 w-8 p-0"
        aria-label={isFullScale ? "Exit full scale" : "Enter full scale"}
        title={isFullScale ? "Exit full scale" : "Enter full scale"}
        onClick={() => setIsFullScale((value) => !value)}
        style={{
          border: "none",
          backgroundColor: "hsl(var(--secondary) / 0.85)",
          color: "hsl(var(--foreground))",
        }}
      >
        <i className={`fa-solid ${isFullScale ? "fa-compress" : "fa-expand"}`} aria-hidden="true" />
      </button>

      {visiblePoints.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No numeric values available for the selected variable/range.
        </div>
      ) : (
        <div className={isFullScale ? "h-full w-full relative" : "w-full relative"}>
          <svg
            viewBox={`0 0 ${chartSize} ${chartSize}`}
            preserveAspectRatio={
              isFullScale && fullScreenFitMode === "fill"
                ? "none"
                : "xMidYMid meet"
            }
            className={
              isFullScale
                ? "block h-full w-full bg-transparent"
                : "block h-auto w-full max-h-[72vh] bg-transparent"
            }
          >
            <rect
              x={padding}
              y={padding}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              stroke="hsl(var(--foreground) / 0.35)"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={chartSize - padding}
              x2={chartSize - padding}
              y2={chartSize - padding}
              stroke="hsl(var(--foreground) / 0.65)"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={chartSize - padding}
              stroke="hsl(var(--foreground) / 0.65)"
              strokeWidth="1"
            />

            {visiblePoints.length > 1 ? (
              <polyline
                points={visiblePoints
                  .map((point) => `${toSvgX(point.x)},${toSvgY(point.y)}`)
                  .join(" ")}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <title>{`${visiblePoints.length} points connected`}</title>
              </polyline>
            ) : null}

            {showPoints
              ? visiblePoints.map((point, index) => (
                  <circle
                    key={`${point.x}-${point.y}-${index}`}
                    cx={toSvgX(point.x)}
                    cy={toSvgY(point.y)}
                    r={2.4}
                    fill="hsl(var(--primary))"
                  >
                    <title>{`X: ${point.x.toFixed(4)}, Y: ${point.y.toFixed(4)}`}</title>
                  </circle>
                ))
              : null}

            {!isStretchFill ? (
              <>
                <text
                  x={chartSize / 2}
                  y={chartSize - 18}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="12"
                >
                  {xLabel}
                </text>
                <text
                  x={20}
                  y={chartSize / 2}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="12"
                  transform={`rotate(-90 20 ${chartSize / 2})`}
                >
                  {yLabel}
                </text>
              </>
            ) : null}
          </svg>
          {isStretchFill ? (
            <>
              <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-foreground">
                {xLabel}
              </div>
              <div className="pointer-events-none absolute left-2 top-2 text-xs text-foreground">
                Y: {yLabel}
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );

  return (
    <div className="panel-content">
      <div className={`panel-shell ${isFullScale ? "h-full p-0 gap-0" : ""}`}>
        {!isFullScale ? (
          <>
            <header className="panel-header">
              <h1 className="panel-title">Line Graph</h1>
              <p className="panel-subtitle">
                Plot one variable over packet number or timestamp.
              </p>
            </header>

            {chartCard}

            <section className="ui-card">
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="ui-label" htmlFor="line-x-mode">
                      X Axis
                    </label>
                    <select
                      id="line-x-mode"
                      className="ui-input"
                      value={xAxisMode}
                      onChange={(event) => setXAxisMode(event.target.value as XAxisMode)}
                    >
                      <option value={TIMESTAMP_KEY}>Timestamp</option>
                      <option value={PACKET_NUMBER_KEY}>Packet Number</option>
                    </select>
                  </div>
                  <div>
                    <label className="ui-label" htmlFor="line-y-variable">
                      Y Variable
                    </label>
                    <select
                      id="line-y-variable"
                      className="ui-input"
                      value={yVariable}
                      onChange={(event) => setYVariable(event.target.value)}
                    >
                      {variableOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="ui-label" htmlFor="line-y-scale-mode">
                    Y Scale
                  </label>
                  <select
                    id="line-y-scale-mode"
                    className="ui-input"
                    value={yScaleMode}
                    onChange={(event) => setYScaleMode(event.target.value as ScaleMode)}
                  >
                    <option value="auto">Auto</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                {yScaleMode === "manual" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="ui-label" htmlFor="line-y-min">
                        Y Min
                      </label>
                      <input
                        id="line-y-min"
                        className="ui-input"
                        type="text"
                        inputMode="decimal"
                        value={yMinInput}
                        onChange={(event) =>
                          setYMinInput(sanitizeSignedDecimalInput(event.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="ui-label" htmlFor="line-y-max">
                        Y Max
                      </label>
                      <input
                        id="line-y-max"
                        className="ui-input"
                        type="text"
                        inputMode="decimal"
                        value={yMaxInput}
                        onChange={(event) =>
                          setYMaxInput(sanitizeSignedDecimalInput(event.target.value))
                        }
                      />
                    </div>
                  </div>
                ) : null}

                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={showPoints}
                    onChange={(event) => setShowPoints(event.target.checked)}
                  />
                  Show Points
                </label>

                <div>
                  <label className="ui-label" htmlFor="line-fullscreen-fit">
                    Full-Screen Fit
                  </label>
                  <select
                    id="line-fullscreen-fit"
                    className="ui-input"
                    value={fullScreenFitMode}
                    onChange={(event) =>
                      setFullScreenFitMode(event.target.value as FullScreenFitMode)
                    }
                  >
                    <option value="fill">Fill Available Space</option>
                    <option value="square">Keep Square</option>
                  </select>
                </div>
              </div>
            </section>
          </>
        ) : (
          chartCard
        )}
      </div>
    </div>
  );
};
