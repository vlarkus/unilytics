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

export const heatmapPanelTags = ["chart", "heatmap", "grid", "analysis"];

const computeBounds = (
  arr: { x: number; y: number }[],
  defaults: { xMin: number; xMax: number; yMin: number; yMax: number },
) => {
  if (arr.length === 0) return defaults;
  let xMin = arr[0].x, xMax = arr[0].x, yMin = arr[0].y, yMax = arr[0].y;
  for (let i = 1; i < arr.length; i++) {
    const { x, y } = arr[i];
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  return { xMin, xMax, yMin, yMax };
};

type ScaleMode = "auto" | "manual";
type ValueMode = "count" | "percent";

const sanitizeSignedDecimalInput = (value: string) => {
  const hasLeadingMinus = value.trimStart().startsWith("-");
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [first, ...rest] = cleaned.split(".");
  const normalized = rest.length === 0 ? first : `${first}.${rest.join("")}`;
  return hasLeadingMinus ? `-${normalized}` : normalized;
};

const sanitizeIntegerInput = (value: string) => value.replace(/\D/g, "");

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const HeatmapPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } = useRobotTelemetry();
  const variableOptions = useMemo(
    () => getNumericVariableOptions(telemetryColumns),
    [telemetryColumns],
  );

  const [xVariable, setXVariable] = useState(PACKET_NUMBER_KEY);
  const [yVariable, setYVariable] = useState(telemetryColumns[0] ?? PACKET_NUMBER_KEY);
  const [xBinsInput, setXBinsInput] = useState("12");
  const [yBinsInput, setYBinsInput] = useState("12");
  const [xScaleMode, setXScaleMode] = useState<ScaleMode>("auto");
  const [yScaleMode, setYScaleMode] = useState<ScaleMode>("auto");
  const [xMinInput, setXMinInput] = useState("-100");
  const [xMaxInput, setXMaxInput] = useState("100");
  const [yMinInput, setYMinInput] = useState("-100");
  const [yMaxInput, setYMaxInput] = useState("100");
  const [valueMode, setValueMode] = useState<ValueMode>("count");
  const [isFullScale, setIsFullScale] = useState(false);

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

  const xBins = Math.min(60, Math.max(1, Math.round(parseNumber(xBinsInput, 12))));
  const yBins = Math.min(60, Math.max(1, Math.round(parseNumber(yBinsInput, 12))));

  const bounds = computeBounds(points, { xMin: -100, xMax: 100, yMin: -100, yMax: 100 });
  const autoXMin = bounds.xMin;
  const autoXMax = bounds.xMax;
  const autoYMin = bounds.yMin;
  const autoYMax = bounds.yMax;

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

  const heatmap = useMemo(() => {
    const counts = Array.from({ length: yBins }, () =>
      Array.from({ length: xBins }, () => 0),
    );

    const inRangePoints = points.filter(
      (point) =>
        point.x >= xLow && point.x <= xHigh && point.y >= yLow && point.y <= yHigh,
    );

    inRangePoints.forEach((point) => {
      const xRatio = (point.x - xLow) / xSpan;
      const yRatio = (point.y - yLow) / ySpan;
      const xIndex = Math.min(xBins - 1, Math.max(0, Math.floor(xRatio * xBins)));
      const yIndex = Math.min(yBins - 1, Math.max(0, Math.floor(yRatio * yBins)));
      counts[yIndex][xIndex] += 1;
    });

    let maxCount = 1;
    for (const row of counts) {
      for (const c of row) {
        if (c > maxCount) maxCount = c;
      }
    }

    return {
      counts,
      maxCount,
      inRangeCount: inRangePoints.length,
      totalCount: points.length,
    };
  }, [points, xBins, yBins, xHigh, xLow, xSpan, yHigh, yLow, ySpan]);

  const xLabel =
    variableOptions.find((option) => option.value === xVariable)?.label ?? xVariable;
  const yLabel =
    variableOptions.find((option) => option.value === yVariable)?.label ?? yVariable;

  const chartSize = 700;
  const padding = 62;
  const plotWidth = chartSize - padding * 2;
  const plotHeight = chartSize - padding * 2;
  const cellWidth = plotWidth / xBins;
  const cellHeight = plotHeight / yBins;

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

      {heatmap.totalCount === 0 ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No numeric values available for heatmap plotting.
        </div>
      ) : (
        <div className={isFullScale ? "h-full w-full" : "w-full"}>
          <svg
            viewBox={`0 0 ${chartSize} ${chartSize}`}
            preserveAspectRatio="xMidYMid meet"
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
            {heatmap.counts.map((row, rowIndex) =>
              row.map((count, columnIndex) => {
                const value =
                  valueMode === "percent" && heatmap.inRangeCount > 0
                    ? (count / heatmap.inRangeCount) * 100
                    : count;
                const maxValue = valueMode === "percent" ? 100 : heatmap.maxCount;
                const intensity = value / Math.max(maxValue, Number.EPSILON);

                return (
                  <rect
                    key={`heat-${rowIndex}-${columnIndex}`}
                    x={padding + columnIndex * cellWidth}
                    y={padding + (yBins - rowIndex - 1) * cellHeight}
                    width={Math.max(0, cellWidth)}
                    height={Math.max(0, cellHeight)}
                    fill={`hsl(var(--primary) / ${Math.max(0.06, intensity)})`}
                    stroke="hsl(var(--background) / 0.4)"
                    strokeWidth="0.35"
                  >
                    <title>
                      {valueMode === "percent"
                        ? `${count} points (${value.toFixed(2)}%)`
                        : `${count} points`}
                    </title>
                  </rect>
                );
              }),
            )}

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
          </svg>

          {!isFullScale ? (
            <div className="mt-3 text-xs text-muted-foreground">
              In range: {heatmap.inRangeCount}/{heatmap.totalCount} | Grid: {xBins} x {yBins}
            </div>
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
                <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                  <div>
                    <label className="ui-label" htmlFor="heatmap-x-variable">
                      X Variable
                    </label>
                    <SearchableSelect
                      id="heatmap-x-variable"
                      value={xVariable}
                      onChange={setXVariable}
                      options={variableOptions}
                      placeholder="Select X Variable"
                    />
                  </div>
                  <div>
                    <label className="ui-label" htmlFor="heatmap-y-variable">
                      Y Variable
                    </label>
                    <SearchableSelect
                      id="heatmap-y-variable"
                      value={yVariable}
                      onChange={setYVariable}
                      options={variableOptions}
                      placeholder="Select Y Variable"
                    />
                  </div>
                </div>

                <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                  <div>
                    <label className="ui-label" htmlFor="heatmap-x-bins">
                      X Boxes
                    </label>
                    <input
                      id="heatmap-x-bins"
                      type="text"
                      inputMode="numeric"
                      className="ui-input"
                      value={xBinsInput}
                      onChange={(event) => setXBinsInput(sanitizeIntegerInput(event.target.value))}
                      onBlur={() => setXBinsInput(String(xBins))}
                    />
                  </div>
                  <div>
                    <label className="ui-label" htmlFor="heatmap-y-bins">
                      Y Boxes
                    </label>
                    <input
                      id="heatmap-y-bins"
                      type="text"
                      inputMode="numeric"
                      className="ui-input"
                      value={yBinsInput}
                      onChange={(event) => setYBinsInput(sanitizeIntegerInput(event.target.value))}
                      onBlur={() => setYBinsInput(String(yBins))}
                    />
                  </div>
                </div>

                <div>
                  <label className="ui-label" htmlFor="heatmap-value-mode">
                    Cell Value
                  </label>
                  <select
                    id="heatmap-value-mode"
                    className="ui-input"
                    value={valueMode}
                    onChange={(event) => setValueMode(event.target.value as ValueMode)}
                  >
                    <option value="count">Count</option>
                    <option value="percent">Percent</option>
                  </select>
                </div>

                <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                  <div>
                    <label className="ui-label" htmlFor="heatmap-x-scale">
                      X Scale
                    </label>
                    <select
                      id="heatmap-x-scale"
                      className="ui-input"
                      value={xScaleMode}
                      onChange={(event) => setXScaleMode(event.target.value as ScaleMode)}
                    >
                      <option value="auto">Auto</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div>
                    <label className="ui-label" htmlFor="heatmap-y-scale">
                      Y Scale
                    </label>
                    <select
                      id="heatmap-y-scale"
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
                  <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                    <div>
                      <label className="ui-label" htmlFor="heatmap-x-min">
                        X Min
                      </label>
                      <input
                        id="heatmap-x-min"
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
                      <label className="ui-label" htmlFor="heatmap-x-max">
                        X Max
                      </label>
                      <input
                        id="heatmap-x-max"
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
                  <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                    <div>
                      <label className="ui-label" htmlFor="heatmap-y-min">
                        Y Min
                      </label>
                      <input
                        id="heatmap-y-min"
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
                      <label className="ui-label" htmlFor="heatmap-y-max">
                        Y Max
                      </label>
                      <input
                        id="heatmap-y-max"
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

