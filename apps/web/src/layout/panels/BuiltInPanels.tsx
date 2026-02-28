/* eslint-disable react-refresh/only-export-components */
import React from "react";
import type { PanelProps } from "../PanelRegistry";

export const welcomePanelTags = ["core", "home", "onboarding", "quick start"];

export const WelcomePanel: React.FC<PanelProps> = () => {
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <div className="panel-content">
      <div className="panel-shell">
        <div className="mb-4 flex justify-center">
          <img
            src={logoSrc}
            alt="Unilytics logo"
            className="h-50 w-auto select-none"
            draggable={false}
          />
        </div>
        <section className="ui-card">
          <h1 className="ui-card-title">Description</h1>
          <p className="text-sm text-muted-foreground text-justify">
            Unilytics is a customizable dashboard app for viewing and analyzing
            FTC robot telemetry. It was built by{" "}
            <strong className="ui-rainbow-text">14423 Robocorns</strong> to make
            debugging, tuning, and match analysis faster and easier during
            development and testing.
          </p>
        </section>
        <section className="ui-card">
          <h1 className="ui-card-title">Requirements</h1>
          <p className="mt-3 text-sm text-muted-foreground text-justify">
            To use this app, you need either a custom WebSocket implementation
            on your robot to connect and stream data, or a simple CSV file with
            prerecorded logs. You can also generate mock data and export it to
            see an example.
          </p>
        </section>

        <section className="ui-card">
          <h2 className="ui-card-title">Quick Start</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground text-left">
            <li>
              <strong>
                1. Open the <em>Connection</em> panel
              </strong>{" "}
              and enter the robot IP address.
            </li>
            <li>
              <strong>2. Connect</strong> and start collecting telemetry
              packets.
            </li>
            <li>
              <strong>3. Choose a packet range</strong> in the{" "}
              <em>Select Packets</em> panel.
            </li>
            <li>
              <strong>4. Open any analysis panels</strong> you find useful (for
              example, <em>Data Table</em>, <em>Rose Diagram</em>, or{" "}
              <em>Pie Chart</em>).
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
};

