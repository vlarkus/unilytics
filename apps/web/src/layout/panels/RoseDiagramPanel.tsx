import React, { useEffect, useMemo, useState } from "react";
import type { PanelProps } from "../PanelRegistry";
import { useRobotTelemetry } from "../use-robot-telemetry";

type ViewMode = "range" | "cyclical";

export const RoseDiagramPanelTags = [
  "chart",
  "rose",
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

const sanitizeIntegerInput = (value: string) => value.replace(/\D/g, "");

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export const RoseDiagramPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } =
    useRobotTelemetry();

  const [selectedColumn, setSelectedColumn] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("range");
  const [minInput, setMinInput] = useState("0");
  const [maxInput, setMaxInput] = useState("360");
  const [sidesInput, setSidesInput] = useState("8");
  const [isFullScale, setIsFullScale] = useState(false);

  useEffect(() => {
    if (telemetryColumns.length === 0) {
      setSelectedColumn("");
      return;
    }
    if (!telemetryColumns.includes(selectedColumn)) {
      setSelectedColumn(telemetryColumns[0]);
    }
  }, [selectedColumn, telemetryColumns]);

  const sideCount = Math.max(1, Math.round(parseNumber(sidesInput, 8)));
  const minValue = parseNumber(minInput, 0);
  const maxValue = parseNumber(maxInput, 360);
  const lowerBound = Math.min(minValue, maxValue);
  const upperBound = Math.max(minValue, maxValue);
  const span = Math.max(upperBound - lowerBound, Number.EPSILON);

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

  const roseData = useMemo(() => {
    const step = (2 * Math.PI) / sideCount;
    const counts = Array.from({ length: sideCount }, () => 0);

    const inputValues =
      viewMode === "range"
        ? numericValues.filter(
            (value) => value >= lowerBound && value <= upperBound,
          )
        : numericValues;

    inputValues.forEach((value) => {
      const normalizedValue =
        viewMode === "cyclical"
          ? (((value - lowerBound) % span) + span) % span
          : value - lowerBound;
      const clampedValue =
        viewMode === "cyclical"
          ? normalizedValue
          : Math.min(Math.max(normalizedValue, 0), span);
      const ratio = clampedValue / span;
      const angle = ratio * 2 * Math.PI;
      const wrappedAngle =
        ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const closestSide = Math.round(wrappedAngle / step) % sideCount;
      counts[closestSide] += 1;
    });

    return {
      counts,
      consideredValueCount: inputValues.length,
      maxCount: Math.max(...counts, 1),
    };
  }, [lowerBound, numericValues, sideCount, span, viewMode]);

  const chartSize = 620;
  const center = chartSize / 2;
  const radius = 240;
  const angleStep = (2 * Math.PI) / sideCount;
  const sideIndices = Array.from({ length: sideCount }, (_, index) => index);

  const axisPoint = (angle: number, distance: number) => ({
    x: center + Math.sin(angle) * distance,
    y: center - Math.cos(angle) * distance,
  });

  const rosePoints = sideIndices
    .map((index) => {
      const angle = index * angleStep;
      const magnitude = roseData.counts[index] / roseData.maxCount;
      const point = axisPoint(angle, magnitude * radius);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const referenceOutlinePoints = sideIndices
    .map((index) => {
      const angle = index * angleStep;
      const point = axisPoint(angle, radius);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  const roseDiagramContent = (
    <>
      {!selectedColumn || numericValues.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No numeric telemetry values available for plotting yet.
        </div>
      ) : (
        <div className="w-full">
          <svg
            viewBox={`0 0 ${chartSize} ${chartSize}`}
            className="block w-full h-auto max-h-[72vh] bg-transparent"
          >
            <polygon
              points={referenceOutlinePoints}
              fill="transparent"
              stroke="hsl(var(--foreground) / 0.65)"
              strokeWidth="1"
            />

            {sideIndices.map((index) => {
              const angle = index * angleStep;
              const end = axisPoint(angle, radius);
              const label = axisPoint(angle, radius + 18);
              const sideValue = lowerBound + (index / sideCount) * span;
              const sideText =
                index === 0
                  ? `${formatValue(lowerBound)} / ${formatValue(upperBound)}`
                  : formatValue(sideValue);

              return (
                <g key={`axis-${index}`}>
                  <line
                    x1={center}
                    y1={center}
                    x2={end.x}
                    y2={end.y}
                    stroke="hsl(var(--foreground) / 0.65)"
                    strokeWidth="1"
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="12"
                    fill="hsl(var(--foreground))"
                  >
                    {sideText}
                  </text>
                </g>
              );
            })}

            <polygon
              points={rosePoints}
              fill="hsl(var(--primary) / 0.2)"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />

            {sideIndices.map((index) => {
              const angle = index * angleStep;
              const magnitude = roseData.counts[index] / roseData.maxCount;
              const point = axisPoint(angle, magnitude * radius);
              return (
                <circle
                  key={`rose-point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill="hsl(var(--primary))"
                />
              );
            })}

            <circle
              cx={center}
              cy={center}
              r={4}
              fill="hsl(var(--foreground))"
            />
          </svg>

          {!isFullScale ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Considered values: {roseData.consideredValueCount} | Sides:{" "}
              {sideCount} | Packet window: {selectedRows.length}
            </div>
          ) : null}
        </div>
      )}
    </>
  );

  return (
    <div className="panel-content">
      <div className="panel-shell">
        {!isFullScale ? (
          <>
            <header className="panel-header">
              <h1 className="panel-title">Rose Diagram</h1>
              <p className="panel-subtitle">
                Plot one telemetry column directionally across a configurable
                definition.
              </p>
            </header>

            <section className="ui-card">
              <div className="grid gap-3">
                <div>
                  <label className="ui-label" htmlFor="rose-column">
                    Data Column
                  </label>
                  <select
                    id="rose-column"
                    className="ui-input"
                    value={selectedColumn}
                    onChange={(event) => setSelectedColumn(event.target.value)}
                  >
                    {telemetryColumns.length === 0 ? (
                      <option value="">No telemetry columns yet</option>
                    ) : (
                      telemetryColumns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="ui-label" htmlFor="rose-view-mode">
                    Viewing Mode
                  </label>
                  <select
                    id="rose-view-mode"
                    className="ui-input"
                    value={viewMode}
                    onChange={(event) =>
                      setViewMode(event.target.value as ViewMode)
                    }
                  >
                    <option value="range">Range</option>
                    <option value="cyclical">Cyclical</option>
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="ui-label" htmlFor="rose-min">
                      Min Value
                    </label>
                    <input
                      id="rose-min"
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
                    <label className="ui-label" htmlFor="rose-max">
                      Max Value
                    </label>
                    <input
                      id="rose-max"
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

                <div>
                  <label className="ui-label" htmlFor="rose-sides">
                    Definition (Sides)
                  </label>
                  <input
                    id="rose-sides"
                    type="text"
                    inputMode="numeric"
                    className="ui-input"
                    value={sidesInput}
                    onChange={(event) =>
                      setSidesInput(sanitizeIntegerInput(event.target.value))
                    }
                    onBlur={() => {
                      const parsed = Math.max(
                        1,
                        Math.round(parseNumber(sidesInput, 8)),
                      );
                      setSidesInput(String(parsed));
                    }}
                  />
                </div>
              </div>
            </section>
          </>
        ) : null}

        <section className={`ui-card relative ${isFullScale ? "h-full" : ""}`}>
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
          {roseDiagramContent}
        </section>
      </div>
    </div>
  );
};
