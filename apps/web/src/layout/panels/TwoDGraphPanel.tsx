/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useMemo, useState } from "react";
import type { PanelProps } from "../PanelRegistry";
import { useRobotTelemetry } from "../use-robot-telemetry";
import {
  getNumericVariableOptions,
  getNumericVariableValue,
  getSelectedRowEntries,
  PACKET_NUMBER_KEY,
} from "./numeric-variable-utils";

import { SearchableSelect } from "../../components/SearchableSelect";

export const twoDGraphPanelTags = ["chart", "2d", "graph", "visualization", "analysis"];

type ScaleMode = "auto" | "manual";
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

export const TwoDGraphPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } = useRobotTelemetry();
  const variableOptions = useMemo(
    () => getNumericVariableOptions(telemetryColumns),
    [telemetryColumns],
  );

  const [xVariable, setXVariable] = useState(PACKET_NUMBER_KEY);
  const [yVariable, setYVariable] = useState(telemetryColumns[0] ?? PACKET_NUMBER_KEY);
  const [xScaleMode, setXScaleMode] = useState<ScaleMode>("auto");
  const [yScaleMode, setYScaleMode] = useState<ScaleMode>("auto");
  const [xMinInput, setXMinInput] = useState("-72");
  const [xMaxInput, setXMaxInput] = useState("72");
  const [yMinInput, setYMinInput] = useState("-72");
  const [yMaxInput, setYMaxInput] = useState("72");
  const [isFullScale, setIsFullScale] = useState(false);
  const [displayMode, setDisplayMode] = useState<"separate" | "lines">("separate");
  const [fullScreenFitMode, setFullScreenFitMode] = useState<FullScreenFitMode>("fill");

  useEffect(() => {
    if (telemetryColumns.length === 0) return;

    if (!variableOptions.some((option) => option.value === xVariable)) {
      queueMicrotask(() =>
        setXVariable(variableOptions[0]?.value ?? PACKET_NUMBER_KEY),
      );
    }
    if (!variableOptions.some((option) => option.value === yVariable)) {
      queueMicrotask(() =>
        setYVariable(variableOptions[0]?.value ?? PACKET_NUMBER_KEY),
      );
    }
  }, [variableOptions, xVariable, yVariable, telemetryColumns]);

  const selectedEntries = useMemo(
    () => getSelectedRowEntries(telemetryRows, packetSelection),
    [packetSelection, telemetryRows],
  );

  const points = useMemo(
    () =>
      selectedEntries
        .map((entry) => {
          const x = getNumericVariableValue(entry, xVariable);
          const y = getNumericVariableValue(entry, yVariable);
          if (x === null || y === null) return null;
          return { x, y };
        })
        .filter((point): point is { x: number; y: number } => point !== null),
    [selectedEntries, xVariable, yVariable],
  );

  const autoXMin = points.length > 0 ? Math.min(...points.map((point) => point.x)) : -72;
  const autoXMax = points.length > 0 ? Math.max(...points.map((point) => point.x)) : 72;
  const autoYMin = points.length > 0 ? Math.min(...points.map((point) => point.y)) : -72;
  const autoYMax = points.length > 0 ? Math.max(...points.map((point) => point.y)) : 72;

  const manualXMin = parseNumber(xMinInput, autoXMin);
  const manualXMax = parseNumber(xMaxInput, autoXMax);
  const manualYMin = parseNumber(yMinInput, autoYMin);
  const manualYMax = parseNumber(yMaxInput, autoYMax);

  const xLow = xScaleMode === "auto" ? autoXMin : Math.min(manualXMin, manualXMax);
  const xHigh = xScaleMode === "auto" ? autoXMax : Math.max(manualXMin, manualXMax);
  const yLow = yScaleMode === "auto" ? autoYMin : Math.min(manualYMin, manualYMax);
  const yHigh = yScaleMode === "auto" ? autoYMax : Math.max(manualYMin, manualYMax);
  const xSpan = Math.max(xHigh - xLow, Number.EPSILON);
  const ySpan = Math.max(yHigh - yLow, Number.EPSILON);

  const visiblePoints = useMemo(
    () =>
      points.filter(
        (point) =>
          point.x >= xLow && point.x <= xHigh && point.y >= yLow && point.y <= yHigh,
      ),
    [points, xHigh, xLow, yHigh, yLow],
  );

  const chartSize = 620;
  const padding = 58;
  const plotSize = chartSize - padding * 2;
  const toSvgX = (x: number) => padding + ((x - xLow) / xSpan) * plotSize;
  const toSvgY = (y: number) => chartSize - padding - ((y - yLow) / ySpan) * plotSize;

  const xLabel =
    variableOptions.find((option) => option.value === xVariable)?.label ?? xVariable;
  const yLabel =
    variableOptions.find((option) => option.value === yVariable)?.label ?? yVariable;
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
          No points in the selected X/Y ranges for the current packet window.
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
              width={plotSize}
              height={plotSize}
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

            {visiblePoints.map((point, index) => (
              <circle
                key={`${point.x}-${point.y}-${index}`}
                cx={toSvgX(point.x)}
                cy={toSvgY(point.y)}
                r={2.8}
                fill="hsl(var(--primary))"
              >
                <title>{`X: ${point.x.toFixed(4)}, Y: ${point.y.toFixed(4)}`}</title>
              </circle>
            ))}

            {displayMode === "lines" && visiblePoints.length > 1 ? (
              <polyline
                points={visiblePoints
                  .map((point) => `${toSvgX(point.x)},${toSvgY(point.y)}`)
                  .join(" ")}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <title>{`${visiblePoints.length} points connected`}</title>
              </polyline>
            ) : null}

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
            {chartCard}

            <section className="ui-card">
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="ui-label" htmlFor="graph-x-variable">
                      X Variable
                    </label>
                    <SearchableSelect
                      id="graph-x-variable"
                      value={xVariable}
                      onChange={setXVariable}
                      options={variableOptions}
                      placeholder="Select X Variable"
                    />
                  </div>
                  <div>
                    <label className="ui-label" htmlFor="graph-y-variable">
                      Y Variable
                    </label>
                    <SearchableSelect
                      id="graph-y-variable"
                      value={yVariable}
                      onChange={setYVariable}
                      options={variableOptions}
                      placeholder="Select Y Variable"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="ui-label" htmlFor="graph-x-scale-mode">
                      X Scale
                    </label>
                    <select
                      id="graph-x-scale-mode"
                      className="ui-input"
                      value={xScaleMode}
                      onChange={(event) => setXScaleMode(event.target.value as ScaleMode)}
                    >
                      <option value="auto">Auto</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div>
                    <label className="ui-label" htmlFor="graph-y-scale-mode">
                      Y Scale
                    </label>
                    <select
                      id="graph-y-scale-mode"
                      className="ui-input"
                      value={yScaleMode}
                      onChange={(event) => setYScaleMode(event.target.value as ScaleMode)}
                    >
                      <option value="auto">Auto</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                </div>

                {xScaleMode === "manual" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="ui-label" htmlFor="graph-x-min">
                        X Min
                      </label>
                      <input
                        id="graph-x-min"
                        className="ui-input"
                        type="text"
                        inputMode="decimal"
                        value={xMinInput}
                        onChange={(event) =>
                          setXMinInput(sanitizeSignedDecimalInput(event.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="ui-label" htmlFor="graph-x-max">
                        X Max
                      </label>
                      <input
                        id="graph-x-max"
                        className="ui-input"
                        type="text"
                        inputMode="decimal"
                        value={xMaxInput}
                        onChange={(event) =>
                          setXMaxInput(sanitizeSignedDecimalInput(event.target.value))
                        }
                      />
                    </div>
                  </div>
                ) : null}

                {yScaleMode === "manual" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="ui-label" htmlFor="graph-y-min">
                        Y Min
                      </label>
                      <input
                        id="graph-y-min"
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
                      <label className="ui-label" htmlFor="graph-y-max">
                        Y Max
                      </label>
                      <input
                        id="graph-y-max"
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

                <div>
                  <label className="ui-label" htmlFor="graph-display-mode">
                    Render Mode
                  </label>
                  <select
                    id="graph-display-mode"
                    className="ui-input"
                    value={displayMode}
                    onChange={(event) =>
                      setDisplayMode(event.target.value as "separate" | "lines")
                    }
                  >
                    <option value="separate">Keep Dots Separate</option>
                    <option value="lines">Connect Neighboring Dots</option>
                  </select>
                </div>

                <div>
                  <label className="ui-label" htmlFor="graph-fullscreen-fit">
                    Full-Screen Fit
                  </label>
                  <select
                    id="graph-fullscreen-fit"
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
