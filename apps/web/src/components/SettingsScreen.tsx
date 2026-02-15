import React from 'react';
import { X } from 'lucide-react';

interface SettingsScreenProps {
    onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
    return (
        <div className="w-full h-full flex flex-col bg-background text-foreground">
            {/* Header */}
            <div className="ui-topbar">
                <span className="font-semibold text-lg tracking-tight">Settings</span>
                <button
                    onClick={onClose}
                    className="ui-icon-btn"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="panel-shell">
                    <header className="panel-header">
                        <h2 className="panel-title">General Settings</h2>
                        <p className="panel-subtitle">Configure app behavior and dashboard defaults.</p>
                    </header>

                    <section className="ui-grid-2">
                        <div className="ui-card">
                            <h3 className="ui-card-title">Workspace</h3>
                            <label className="ui-label" htmlFor="layout-name">Layout name</label>
                            <input id="layout-name" className="ui-input" placeholder="Competition Setup" />

                            <label className="ui-label mt-3" htmlFor="refresh-rate">Refresh rate</label>
                            <select id="refresh-rate" className="ui-input">
                                <option>30 Hz</option>
                                <option>60 Hz</option>
                                <option>120 Hz</option>
                            </select>
                        </div>

                        <div className="ui-card">
                            <h3 className="ui-card-title">Preferences</h3>
                            <div className="space-y-3 text-sm">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="h-4 w-4 rounded border-input bg-background" />
                                    Enable panel animations
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="h-4 w-4 rounded border-input bg-background" />
                                    Show startup welcome
                                </label>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button className="ui-btn ui-btn-primary">Save</button>
                                <button className="ui-btn ui-btn-outline">Reset</button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
