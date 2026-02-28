/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useMemo, useState } from "react";
import type { PanelProps } from "../PanelRegistry";
import { useRobotTelemetry } from "../use-robot-telemetry";
import { SearchableSelect } from "../../components/SearchableSelect";

export const pieChartPanelTags = ["chart", "pie", "visualization", "analysis"];
type OrderMode = "set" | "frequency";
type ColorMode = "custom" | "gradient";
type GradientPreset =
  | "rainbow"
  | "traffic-light"
  | "sunset"
  | "ocean"
  | "viridis"
  | "cool-warm";

interface ValueBucket {
  key: string;
  label: string;
  count: number;
}

const compareBucketByValue = (a: ValueBucket, b: ValueBucket) => {
  const aNum = Number(a.label);
  const bNum = Number(b.label);
  const aIsNum = Number.isFinite(aNum);
  const bIsNum = Number.isFinite(bNum);

  if (aIsNum && bIsNum) {
    return aNum - bNum;
  }

  return a.label.localeCompare(b.label, undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const HSL_MAX = 360;

const hslToHex = (h: number, s: number, l: number) => {
  const hh = ((h % HSL_MAX) + HSL_MAX) % HSL_MAX / HSL_MAX;
  const ss = Math.max(0, Math.min(1, s));
  const ll = Math.max(0, Math.min(1, l));
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const r = hue2rgb(p, q, hh + 1 / 3);
  const g = hue2rgb(p, q, hh);
  const b = hue2rgb(p, q, hh - 1 / 3);

  const toHex = (value: number) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return [255, 255, 255];
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
};

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const interpolateHex = (fromHex: string, toHex: string, t: number) => {
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
};

const colorFromKey = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const hue = hash % HSL_MAX;
  return hslToHex(hue, 0.75, 0.55);
};

const toValueKey = (value: unknown) => `${typeof value}:${String(value)}`;

const GRADIENT_STOPS: Record<GradientPreset, string[]> = {
  rainbow: ["#ff004d", "#ff8a00", "#ffe600", "#00d26a", "#00a6ff", "#8b5cf6"],
  "traffic-light": ["#ef4444", "#f59e0b", "#22c55e"],
  sunset: ["#ff5f6d", "#ffc371", "#ff8fab", "#8a4fff"],
  ocean: ["#0ea5e9", "#06b6d4", "#14b8a6", "#22c55e"],
  viridis: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
  "cool-warm": ["#3b82f6", "#60a5fa", "#93c5fd", "#fca5a5", "#ef4444"],
};

const buildGradientPalette = (preset: GradientPreset, count: number) => {
  if (count <= 0) return [] as string[];
  if (count === 1) return [GRADIENT_STOPS[preset][0]];

  const stops = GRADIENT_STOPS[preset];
  const segmentCount = Math.max(1, stops.length - 1);

  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0 : index / (count - 1);
    const scaled = t * segmentCount;
    const leftIndex = Math.min(Math.floor(scaled), segmentCount - 1);
    const rightIndex = Math.min(leftIndex + 1, stops.length - 1);
    const localT = scaled - leftIndex;
    return interpolateHex(stops[leftIndex], stops[rightIndex], localT);
  });
};

