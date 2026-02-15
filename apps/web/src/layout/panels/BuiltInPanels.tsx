import React from 'react';
import type { PanelProps } from '../PanelRegistry';

export const WelcomePanel: React.FC<PanelProps> = () => {
    return (
        <div className="panel-content">
            <div className="panel-shell">
                <header className="panel-header">
                    <p className="panel-subtitle">Adaptive Telemetry Dashboard</p>
                    <h1 className="panel-title">Welcome</h1>
                    <p className="panel-subtitle">Build a workspace of panels for live robot data, logs, and diagnostics.</p>
                </header>

                <section className="ui-grid-2">
                    <div className="ui-card">
                        <h2 className="ui-card-title">1. Add Panels</h2>
                        <p className="panel-subtitle">Use the plus button in the top bar to add available panels.</p>
                    </div>
                    <div className="ui-card">
                        <h2 className="ui-card-title">2. Arrange Layout</h2>
                        <p className="panel-subtitle">Drag tabs between groups and resize splitters to fit your workflow.</p>
                    </div>
                </section>

                <section className="ui-card">
                    <h2 className="ui-card-title">Starter Checklist</h2>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>Add `UI Reference` first so you can preview controls.</li>
                        <li>Open `Settings` to configure project defaults.</li>
                        <li>Create custom panels when the base styles look correct.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};
