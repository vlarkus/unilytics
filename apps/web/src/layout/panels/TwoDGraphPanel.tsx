import React, { useEffect, useMemo, useState } from "react";
import type { PanelProps } from "../PanelRegistry";
import { useRobotTelemetry } from "../use-robot-telemetry";

export const twoDGraphPanelTags = ["chart", "2d", "graph", "visualization", "analysis"];

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

  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [xMinInput, setXMinInput] = useState("-72");
  const [xMaxInput, setXMaxInput] = useState("72");
  const [yMinInput, setYMinInput] = useState("-72");
  const [yMaxInput, setYMaxInput] = useState("72");
  const [isFullScale, setIsFullScale] = useState(false);
  const [displayMode, setDisplayMode] = useState<"separate" | "lines">("separate");

  useEffect(() => {
    if (telemetryColumns.length === 0) {
      setXColumn("");
      setYColumn("");
      return;
    }

    if (!telemetryColumns.includes(xColumn)) {
      setXColumn(telemetryColumns[0]);
    }

    if (!telemetryColumns.includes(yColumn)) {
      setYColumn(telemetryColumns[Math.min(1, telemetryColumns.length - 1)]);
    }
  }, [telemetryColumns, xColumn, yColumn]);

  const selectedRows = useMemo(() => {
    if (telemetryRows.length === 0) return [] as typeof telemetryRows;
    const maxIndex = telemetryRows.length - 1;
    const startIndex = Math.min(Math.max(packetSelection.startIndex, 0), maxIndex);
    const endIndex = Math.min(Math.max(packetSelection.endIndex, 0), maxIndex);
    const lower = Math.min(startIndex, endIndex);
    const upper = Math.max(startIndex, endIndex);
    return telemetryRows.slice(lower, upper + 1);
  }, [packetSelection.endIndex, packetSelection.startIndex, telemetryRows]);

  const xMin = parseNumber(xMinInput, -72);
  const xMax = parseNumber(xMaxInput, 72);
  const yMin = parseNumber(yMinInput, -72);
  const yMax = parseNumber(yMaxInput, 72);
  const xLow = Math.min(xMin, xMax);
  const xHigh = Math.max(xMin, xMax);
  const yLow = Math.min(yMin, yMax);
  const yHigh = Math.max(yMin, yMax);
  const xSpan = Math.max(xHigh - xLow, Number.EPSILON);
  const ySpan = Math.max(yHigh - yLow, Number.EPSILON);

  const points = useMemo(() => {
    if (!xColumn || !yColumn) return [] as Array<{ x: number; y: number }>;
    return selectedRows
      .map((row) => {
        const xRaw = row.values[xColumn];
        const yRaw = row.values[yColumn];
        const x = typeof xRaw === "number" ? xRaw : Number(xRaw);
        const y = typeof yRaw === "number" ? yRaw : Number(yRaw);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y };
      })
      .filter((point): point is { x: number; y: number } => point !== null);
  }, [selectedRows, xColumn, yColumn]);

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

  const chartCard = (
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
        <i className={`fa-solid ${isFullScale ? "fa-compress" : "fa-expand"}`} aria-hidden="true" />
      </button>

      {!xColumn || !yColumn || visiblePoints.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No points in the selected X/Y ranges for the current packet window.
        </div>
      ) : (
        <div className="w-full">
          <svg
            viewBox={`0 0 ${chartSize} ${chartSize}`}
            className="block w-full h-auto max-h-[72vh] bg-transparent"
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

            <text
              x={chartSize / 2}
              y={chartSize - 18}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="12"
            >
              {xColumn} [{xLow}..{xHigh}]
            </text>
            <text
              x={20}
              y={chartSize / 2}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="12"
              transform={`rotate(-90 20 ${chartSize / 2})`}
            >
              {yColumn} [{yLow}..{yHigh}]
            </text>

            {visiblePoints.map((point, index) => (
              <circle
                key={`${point.x}-${point.y}-${index}`}
                cx={toSvgX(point.x)}
                cy={toSvgY(point.y)}
                r={2.8}
                fill="hsl(var(--primary))"
              />
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
              />
            ) : null}
          </svg>
        </div>
      )}
    </section>
  );

  return (
    <div className="panel-content">
      <div className="panel-shell">
        {!isFullScale ? (
          <>
            <header className="panel-header">
              <h1 className="panel-title">2D Graph</h1>
              <p className="panel-subtitle">
                Plot telemetry points in XY space for the selected packet window.
              </p>
            </header>

            {chartCard}

            <section className="ui-card">
              <div className="grid gap-3">
                <div>
                  <label className="ui-label" htmlFor="graph-x-column">
                    X Axis Column
                  </label>
                  <select
                    id="graph-x-column"
                    className="ui-input"
                    value={xColumn}
                    onChange={(event) => setXColumn(event.target.value)}
                  >
                    {telemetryColumns.length === 0 ? (
                      <option value="">No telemetry columns yet</option>
                    ) : (
                      telemetryColumns.map((column) => (
                        <option key={`x-${column}`} value={column}>
                          {column}
                        </option>
                      ))
                    )}
                  </select>
                </div>

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

                <div className="h-px w-full bg-border" />

                <div>
                  <label className="ui-label" htmlFor="graph-y-column">
                    Y Axis Column
                  </label>
                  <select
                    id="graph-y-column"
                    className="ui-input"
                    value={yColumn}
                    onChange={(event) => setYColumn(event.target.value)}
                  >
                    {telemetryColumns.length === 0 ? (
                      <option value="">No telemetry columns yet</option>
                    ) : (
                      telemetryColumns.map((column) => (
                        <option key={`y-${column}`} value={column}>
                          {column}
                        </option>
                      ))
                    )}
                  </select>
                </div>

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
              </div>
            </section>

            <section className="ui-card">
              <select
                className="ui-input"
                value={displayMode}
                onChange={(event) =>
                  setDisplayMode(event.target.value as "separate" | "lines")
                }
              >
                <option value="separate">Keep Dots Separate</option>
                <option value="lines">Connect Neighboring Dots</option>
              </select>
            </section>
          </>
        ) : (
          chartCard
        )}
      </div>
    </div>
  );
};
