/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PanelProps } from "../PanelRegistry";
import { useRobotTelemetry } from "../use-robot-telemetry";
import { SearchableSelect } from "../../components/SearchableSelect";

type ScaleMode = "auto" | "manual";
type ValueMode = "cyclical" | "range";
type ZeroDirection = "north" | "east" | "south" | "west";
type RotationDirection = "clockwise" | "counterclockwise";

export const headingVectorPanelTags = [
  "vector",
  "heading",
  "dial",
  "visualization",
  "analysis",
];

const sanitizeDecimalInput = (value: string) => {
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

const wrapToUnit = (value: number) => ((value % 1) + 1) % 1;
const clampToUnit = (value: number) => Math.min(Math.max(value, 0), 1);

const formatValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const getZeroOffset = (direction: ZeroDirection) => {
  switch (direction) {
    case "east":
      return Math.PI / 2;
    case "south":
      return Math.PI;
    case "west":
      return Math.PI * 1.5;
    default:
      return 0;
  }
};

export const HeadingVectorPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } =
    useRobotTelemetry();

  const [selectedColumn, setSelectedColumn] = useState("");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("auto");
  const [minInput, setMinInput] = useState("0");
  const [maxInput, setMaxInput] = useState("360");
  const [valueMode, setValueMode] = useState<ValueMode>("cyclical");
  const [zeroDirection, setZeroDirection] = useState<ZeroDirection>("north");
  const [rotationDirection, setRotationDirection] =
    useState<RotationDirection>("clockwise");
  const [showZeroToArmLine, setShowZeroToArmLine] = useState(true);
  const [isFullScale, setIsFullScale] = useState(false);

  useEffect(() => {
    if (telemetryColumns.length === 0) {
      return;
    }
    if (!telemetryColumns.includes(selectedColumn)) {
      queueMicrotask(() => setSelectedColumn(telemetryColumns[0]));
    }
  }, [selectedColumn, telemetryColumns]);

  const selectedRows = useMemo(() => {
    if (telemetryRows.length === 0) return [] as typeof telemetryRows;
    const maxIndex = telemetryRows.length - 1;
    const startIndex = Math.min(
      Math.max(packetSelection.startIndex, 0),
      maxIndex,
    );
    const endIndex = Math.min(Math.max(packetSelection.endIndex, 0), maxIndex);
    const lower = Math.min(startIndex, endIndex);
    const upper = Math.max(startIndex, endIndex);
    return telemetryRows.slice(lower, upper + 1);
  }, [packetSelection.endIndex, packetSelection.startIndex, telemetryRows]);

  const numericValues = useMemo(() => {
    if (!selectedColumn) return [] as number[];

    return selectedRows
      .map((row) => row.values[selectedColumn])
      .map((raw) => (typeof raw === "number" ? raw : Number(raw)))
      .filter((value) => Number.isFinite(value));
  }, [selectedColumn, selectedRows]);

  const autoMin = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const autoMax = numericValues.length > 0 ? Math.max(...numericValues) : 360;
  const minValue = parseNumber(minInput, autoMin);
  const maxValue = parseNumber(maxInput, autoMax);
  const lowerBound = scaleMode === "auto" ? autoMin : Math.min(minValue, maxValue);
  const upperBound = scaleMode === "auto" ? autoMax : Math.max(minValue, maxValue);
  const span = Math.max(upperBound - lowerBound, Number.EPSILON);

  const currentValue =
    numericValues.length > 0 ? numericValues[numericValues.length - 1] : null;
  const normalizedValue = useMemo(() => {
    if (currentValue === null) return null;
    const rawRatio = (currentValue - lowerBound) / span;
    if (valueMode === "cyclical") {
      return wrapToUnit(rawRatio);
    }
    if (currentValue < lowerBound || currentValue > upperBound) {
      return null;
    }
    return clampToUnit(rawRatio);
  }, [currentValue, lowerBound, span, upperBound, valueMode]);

  const chartSize = 620;
  const center = chartSize / 2;
  const radius = 240;
  const progressRadius = radius - 26;

  const axisPoint = useCallback(
    (angle: number, distance: number) => ({
      x: center + Math.sin(angle) * distance,
      y: center - Math.cos(angle) * distance,
    }),
    [center],
  );

  const tickCount = 36;
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const angle = (index / tickCount) * 2 * Math.PI;
    const major = index % 3 === 0;
    const outer = axisPoint(angle, radius);
    const inner = axisPoint(angle, major ? radius - 18 : radius - 10);
    const labelPoint = axisPoint(angle, radius - 34);
    const labelValue = lowerBound + (index / tickCount) * span;
    return { index, outer, inner, major, labelPoint, labelValue };
  });

  const zeroOffset = getZeroOffset(zeroDirection);
  const rotationMultiplier = rotationDirection === "clockwise" ? 1 : -1;
  const zeroPoint = axisPoint(zeroOffset, radius - 44);
  const vectorAngle =
    normalizedValue === null
      ? null
      : zeroOffset + rotationMultiplier * normalizedValue * 2 * Math.PI;
  const vectorPoint =
    vectorAngle === null ? null : axisPoint(vectorAngle, radius - 44);

  const progressArcPath = useMemo(() => {
    if (normalizedValue === null || normalizedValue <= Number.EPSILON) {
      return null;
    }

    const sweepFlag = rotationMultiplier === 1 ? 1 : 0;
    const start = axisPoint(zeroOffset, progressRadius);

    if (normalizedValue >= 1 - 1e-6) {
      const mid = axisPoint(
        zeroOffset + rotationMultiplier * Math.PI,
        progressRadius,
      );
      return `M ${start.x} ${start.y} A ${progressRadius} ${progressRadius} 0 1 ${sweepFlag} ${mid.x} ${mid.y} A ${progressRadius} ${progressRadius} 0 1 ${sweepFlag} ${start.x} ${start.y}`;
    }

    const end = axisPoint(vectorAngle ?? zeroOffset, progressRadius);
    const largeArcFlag = normalizedValue > 0.5 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${progressRadius} ${progressRadius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
  }, [
    axisPoint,
    normalizedValue,
    progressRadius,
    rotationMultiplier,
    vectorAngle,
    zeroOffset,
  ]);

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
        <i
          className={`fa-solid ${isFullScale ? "fa-compress" : "fa-expand"}`}
          aria-hidden="true"
        />
      </button>

      {!selectedColumn || numericValues.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No numeric telemetry values available for vector rendering yet.
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
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="hsl(var(--foreground) / 0.5)"
              strokeWidth="1.25"
            />
            <circle
              cx={center}
              cy={center}
              r={radius * 0.75}
              fill="transparent"
              stroke="hsl(var(--foreground) / 0.2)"
              strokeWidth="1"
            />
            <circle
              cx={center}
              cy={center}
              r={radius * 0.5}
              fill="transparent"
              stroke="hsl(var(--foreground) / 0.2)"
              strokeWidth="1"
            />
            <circle
              cx={center}
              cy={center}
              r={radius * 0.25}
              fill="transparent"
              stroke="hsl(var(--foreground) / 0.2)"
              strokeWidth="1"
            />

            <circle
              cx={center}
              cy={center}
              r={progressRadius}
              fill="transparent"
              stroke="hsl(var(--foreground) / 0.12)"
              strokeWidth="8"
            />
            {showZeroToArmLine && progressArcPath ? (
              <path
                d={progressArcPath}
                fill="none"
                stroke="hsl(var(--primary) / 0.72)"
                strokeWidth="8"
                strokeLinecap="round"
              />
            ) : null}

            {ticks.map((tick) => (
              <g key={`tick-${tick.index}`}>
                <line
                  x1={tick.inner.x}
                  y1={tick.inner.y}
                  x2={tick.outer.x}
                  y2={tick.outer.y}
                  stroke="hsl(var(--foreground) / 0.55)"
                  strokeWidth={tick.major ? 1.5 : 1}
                />
                {tick.major ? (
                  <text
                    x={tick.labelPoint.x}
                    y={tick.labelPoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {formatValue(tick.labelValue)}
                  </text>
                ) : null}
              </g>
            ))}

            <line
              x1={center}
              y1={center}
              x2={zeroPoint.x}
              y2={zeroPoint.y}
              stroke="hsl(var(--foreground) / 0.45)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {vectorPoint ? (
              <>
                <line
                  x1={center}
                  y1={center}
                  x2={vectorPoint.x}
                  y2={vectorPoint.y}
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle
                  cx={vectorPoint.x}
                  cy={vectorPoint.y}
                  r={6}
                  fill="hsl(var(--primary))"
                />
              </>
            ) : null}

            <circle
              cx={center}
              cy={center}
              r={8}
              fill="hsl(var(--foreground))"
            />

            <text
              x={center}
              y={center - 12}
              textAnchor="middle"
              fontSize="13"
              fill="hsl(var(--muted-foreground))"
            >
              Current Value
            </text>
            <text
              x={center}
              y={center + 12}
              textAnchor="middle"
              fontSize="20"
              fontWeight="600"
              fill="hsl(var(--foreground))"
            >
              {currentValue === null ? "--" : formatValue(currentValue)}
            </text>
          </svg>

          {!isFullScale ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Range: {formatValue(lowerBound)} to {formatValue(upperBound)} |
              View: {valueMode} | Packet window: {selectedRows.length}
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
                  <label className="ui-label" htmlFor="heading-column">
                    Data Column
                  </label>
                  <SearchableSelect
                    id="heading-column"
                    value={selectedColumn}
                    onChange={setSelectedColumn}
                    options={
                      telemetryColumns.length === 0
                        ? []
                        : telemetryColumns.map((col) => ({ value: col, label: col }))
                    }
                    placeholder="Select Data Column"
                  />
                </div>

                <div>
                  <label className="ui-label" htmlFor="heading-scale-mode">
                    Scale Mode
                  </label>
                  <select
                    id="heading-scale-mode"
                    className="ui-input"
                    value={scaleMode}
                    onChange={(event) =>
                      setScaleMode(event.target.value as ScaleMode)
                    }
                  >
                    <option value="auto">Auto</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                {scaleMode === "manual" ? (
                  <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                    <div>
                      <label className="ui-label" htmlFor="heading-min">
                        Min Value
                      </label>
                      <input
                        id="heading-min"
                        type="text"
                        inputMode="decimal"
                        className="ui-input"
                        value={minInput}
                        onChange={(event) =>
                          setMinInput(sanitizeDecimalInput(event.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="ui-label" htmlFor="heading-max">
                        Max Value
                      </label>
                      <input
                        id="heading-max"
                        type="text"
                        inputMode="decimal"
                        className="ui-input"
                        value={maxInput}
                        onChange={(event) =>
                          setMaxInput(sanitizeDecimalInput(event.target.value))
                        }
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="ui-label" htmlFor="heading-value-mode">
                    Viewing Mode
                  </label>
                  <select
                    id="heading-value-mode"
                    className="ui-input"
                    value={valueMode}
                    onChange={(event) =>
                      setValueMode(event.target.value as ValueMode)
                    }
                  >
                    <option value="cyclical">Cyclical (Heading)</option>
                    <option value="range">Range</option>
                  </select>
                </div>

                <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                  <div>
                    <label className="ui-label" htmlFor="heading-zero-direction">
                      Zero Direction
                    </label>
                    <select
                      id="heading-zero-direction"
                      className="ui-input"
                      value={zeroDirection}
                      onChange={(event) =>
                        setZeroDirection(event.target.value as ZeroDirection)
                      }
                    >
                      <option value="north">North (Up)</option>
                      <option value="east">East (Right)</option>
                      <option value="south">South (Down)</option>
                      <option value="west">West (Left)</option>
                    </select>
                  </div>
                  <div>
                    <label className="ui-label" htmlFor="heading-rotation-direction">
                      Rotation
                    </label>
                    <select
                      id="heading-rotation-direction"
                      className="ui-input"
                      value={rotationDirection}
                      onChange={(event) =>
                        setRotationDirection(
                          event.target.value as RotationDirection,
                        )
                      }
                    >
                      <option value="clockwise">Clockwise</option>
                      <option value="counterclockwise">Counterclockwise</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <label
                    className="ui-label mb-0"
                    htmlFor="heading-show-zero-to-arm-line"
                  >
                    Show Zero To Arm Line
                  </label>
                  <input
                    id="heading-show-zero-to-arm-line"
                    type="checkbox"
                    className="ui-switch"
                    checked={showZeroToArmLine}
                    onChange={(event) =>
                      setShowZeroToArmLine(event.target.checked)
                    }
                  />
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

