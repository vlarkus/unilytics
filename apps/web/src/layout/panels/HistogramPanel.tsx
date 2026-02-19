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

export const histogramPanelTags = ["chart", "histogram", "distribution", "analysis"];

type RangeMode = "auto" | "manual";
type ValueMode = "count" | "percent";
type FullScreenFitMode = "fill" | "square";

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

interface HistogramBin {
  index: number;
  start: number;
  end: number;
  count: number;
}

export const HistogramPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } = useRobotTelemetry();
  const variableOptions = useMemo(
    () => getNumericVariableOptions(telemetryColumns),
    [telemetryColumns],
  );

  const [selectedVariable, setSelectedVariable] = useState(PACKET_NUMBER_KEY);
  const [binsInput, setBinsInput] = useState("12");
  const [rangeMode, setRangeMode] = useState<RangeMode>("auto");
  const [minInput, setMinInput] = useState("-100");
  const [maxInput, setMaxInput] = useState("100");
  const [valueMode, setValueMode] = useState<ValueMode>("count");
  const [isFullScale, setIsFullScale] = useState(false);
  const [fullScreenFitMode, setFullScreenFitMode] = useState<FullScreenFitMode>("fill");

  useEffect(() => {
    if (telemetryColumns.length === 0) return;

    const hasSelection = variableOptions.some((option) => option.value === selectedVariable);
    if (!hasSelection) {
      queueMicrotask(() =>
        setSelectedVariable(variableOptions[0]?.value ?? PACKET_NUMBER_KEY),
      );
    }
  }, [selectedVariable, variableOptions, telemetryColumns]);

  const selectedEntries = useMemo(
    () => getSelectedRowEntries(telemetryRows, packetSelection),
    [packetSelection, telemetryRows],
  );

  const numericValues = useMemo(
    () =>
      selectedEntries
        .map((entry) => getNumericVariableValue(entry, selectedVariable))
        .filter((value): value is number => value !== null),
    [selectedEntries, selectedVariable],
  );

  const bins = Math.min(60, Math.max(1, Math.round(parseNumber(binsInput, 12))));

  const autoMin = numericValues.length > 0 ? Math.min(...numericValues) : -100;
  const autoMax = numericValues.length > 0 ? Math.max(...numericValues) : 100;
  const manualMin = parseNumber(minInput, autoMin);
  const manualMax = parseNumber(maxInput, autoMax);

  const lowerBound = rangeMode === "auto" ? autoMin : Math.min(manualMin, manualMax);
  const upperBound = rangeMode === "auto" ? autoMax : Math.max(manualMin, manualMax);
  const span = Math.max(upperBound - lowerBound, Number.EPSILON);

  const histogram = useMemo(() => {
    const computedBins: HistogramBin[] = Array.from({ length: bins }, (_, index) => {
      const start = lowerBound + (index / bins) * span;
      const end = lowerBound + ((index + 1) / bins) * span;
      return {
        index,
        start,
        end,
        count: 0,
      };
    });

    const inRangeValues = numericValues.filter(
      (value) => value >= lowerBound && value <= upperBound,
    );

    inRangeValues.forEach((value) => {
      const ratio = (value - lowerBound) / span;
      const index = Math.min(bins - 1, Math.max(0, Math.floor(ratio * bins)));
      computedBins[index].count += 1;
    });

    const maxCount = Math.max(...computedBins.map((bin) => bin.count), 1);

    return {
      bins: computedBins,
      maxCount,
      inRangeCount: inRangeValues.length,
      totalCount: numericValues.length,
    };
  }, [bins, lowerBound, numericValues, span, upperBound]);

  const chartSize = 700;
  const padding = 62;
  const plotWidth = chartSize - padding * 2;
  const plotHeight = chartSize - padding * 2;
  const binPixelWidth = plotWidth / bins;
  const barWidth = Math.max(1, binPixelWidth - 2);
  const yMaxLabel = valueMode === "percent" ? 100 : histogram.maxCount;

  const selectedVariableLabel =
    variableOptions.find((option) => option.value === selectedVariable)?.label ??
    selectedVariable;
  const isStretchFill = isFullScale && fullScreenFitMode === "fill";

  const formatRangeValue = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(2);

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

      {numericValues.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No numeric values available for histogram plotting.
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

            {histogram.bins.map((bin) => {
              const value =
                valueMode === "percent" && histogram.inRangeCount > 0
                  ? (bin.count / histogram.inRangeCount) * 100
                  : bin.count;
              const barHeight = (value / Math.max(yMaxLabel, Number.EPSILON)) * plotHeight;
              const x = padding + bin.index * binPixelWidth + (binPixelWidth - barWidth) / 2;
              const y = chartSize - padding - barHeight;

              return (
                <rect
                  key={`histogram-bin-${bin.index}`}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(0, barHeight)}
                  fill="hsl(var(--primary) / 0.7)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="0.5"
                >
                  <title>
                    {`[${formatRangeValue(bin.start)}, ${formatRangeValue(bin.end)}): ${bin.count}`}
                  </title>
                </rect>
              );
            })}

            {!isStretchFill ? (
              <>
                <text
                  x={chartSize / 2}
                  y={chartSize - 18}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="12"
                >
                  {selectedVariableLabel} [{formatRangeValue(lowerBound)}..{formatRangeValue(upperBound)}]
                </text>
                <text
                  x={20}
                  y={chartSize / 2}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="12"
                  transform={`rotate(-90 20 ${chartSize / 2})`}
                >
                  {valueMode === "percent" ? "Percent (%)" : "Count"}
                </text>
              </>
            ) : null}
          </svg>
          {isStretchFill ? (
            <>
              <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-foreground">
                {selectedVariableLabel} [{formatRangeValue(lowerBound)}..{formatRangeValue(upperBound)}]
              </div>
              <div className="pointer-events-none absolute left-2 top-2 text-xs text-foreground">
                Y: {valueMode === "percent" ? "Percent (%)" : "Count"}
              </div>
            </>
          ) : null}

          {!isFullScale ? (
            <div className="mt-3 text-xs text-muted-foreground">
              In range: {histogram.inRangeCount}/{histogram.totalCount} | Bins: {bins} | Packet
              window: {selectedEntries.length}
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
                  <div>
                    <label className="ui-label" htmlFor="histogram-variable">
                      Variable
                    </label>
                    <SearchableSelect
                      id="histogram-variable"
                      value={selectedVariable}
                      onChange={setSelectedVariable}
                      options={variableOptions}
                      placeholder="Select Variable"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="ui-label" htmlFor="histogram-bins">
                      Bin Count
                    </label>
                    <input
                      id="histogram-bins"
                      type="text"
                      inputMode="numeric"
                      className="ui-input"
                      value={binsInput}
                      onChange={(event) => setBinsInput(sanitizeIntegerInput(event.target.value))}
                      onBlur={() => setBinsInput(String(bins))}
                    />
                  </div>

                  <div>
                    <label className="ui-label" htmlFor="histogram-value-mode">
                      Y Axis Mode
                    </label>
                    <select
                      id="histogram-value-mode"
                      className="ui-input"
                      value={valueMode}
                      onChange={(event) => setValueMode(event.target.value as ValueMode)}
                    >
                      <option value="count">Count</option>
                      <option value="percent">Percent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="ui-label" htmlFor="histogram-range-mode">
                    Range Mode
                  </label>
                  <select
                    id="histogram-range-mode"
                    className="ui-input"
                    value={rangeMode}
                    onChange={(event) => setRangeMode(event.target.value as RangeMode)}
                  >
                    <option value="auto">Auto (based on current data)</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                {rangeMode === "manual" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="ui-label" htmlFor="histogram-min">
                        Min Value
                      </label>
                      <input
                        id="histogram-min"
                        type="text"
                        inputMode="decimal"
                        className="ui-input"
                        value={minInput}
                        onChange={(event) =>
                          setMinInput(sanitizeSignedDecimalInput(event.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="ui-label" htmlFor="histogram-max">
                        Max Value
                      </label>
                      <input
                        id="histogram-max"
                        type="text"
                        inputMode="decimal"
                        className="ui-input"
                        value={maxInput}
                        onChange={(event) =>
                          setMaxInput(sanitizeSignedDecimalInput(event.target.value))
                        }
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="ui-label" htmlFor="histogram-fullscreen-fit">
                    Full-Screen Fit
                  </label>
                  <select
                    id="histogram-fullscreen-fit"
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