export const PieChartPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows, packetSelection } = useRobotTelemetry();

  const [selectedColumn, setSelectedColumn] = useState("");
  const [orderMode, setOrderMode] = useState<OrderMode>("set");
  const [colorMode, setColorMode] = useState<ColorMode>("custom");
  const [gradientPreset, setGradientPreset] = useState<GradientPreset>("rainbow");
  const [isFullScale, setIsFullScale] = useState(false);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [setOrderKeys, setSetOrderKeys] = useState<string[]>([]);

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
    const startIndex = Math.min(Math.max(packetSelection.startIndex, 0), maxIndex);
    const endIndex = Math.min(Math.max(packetSelection.endIndex, 0), maxIndex);
    const lower = Math.min(startIndex, endIndex);
    const upper = Math.max(startIndex, endIndex);
    return telemetryRows.slice(lower, upper + 1);
  }, [packetSelection.endIndex, packetSelection.startIndex, telemetryRows]);

  const buckets = useMemo(() => {
    if (!selectedColumn) return [] as ValueBucket[];

    const map = new Map<string, ValueBucket>();
    selectedRows.forEach((row) => {
      const rawValue = row.values[selectedColumn];
      if (rawValue === undefined) return;
      const key = toValueKey(rawValue);
      const label = String(rawValue);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, label, count: 1 });
      }
    });

    return Array.from(map.values()).sort(compareBucketByValue);
  }, [selectedColumn, selectedRows]);

  useEffect(() => {
    queueMicrotask(() => {
      setSetOrderKeys((previousOrder) => {
        const appended = buckets
          .map((bucket) => bucket.key)
          .filter((key) => !previousOrder.includes(key));
        return [...previousOrder, ...appended];
      });
    });
  }, [buckets]);

  useEffect(() => {
    queueMicrotask(() => {
      setEnabledMap((prev) => {
        const next: Record<string, boolean> = {};
        buckets.forEach((bucket) => {
          next[bucket.key] = prev[bucket.key] ?? true;
        });
        return next;
      });

      setColorMap((prev) => {
        const next: Record<string, string> = { ...prev };
        buckets.forEach((bucket) => {
          next[bucket.key] = prev[bucket.key] ?? colorFromKey(bucket.key);
        });
        return next;
      });
    });
  }, [buckets]);

  const orderedBuckets = useMemo(() => {
    if (orderMode === "frequency") {
      return [...buckets].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return compareBucketByValue(a, b);
      });
    }

    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    return setOrderKeys.map((key) => byKey.get(key)).filter((bucket): bucket is ValueBucket => Boolean(bucket));
  }, [buckets, orderMode, setOrderKeys]);

  const moveSetOrderItem = (key: string, direction: -1 | 1) => {
    setSetOrderKeys((previous) => {
      const index = previous.indexOf(key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= previous.length) {
        return previous;
      }
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const visibleBuckets = orderedBuckets.filter((bucket) => enabledMap[bucket.key] !== false);
  const visibleCount = visibleBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  const gradientColorMap = useMemo(() => {
    const palette = buildGradientPalette(gradientPreset, orderedBuckets.length);
    const next: Record<string, string> = {};
    orderedBuckets.forEach((bucket, index) => {
      next[bucket.key] = palette[index] ?? colorFromKey(bucket.key);
    });
    return next;
  }, [gradientPreset, orderedBuckets]);

  const chartSize = 560;
  const center = chartSize / 2;
  const radius = 200;

  const slices = useMemo(() => {
    if (visibleBuckets.length === 0 || visibleCount === 0) return [] as Array<{
      key: string;
      color: string;
      path: string;
      count: number;
      label: string;
    }>;

    let startAngle = -Math.PI / 2;
    return visibleBuckets.map((bucket) => {
      const angle = (bucket.count / visibleCount) * 2 * Math.PI;
      const endAngle = startAngle + angle;

      const x1 = center + Math.cos(startAngle) * radius;
      const y1 = center + Math.sin(startAngle) * radius;
      const x2 = center + Math.cos(endAngle) * radius;
      const y2 = center + Math.sin(endAngle) * radius;
      const largeArc = angle > Math.PI ? 1 : 0;

      const path =
        angle >= 2 * Math.PI - 1e-6
          ? `M ${center - radius} ${center} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`
          : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      startAngle = endAngle;
      return {
        key: bucket.key,
        color:
          colorMode === "gradient"
            ? (gradientColorMap[bucket.key] ?? colorFromKey(bucket.key))
            : (colorMap[bucket.key] ?? colorFromKey(bucket.key)),
        path,
        count: bucket.count,
        label: bucket.label,
      };
    });
  }, [center, colorMap, colorMode, gradientColorMap, radius, visibleBuckets, visibleCount]);

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

      {!selectedColumn || buckets.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No values available for the selected column in the current packet
          range.
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
              stroke="hsl(var(--foreground) / 0.35)"
              strokeWidth="1"
            />

            {slices.map((slice) => (
              <path key={slice.key} d={slice.path} fill={slice.color}>
                <title>{`${slice.label}: ${slice.count}`}</title>
              </path>
            ))}

            <circle
              cx={center}
              cy={center}
              r={56}
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
            <text
              x={center}
              y={center - 6}
              textAnchor="middle"
              fontSize="12"
              fill="hsl(var(--muted-foreground))"
            >
              Visible
            </text>
            <text
              x={center}
              y={center + 16}
              textAnchor="middle"
              fontSize="14"
              fontWeight="600"
              fill="hsl(var(--foreground))"
            >
              {visibleCount}/{totalCount}
            </text>
          </svg>
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
                  <label className="ui-label" htmlFor="pie-column">
                    Data Column
                  </label>
                  <SearchableSelect
                    id="pie-column"
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
                  <label className="ui-label" htmlFor="pie-order-mode">
                    Order
                  </label>
                  <select
                    id="pie-order-mode"
                    className="ui-input"
                    value={orderMode}
                    onChange={(event) => setOrderMode(event.target.value as OrderMode)}
                  >
                    <option value="set">Set</option>
                    <option value="frequency">Frequency</option>
                  </select>
                </div>

                <div>
                  <label className="ui-label" htmlFor="pie-color-mode">
                    Color
                  </label>
                  <select
                    id="pie-color-mode"
                    className="ui-input"
                    value={colorMode}
                    onChange={(event) => setColorMode(event.target.value as ColorMode)}
                  >
                    <option value="custom">Custom</option>
                    <option value="gradient">Gradient</option>
                  </select>
                </div>

                {colorMode === "gradient" ? (
                  <div>
                    <label className="ui-label" htmlFor="pie-gradient-preset">
                      Gradient Preset
                    </label>
                    <select
                      id="pie-gradient-preset"
                      className="ui-input"
                      value={gradientPreset}
                      onChange={(event) =>
                        setGradientPreset(event.target.value as GradientPreset)
                      }
                    >
                      <option value="rainbow">Rainbow</option>
                      <option value="traffic-light">Traffic Light</option>
                      <option value="sunset">Sunset</option>
                      <option value="ocean">Ocean</option>
                      <option value="viridis">Viridis</option>
                      <option value="cool-warm">Cool Warm</option>
                    </select>
                  </div>
                ) : null}

                <div className="overflow-auto">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Show</th>
                        <th>Value</th>
                        <th>Count</th>
                        <th>Color</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buckets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-muted-foreground">
                            No entries for this column in selected packet range.
                          </td>
                        </tr>
                      ) : (
                        orderedBuckets.map((bucket, index) => (
                          <tr key={bucket.key}>
                            <td>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  className="ui-btn ui-btn-ghost h-7 w-7 p-0"
                                  onClick={() => moveSetOrderItem(bucket.key, -1)}
                                  disabled={orderMode !== "set" || index === 0}
                                  title="Move up"
                                >
                                  <i className="fa-solid fa-chevron-up" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="ui-btn ui-btn-ghost h-7 w-7 p-0"
                                  onClick={() => moveSetOrderItem(bucket.key, 1)}
                                  disabled={orderMode !== "set" || index === orderedBuckets.length - 1}
                                  title="Move down"
                                >
                                  <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={enabledMap[bucket.key] !== false}
                                onChange={(event) =>
                                  setEnabledMap((prev) => ({
                                    ...prev,
                                    [bucket.key]: event.target.checked,
                                  }))
                                }
                              />
                            </td>
                            <td>{bucket.label}</td>
                            <td>{bucket.count}</td>
                            <td>
                              {colorMode === "custom" ? (
                                <input
                                  type="color"
                                  value={colorMap[bucket.key] ?? "#ffffff"}
                                  onChange={(event) =>
                                    setColorMap((prev) => ({
                                      ...prev,
                                      [bucket.key]: event.target.value,
                                    }))
                                  }
                                  title={`Color for ${bucket.label}`}
                                  style={{
                                    width: "1.5rem",
                                    height: "1.5rem",
                                    padding: 0,
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "4px",
                                    background: "transparent",
                                  }}
                                />
                              ) : (
                                <span
                                  title={`Gradient color for ${bucket.label}`}
                                  style={{
                                    display: "inline-block",
                                    width: "1.5rem",
                                    height: "1.5rem",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "4px",
                                    background:
                                      gradientColorMap[bucket.key] ?? colorFromKey(bucket.key),
                                  }}
                                />
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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

