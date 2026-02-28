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

export const violinPlotPanelTags = ["chart", "violin", "density", "analysis"];

type ScaleMode = "auto" | "manual";
type FullScreenFitMode = "fill" | "square";
type OrientationMode = "auto" | "vertical" | "horizontal";

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

const quantile = (sortedValues: number[], fraction: number) => {
  if (sortedValues.length === 0) return 0;
  const position = (sortedValues.length - 1) * fraction;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];
  const t = position - lowerIndex;
  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * t;
};

export const ViolinPlotPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } = useRobotTelemetry();
  const variableOptions = useMemo(
    () => getNumericVariableOptions(telemetryColumns),
    [telemetryColumns],
  );

  const [selectedVariable, setSelectedVariable] = useState(telemetryColumns[0] ?? PACKET_NUMBER_KEY);
  const [binCountInput, setBinCountInput] = useState("28");
  const [yScaleMode, setYScaleMode] = useState<ScaleMode>("auto");
  const [yMinInput, setYMinInput] = useState("-100");
  const [yMaxInput, setYMaxInput] = useState("100");
  const [showBoxOverlay, setShowBoxOverlay] = useState(true);
  const [isFullScale, setIsFullScale] = useState(false);
  const [fullScreenFitMode, setFullScreenFitMode] = useState<FullScreenFitMode>("fill");
  const [orientationMode, setOrientationMode] = useState<OrientationMode>("auto");

  useEffect(() => {
    if (telemetryColumns.length === 0) return;

    if (!variableOptions.some((option) => option.value === selectedVariable)) {
      queueMicrotask(() =>
        setSelectedVariable(variableOptions[0]?.value ?? PACKET_NUMBER_KEY),
      );
    }
  }, [selectedVariable, variableOptions, telemetryColumns]);

  const selectedEntries = useMemo(
    () => getSelectedRowEntries(telemetryRows, packetSelection),
    [packetSelection, telemetryRows],
  );

  const values = useMemo(
    () =>
      selectedEntries
        .map((entry) => getNumericVariableValue(entry, selectedVariable))
        .filter((value): value is number => value !== null),
    [selectedEntries, selectedVariable],
  );

  const yAutoMin = values.length > 0 ? Math.min(...values) : -100;
  const yAutoMax = values.length > 0 ? Math.max(...values) : 100;
  const yManualMin = parseNumber(yMinInput, yAutoMin);
  const yManualMax = parseNumber(yMaxInput, yAutoMax);
  const yMin = yScaleMode === "auto" ? yAutoMin : Math.min(yManualMin, yManualMax);
  const yMax = yScaleMode === "auto" ? yAutoMax : Math.max(yManualMin, yManualMax);
  const ySpan = Math.max(yMax - yMin, Number.EPSILON);

  const binCount = Math.min(80, Math.max(8, Math.round(parseNumber(binCountInput, 28))));

  const density = useMemo(() => {
    if (values.length === 0) {
      return {
        bins: Array.from({ length: binCount }, () => 0),
        maxDensity: 1,
      };
    }

    const bins = Array.from({ length: binCount }, () => 0);
    values
      .filter((value) => value >= yMin && value <= yMax)
      .forEach((value) => {
        const ratio = (value - yMin) / ySpan;
        const index = Math.min(binCount - 1, Math.max(0, Math.floor(ratio * binCount)));
        bins[index] += 1;
      });

    const smoothed = bins.map((_, index) => {
      const left = bins[Math.max(index - 1, 0)];
      const mid = bins[index];
      const right = bins[Math.min(index + 1, binCount - 1)];
      return (left + mid * 2 + right) / 4;
    });
    const maxDensity = Math.max(...smoothed, 1);

    return {
      bins: smoothed,
      maxDensity,
    };
  }, [binCount, values, yMax, yMin, ySpan]);

  const sortedValues = useMemo(() => [...values].sort((a, b) => a - b), [values]);
  const stats = useMemo(() => {
    if (sortedValues.length === 0) return null;
    return {
      q1: quantile(sortedValues, 0.25),
      median: quantile(sortedValues, 0.5),
      q3: quantile(sortedValues, 0.75),
    };
  }, [sortedValues]);

  const chartSize = 620;
  const padding = 62;
  const xCenter = chartSize / 2;
  const yCenter = chartSize / 2;
  const maxHalfWidth = 130;
  const toSvgY = (value: number) =>
    chartSize - padding - ((value - yMin) / ySpan) * (chartSize - padding * 2);
  const toSvgX = (value: number) =>
    padding + ((value - yMin) / ySpan) * (chartSize - padding * 2);

  const orientation: "vertical" | "horizontal" =
    orientationMode === "auto"
      ? isFullScale && fullScreenFitMode === "fill"
        ? "horizontal"
        : "vertical"
      : orientationMode;
  const isStretchFill = isFullScale && fullScreenFitMode === "fill";

  const violinPath = useMemo(() => {
    if (values.length === 0) return "";

    const leftPoints: Array<{ x: number; y: number }> = [];
    const rightPoints: Array<{ x: number; y: number }> = [];

    density.bins.forEach((count, index) => {
      const ratio = count / density.maxDensity;
      const width = ratio * maxHalfWidth;
      const value = yMin + ((index + 0.5) / binCount) * ySpan;
      if (orientation === "vertical") {
        const y = chartSize - padding - ((value - yMin) / ySpan) * (chartSize - padding * 2);
        leftPoints.push({ x: xCenter - width, y });
        rightPoints.push({ x: xCenter + width, y });
      } else {
        const x = padding + ((value - yMin) / ySpan) * (chartSize - padding * 2);
        leftPoints.push({ x, y: yCenter - width });
        rightPoints.push({ x, y: yCenter + width });
      }
    });

    const points = [...leftPoints, ...rightPoints.reverse()];
    if (points.length < 3) return "";

    return `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`;
  }, [
    binCount,
    density.bins,
    density.maxDensity,
    orientation,
    values.length,
    xCenter,
    yCenter,
    yMin,
    ySpan,
  ]);

  const variableLabel =
    variableOptions.find((option) => option.value === selectedVariable)?.label ?? selectedVariable;

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

      {values.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No numeric values available for violin plot.
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
            {violinPath ? (
              <path
                d={violinPath}
                fill="hsl(var(--primary) / 0.22)"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
              >
                <title>{`Values: ${values.length}, Density bins: ${binCount}`}</title>
              </path>
            ) : null}

            {showBoxOverlay && stats ? (
              orientation === "vertical" ? (
                <>
                  <rect
                    x={xCenter - 46}
                    y={toSvgY(stats.q3)}
                    width={92}
                    height={Math.max(1, toSvgY(stats.q1) - toSvgY(stats.q3))}
                    fill="hsl(var(--primary) / 0.16)"
                    stroke="hsl(var(--foreground) / 0.8)"
                    strokeWidth="1.2"
                  >
                    <title>{`Q1: ${stats.q1.toFixed(4)}, Median: ${stats.median.toFixed(4)}, Q3: ${stats.q3.toFixed(4)}`}</title>
                  </rect>
                  <line
                    x1={xCenter - 46}
                    y1={toSvgY(stats.median)}
                    x2={xCenter + 46}
                    y2={toSvgY(stats.median)}
                    stroke="hsl(var(--foreground))"
                    strokeWidth="1.4"
                  />
                </>
              ) : (
                <>
                  <rect
                    x={toSvgX(stats.q1)}
                    y={yCenter - 46}
                    width={Math.max(1, toSvgX(stats.q3) - toSvgX(stats.q1))}
                    height={92}
                    fill="hsl(var(--primary) / 0.16)"
                    stroke="hsl(var(--foreground) / 0.8)"
                    strokeWidth="1.2"
                  >
                    <title>{`Q1: ${stats.q1.toFixed(4)}, Median: ${stats.median.toFixed(4)}, Q3: ${stats.q3.toFixed(4)}`}</title>
                  </rect>
                  <line
                    x1={toSvgX(stats.median)}
                    y1={yCenter - 46}
                    x2={toSvgX(stats.median)}
                    y2={yCenter + 46}
                    stroke="hsl(var(--foreground))"
                    strokeWidth="1.4"
                  />
                </>
              )
            ) : null}

            {!isStretchFill ? (
              <text
                x={xCenter}
                y={chartSize - 18}
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                fontSize="12"
              >
                {variableLabel}
              </text>
            ) : null}
          </svg>
          {isStretchFill ? (
            <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-foreground">
              {variableLabel}
            </div>
          ) : null}

          {!isFullScale ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Values: {values.length} | Density bins: {binCount}
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
                <div>
                  <label className="ui-label" htmlFor="violin-variable">
                    Variable
                  </label>
                  <SearchableSelect
                    id="violin-variable"
                    value={selectedVariable}
                    onChange={setSelectedVariable}
                    options={variableOptions}
                    placeholder="Select Variable"
                  />
                </div>

                <div>
                  <label className="ui-label" htmlFor="violin-bins">
                    Density Bins
                  </label>
                  <input
                    id="violin-bins"
                    type="text"
                    inputMode="numeric"
                    className="ui-input"
                    value={binCountInput}
                    onChange={(event) => setBinCountInput(sanitizeIntegerInput(event.target.value))}
                    onBlur={() => setBinCountInput(String(binCount))}
                  />
                </div>

                <div>
                  <label className="ui-label" htmlFor="violin-y-scale-mode">
                    Y Scale
                  </label>
                  <select
                    id="violin-y-scale-mode"
                    className="ui-input"
                    value={yScaleMode}
                    onChange={(event) => setYScaleMode(event.target.value as ScaleMode)}
                  >
                    <option value="auto">Auto</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                {yScaleMode === "manual" ? (
                  <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                    <div>
                      <label className="ui-label" htmlFor="violin-y-min">
                        Y Min
                      </label>
                      <input
                        id="violin-y-min"
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
                      <label className="ui-label" htmlFor="violin-y-max">
                        Y Max
                      </label>
                      <input
                        id="violin-y-max"
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
                    checked={showBoxOverlay}
                    onChange={(event) => setShowBoxOverlay(event.target.checked)}
                  />
                  Show Box Overlay
                </label>

                <div>
                  <label className="ui-label" htmlFor="violin-fullscreen-fit">
                    Full-Screen Fit
                  </label>
                  <select
                    id="violin-fullscreen-fit"
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

                <div>
                  <label className="ui-label" htmlFor="violin-orientation">
                    Orientation
                  </label>
                  <select
                    id="violin-orientation"
                    className="ui-input"
                    value={orientationMode}
                    onChange={(event) =>
                      setOrientationMode(event.target.value as OrientationMode)
                    }
                  >
                    <option value="auto">Auto</option>
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
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

