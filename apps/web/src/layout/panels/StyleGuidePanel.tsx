import React from 'react';
import type { PanelProps } from '../PanelRegistry';

export const StyleGuidePanel: React.FC<PanelProps> = () => {
    return (
        <div className="panel-content animate-in fade-in duration-300">
            <div className="panel-shell">
                <header className="panel-header">
                    <h1 className="panel-title">UI Reference</h1>
                    <p className="panel-subtitle">All sample controls read from shared global styles in one place.</p>
                </header>

                <section className="ui-grid-2">
                    <div className="ui-card">
                        <h2 className="ui-card-title">Buttons</h2>
                        <div className="flex flex-wrap gap-2">
                            <button className="ui-btn ui-btn-primary">Primary</button>
                            <button className="ui-btn ui-btn-secondary">Secondary</button>
                            <button className="ui-btn ui-btn-outline">Outline</button>
                            <button className="ui-btn ui-btn-ghost">Ghost</button>
                        </div>
                    </div>
                    <div className="ui-card">
                        <h2 className="ui-card-title">Typography</h2>
                        <p className="text-sm text-muted-foreground">Small muted text</p>
                        <p className="text-base text-foreground">Body text for panel content and values.</p>
                        <p className="text-lg font-semibold tracking-tight">Heading Sample</p>
                    </div>
                </section>

                <section className="ui-grid-2">
                    <div className="ui-card">
                        <h2 className="ui-card-title">Form Fields</h2>
                        <label className="ui-label" htmlFor="name">Name</label>
                        <input id="name" className="ui-input" placeholder="Driver station" />

                        <label className="ui-label mt-3" htmlFor="mode">Mode</label>
                        <select id="mode" className="ui-input">
                            <option>Practice</option>
                            <option>Autonomous</option>
                            <option>TeleOp</option>
                        </select>

                        <label className="ui-label mt-3" htmlFor="notes">Notes</label>
                        <textarea id="notes" className="ui-input min-h-24 resize-y" placeholder="Add notes..." />
                    </div>

                    <div className="ui-card">
                        <h2 className="ui-card-title">Selection Controls</h2>
                        <div className="space-y-3 text-sm">
                            <label className="flex items-center gap-2 text-foreground">
                                <input type="checkbox" className="h-4 w-4 rounded border-input bg-background" />
                                Enable log capture
                            </label>
                            <label className="flex items-center gap-2 text-foreground">
                                <input type="radio" name="team" className="h-4 w-4 border-input bg-background" />
                                Team A
                            </label>
                            <label className="flex items-center gap-2 text-foreground">
                                <input type="radio" name="team" className="h-4 w-4 border-input bg-background" />
                                Team B
                            </label>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
