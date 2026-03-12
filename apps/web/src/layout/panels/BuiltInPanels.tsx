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
          <h1 className="ui-card-title">More Info</h1>
          <p className="text-sm text-muted-foreground text-justify">
            <a
              href="https://github.com/vlarkus/unilytics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 decoration-primary/40 decoration-1 hover:underline transition-colors hover:text-primary/80"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 shrink-0 fill-current"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
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

