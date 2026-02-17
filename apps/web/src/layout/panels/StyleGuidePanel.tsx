/* eslint-disable react-refresh/only-export-components */
import React from "react";
import type { PanelProps } from "../PanelRegistry";

export const styleGuidePanelTags = ["dev", "design", "reference", "ui"];

const shadcnComponentRegistry = [
  "Accordion",
  "Alert",
  "Alert Dialog",
  "Aspect Ratio",
  "Avatar",
  "Badge",
  "Breadcrumb",
  "Button",
  "Button Group",
  "Calendar",
  "Card",
  "Carousel",
  "Chart",
  "Checkbox",
  "Collapsible",
  "Combobox",
  "Command",
  "Context Menu",
  "Data Table",
  "Date Picker",
  "Dialog",
  "Drawer",
  "Dropdown Menu",
  "Hover Card",
  "Input",
  "Input OTP",
  "Label",
  "Menubar",
  "Navigation Menu",
  "Pagination",
  "Popover",
  "Progress",
  "Radio Group",
  "Resizable",
  "Scroll Area",
  "Select",
  "Separator",
  "Sheet",
  "Sidebar",
  "Skeleton",
  "Slider",
  "Sonner",
  "Switch",
  "Table",
  "Tabs",
  "Textarea",
  "Toast",
  "Toggle",
  "Toggle Group",
  "Tooltip",
  "Typography",
];

