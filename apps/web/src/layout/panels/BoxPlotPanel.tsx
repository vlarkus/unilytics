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

export const boxPlotPanelTags = ["chart", "box", "quartile", "analysis"];

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

export const BoxPlotPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } = useRobotTelemetry();
  const variableOptions = useMemo(
    () => getNumericVariableOptions(telemetryColumns),
    [telemetryColumns],
  );

  const [selectedVariable, setSelectedVariable] = useState(telemetryColumns[0] ?? PACKET_NUMBER_KEY);
  const [yScaleMode, setYScaleMode] = useState<ScaleMode>("auto");
  const [yMinInput, setYMinInput] = useState("-100");
  const [yMaxInput, setYMaxInput] = useState("100");
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

  const stats = useMemo(() => {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const q1 = quantile(sorted, 0.25);
    const median = quantile(sorted, 0.5);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lowFence = q1 - iqr * 1.5;
    const highFence = q3 + iqr * 1.5;

    const whiskerLow = sorted.find((value) => value >= lowFence) ?? min;
    const whiskerHigh = [...sorted].reverse().find((value) => value <= highFence) ?? max;
    const outliers = sorted.filter((value) => value < whiskerLow || value > whiskerHigh);

    return {
      min,
      max,
      q1,
      median,
      q3,
      whiskerLow,
      whiskerHigh,
      outliers,
      count: sorted.length,
    };
  }, [values]);

  const yAutoMin = stats ? stats.min : -100;
  const yAutoMax = stats ? stats.max : 100;
  const yManualMin = parseNumber(yMinInput, yAutoMin);
  const yManualMax = parseNumber(yMaxInput, yAutoMax);
  const yMin = yScaleMode === "auto" ? yAutoMin : Math.min(yManualMin, yManualMax);
  const yMax = yScaleMode === "auto" ? yAutoMax : Math.max(yManualMin, yManualMax);
  const ySpan = Math.max(yMax - yMin, Number.EPSILON);

  const chartSize = 620;
  const padding = 62;
  const xCenter = chartSize / 2;
  const yCenter = chartSize / 2;
  const boxWidth = 140;
  const boxHeight = 140;

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

      {!stats ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No numeric values available for box plot.
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
            {orientation === "vertical" ? (
              <>
                <line
                  x1={xCenter}
                  y1={toSvgY(stats.whiskerHigh)}
                  x2={xCenter}
                  y2={toSvgY(stats.whiskerLow)}
                  stroke="hsl(var(--foreground) / 0.7)"
                  strokeWidth="1.5"
                >
                  <title>{`Whiskers: ${stats.whiskerLow.toFixed(4)} to ${stats.whiskerHigh.toFixed(4)}`}</title>
                </line>
                <line
                  x1={xCenter - 30}
                  y1={toSvgY(stats.whiskerHigh)}
                  x2={xCenter + 30}
                  y2={toSvgY(stats.whiskerHigh)}
                  stroke="hsl(var(--foreground) / 0.7)"
                  strokeWidth="1.5"
                />
                <line
                  x1={xCenter - 30}
                  y1={toSvgY(stats.whiskerLow)}
                  x2={xCenter + 30}
                  y2={toSvgY(stats.whiskerLow)}
                  stroke="hsl(var(--foreground) / 0.7)"
                  strokeWidth="1.5"
                />
                <rect
                  x={xCenter - boxWidth / 2}
                  y={toSvgY(stats.q3)}
                  width={boxWidth}
                  height={Math.max(1, toSvgY(stats.q1) - toSvgY(stats.q3))}
                  fill="hsl(var(--primary) / 0.2)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                >
                  <title>{`Q1: ${stats.q1.toFixed(4)}, Median: ${stats.median.toFixed(4)}, Q3: ${stats.q3.toFixed(4)}`}</title>
                </rect>
                <line
                  x1={xCenter - boxWidth / 2}
                  y1={toSvgY(stats.median)}
                  x2={xCenter + boxWidth / 2}
                  y2={toSvgY(stats.median)}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                />
                {stats.outliers.map((value, index) => (
                  <circle
                    key={`outlier-${value}-${index}`}
                    cx={xCenter + (index % 5) * 6 - 12}
                    cy={toSvgY(value)}
                    r={2.5}
                    fill="hsl(var(--error))"
                  >
                    <title>{`Outlier: ${value.toFixed(4)}`}</title>
                  </circle>
                ))}
              </>
            ) : (
              <>
                <line
                  x1={toSvgX(stats.whiskerLow)}
                  y1={yCenter}
                  x2={toSvgX(stats.whiskerHigh)}
                  y2={yCenter}
                  stroke="hsl(var(--foreground) / 0.7)"
                  strokeWidth="1.5"
                >
                  <title>{`Whiskers: ${stats.whiskerLow.toFixed(4)} to ${stats.whiskerHigh.toFixed(4)}`}</title>
                </line>
                <line
                  x1={toSvgX(stats.whiskerLow)}
                  y1={yCenter - 30}
                  x2={toSvgX(stats.whiskerLow)}
                  y2={yCenter + 30}
                  stroke="hsl(var(--foreground) / 0.7)"
                  strokeWidth="1.5"
                />
                <line
                  x1={toSvgX(stats.whiskerHigh)}
                  y1={yCenter - 30}
                  x2={toSvgX(stats.whiskerHigh)}
                  y2={yCenter + 30}
                  stroke="hsl(var(--foreground) / 0.7)"
                  strokeWidth="1.5"
                />
                <rect
                  x={toSvgX(stats.q1)}
                  y={yCenter - boxHeight / 2}
                  width={Math.max(1, toSvgX(stats.q3) - toSvgX(stats.q1))}
                  height={boxHeight}
                  fill="hsl(var(--primary) / 0.2)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                >
                  <title>{`Q1: ${stats.q1.toFixed(4)}, Median: ${stats.median.toFixed(4)}, Q3: ${stats.q3.toFixed(4)}`}</title>
                </rect>
                <line
                  x1={toSvgX(stats.median)}
                  y1={yCenter - boxHeight / 2}
                  x2={toSvgX(stats.median)}
                  y2={yCenter + boxHeight / 2}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                />
                {stats.outliers.map((value, index) => (
                  <circle
                    key={`outlier-${value}-${index}`}
                    cx={toSvgX(value)}
                    cy={yCenter + (index % 5) * 6 - 12}
                    r={2.5}
                    fill="hsl(var(--error))"
                  >
                    <title>{`Outlier: ${value.toFixed(4)}`}</title>
                  </circle>
                ))}
              </>
            )}

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
              Count: {stats.count} | Q1: {stats.q1.toFixed(3)} | Median: {stats.median.toFixed(3)}{" "}
              | Q3: {stats.q3.toFixed(3)}
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
                  <label className="ui-label" htmlFor="box-variable">
                    Variable
                  </label>
                  <SearchableSelect
                    id="box-variable"
                    value={selectedVariable}
                    onChange={setSelectedVariable}
                    options={variableOptions}
                    placeholder="Select Variable"
                  />
                </div>

                <div>
                  <label className="ui-label" htmlFor="box-y-scale-mode">
                    Y Scale
                  </label>
                  <select
                    id="box-y-scale-mode"
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
                      <label className="ui-label" htmlFor="box-y-min">
                        Y Min
                      </label>
                      <input
                        id="box-y-min"
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
                      <label className="ui-label" htmlFor="box-y-max">
                        Y Max
                      </label>
                      <input
                        id="box-y-max"
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
                  <label className="ui-label" htmlFor="box-fullscreen-fit">
                    Full-Screen Fit
                  </label>
                  <select
                    id="box-fullscreen-fit"
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
                  <label className="ui-label" htmlFor="box-orientation">
                    Orientation
                  </label>
                  <select
                    id="box-orientation"
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