export const StyleGuidePanel: React.FC<PanelProps> = () => {
  const graphData = [
    { t: "00:00", v: 12.1 },
    { t: "00:10", v: 12.3 },
    { t: "00:20", v: 12.25 },
    { t: "00:30", v: 12.5 },
    { t: "00:40", v: 12.45 },
    { t: "00:50", v: 12.7 },
    { t: "01:00", v: 12.62 },
  ];

  const chartWidth = 560;
  const chartHeight = 240;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 16;
  const padBottom = 34;
  const minValue = 12.0;
  const maxValue = 12.8;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const valueToY = (value: number) =>
    padTop + ((maxValue - value) / (maxValue - minValue)) * plotHeight;

  const points = graphData.map((d, i) => ({
    x: padLeft + (i / (graphData.length - 1)) * plotWidth,
    y: valueToY(d.v),
    label: d.t,
    value: d.v,
  }));

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const yTicks = [12.8, 12.6, 12.4, 12.2, 12.0];

  return (
    <div className="panel-content animate-in fade-in duration-300">
      <div className="panel-shell">
        <section className="ui-grid-2">
          <div className="ui-card">
            <h2 className="ui-card-title">Buttons</h2>
            <div className="flex flex-wrap gap-2">
              <button className="ui-btn ui-btn-primary">Primary</button>
              <button className="ui-btn ui-btn-secondary">Secondary</button>
              <button className="ui-btn ui-btn-outline">Outline</button>
              <button className="ui-btn ui-btn-ghost">Ghost</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="ui-badge ui-badge-default">Default</span>
              <span className="ui-badge ui-badge-secondary">Secondary</span>
              <span className="ui-badge ui-badge-outline">Outline</span>
              <span className="ui-badge ui-badge-info">Info</span>
              <span className="ui-badge ui-badge-success">Success</span>
              <span className="ui-badge ui-badge-warning">Warning</span>
              <span className="ui-badge ui-badge-error">Error</span>
            </div>
          </div>

          <div className="ui-card">
            <h2 className="ui-card-title">Inputs</h2>
            <label className="ui-label" htmlFor="display-name">
              Display name
            </label>
            <input
              id="display-name"
              className="ui-input"
              placeholder="Practice Dashboard"
            />

            <label className="ui-label mt-3" htmlFor="mode">
              Mode
            </label>
            <select id="mode" className="ui-input">
              <option>Practice</option>
              <option>Autonomous</option>
              <option>TeleOp</option>
            </select>

            <label className="ui-label mt-3" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className="ui-input min-h-24 resize-y"
              placeholder="Any setup notes..."
            />
          </div>
        </section>

        <section className="ui-grid-2">
          <div className="ui-card">
            <h2 className="ui-card-title">Checks, Radios, Switches</h2>
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input bg-background"
                  defaultChecked
                />
                Enable recording
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="team"
                  className="h-4 w-4 border-input bg-background"
                  defaultChecked
                />
                Team A
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="team"
                  className="h-4 w-4 border-input bg-background"
                />
                Team B
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="ui-switch" defaultChecked />
                Use dark interface
              </label>
            </div>
          </div>

          <div className="ui-card">
            <h2 className="ui-card-title">Slider + Progress</h2>
            <label className="ui-label" htmlFor="smooth">
              Smoothing
            </label>
            <input
              id="smooth"
              type="range"
              min={0}
              max={100}
              defaultValue={64}
              className="ui-range"
            />

            <div className="mt-5">
              <div className="ui-label">Upload progress</div>
              <div className="ui-progress">
                <div className="ui-progress-bar" style={{ width: "62%" }} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border border-border p-2 text-center">
                Low
              </div>
              <div className="rounded-md border border-border p-2 text-center bg-secondary text-secondary-foreground">
                Medium
              </div>
              <div className="rounded-md border border-border p-2 text-center">
                High
              </div>
            </div>
          </div>
        </section>

        <section className="ui-grid-2">
          <div className="ui-card">
            <h2 className="ui-card-title">Alerts + Toast Style</h2>
            <div className="space-y-2">
              <div className="ui-alert ui-alert-info">
                <div className="ui-alert-title">Info</div>
                <div className="ui-alert-desc">
                  Telemetry stream connected successfully.
                </div>
              </div>
              <div className="ui-alert ui-alert-success">
                <div className="ui-alert-title">Success</div>
                <div className="ui-alert-desc">
                  Robot profile synced and validated.
                </div>
              </div>
              <div className="ui-alert ui-alert-warning">
                <div className="ui-alert-title">Warning</div>
                <div className="ui-alert-desc">
                  Packet latency has increased to 48ms.
                </div>
              </div>
              <div className="ui-alert ui-alert-error">
                <div className="ui-alert-title">Error</div>
                <div className="ui-alert-desc">
                  Driver station disconnected unexpectedly.
                </div>
              </div>
              <div className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="font-medium">Toast Preview</div>
                <div className="text-muted-foreground">
                  Saved layout settings.
                </div>
              </div>
            </div>
          </div>

          <div className="ui-card">
            <h2 className="ui-card-title">Table / Data</h2>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Battery</td>
                  <td>12.4V</td>
                  <td>
                    <span className="ui-badge ui-badge-success">Nominal</span>
                  </td>
                </tr>
                <tr>
                  <td>Loop Time</td>
                  <td>18ms</td>
                  <td>
                    <span className="ui-badge ui-badge-info">Good</span>
                  </td>
                </tr>
                <tr>
                  <td>IMU Drift</td>
                  <td>0.5deg</td>
                  <td>
                    <span className="ui-badge ui-badge-warning">Watch</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="ui-grid-2">
          <div className="ui-card">
            <h2 className="ui-card-title">Line Graph (Telemetry)</h2>
            <div className="ui-chart-bars mb-4">
              <div className="ui-chart-bar" style={{ width: "80%" }} />
              <div
                className="ui-chart-bar"
                style={{ width: "54%", backgroundColor: "hsl(var(--chart-2))" }}
              />
              <div
                className="ui-chart-bar"
                style={{ width: "68%", backgroundColor: "hsl(var(--chart-3))" }}
              />
              <div
                className="ui-chart-bar"
                style={{ width: "40%", backgroundColor: "hsl(var(--chart-4))" }}
              />
            </div>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-52 rounded-md bg-zinc-950"
            >
              {yTicks.map((tick) => {
                const y = valueToY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartWidth - padRight}
                      y2={y}
                      stroke="hsl(var(--muted-foreground) / 0.35)"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="hsl(var(--muted-foreground))"
                    >
                      {tick.toFixed(1)}
                    </text>
                  </g>
                );
              })}
              <line
                x1={padLeft}
                y1={padTop}
                x2={padLeft}
                y2={chartHeight - padBottom}
                stroke="hsl(var(--muted-foreground) / 0.6)"
                strokeWidth="1"
              />
              <line
                x1={padLeft}
                y1={chartHeight - padBottom}
                x2={chartWidth - padRight}
                y2={chartHeight - padBottom}
                stroke="hsl(var(--muted-foreground) / 0.6)"
                strokeWidth="1"
              />
              <polygon
                fill="hsl(var(--primary) / 0.16)"
                points={`${linePoints} ${chartWidth - padRight},${chartHeight - padBottom} ${padLeft},${chartHeight - padBottom}`}
              />
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                points={linePoints}
              />
              {points.map((point) => (
                <g key={`${point.label}-${point.value}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="3.5"
                    fill="hsl(var(--primary))"
                  />
                  <text
                    x={point.x}
                    y={point.y - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="hsl(var(--foreground))"
                  >
                    {point.value.toFixed(2)}
                  </text>
                </g>
              ))}
              {points.map((point) => (
                <text
                  key={`x-${point.label}`}
                  x={point.x}
                  y={chartHeight - padBottom + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="hsl(var(--muted-foreground))"
                >
                  {point.label}
                </text>
              ))}
              <text
                x={chartWidth / 2}
                y={chartHeight - 4}
                textAnchor="middle"
                fontSize="11"
                fill="hsl(var(--muted-foreground))"
              >
                Time
              </text>
              <text
                x={12}
                y={chartHeight / 2}
                textAnchor="middle"
                fontSize="11"
                fill="hsl(var(--muted-foreground))"
                transform={`rotate(-90 12 ${chartHeight / 2})`}
              >
                Voltage (V)
              </text>
            </svg>
          </div>

          <div className="ui-card">
            <h2 className="ui-card-title">Charts: Pie + Donut</h2>
            <div className="flex items-center gap-6">
              <div
                className="h-28 w-28 rounded-full"
                style={{
                  background:
                    "conic-gradient(hsl(var(--chart-1)) 0 38%, hsl(var(--chart-2)) 38% 64%, hsl(var(--chart-3)) 64% 82%, hsl(var(--chart-4)) 82% 100%)",
                }}
              />
              <div
                className="h-28 w-28 rounded-full relative"
                style={{
                  background:
                    "conic-gradient(hsl(var(--chart-1)) 0 45%, hsl(var(--chart-2)) 45% 70%, hsl(var(--chart-5)) 70% 100%)",
                }}
              >
                <div className="absolute inset-5 rounded-full bg-background border border-border" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Pie and donut previews for category distributions.
            </p>
          </div>
        </section>

        <section className="ui-card">
          <h2 className="ui-card-title">Navigation / Layout Patterns</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <button className="ui-btn ui-btn-outline">Overview</button>
            <button className="ui-btn ui-btn-secondary">Live Data</button>
            <button className="ui-btn ui-btn-outline">Logs</button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="ui-badge ui-badge-outline">Breadcrumb</span>
            <span className="ui-badge ui-badge-outline">Pagination</span>
            <span className="ui-badge ui-badge-outline">Menubar</span>
            <span className="ui-badge ui-badge-outline">Dropdown</span>
            <span className="ui-badge ui-badge-outline">
              Dialog/Sheet/Drawer
            </span>
          </div>
        </section>

        <section className="ui-card">
          <h2 className="ui-card-title">
            Official Shadcn Component Registry Coverage
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Full list from shadcn components docs. Use this as your
            implementation checklist for production panels.
          </p>
          <div className="flex flex-wrap gap-2">
            {shadcnComponentRegistry.map((componentName) => (
              <span key={componentName} className="ui-badge ui-badge-outline">
                {componentName}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
