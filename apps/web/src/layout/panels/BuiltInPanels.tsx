import React from 'react';
import type { PanelProps } from '../PanelRegistry';

export const WelcomePanel: React.FC<PanelProps> = ({ node }) => {
    return (
        <div className="p-4 h-full flex flex-col items-center justify-center text-center bg-zinc-900 text-white">
            <h1 className="text-2xl font-bold mb-2">Welcome to Adaptive Telemetry</h1>
            <p className="text-zinc-400">Drag this tab to reorder!</p>
        </div>
    );
};

export const TelemetryPanel: React.FC<PanelProps> = ({ node }) => {
    return (
        <div className="p-4 h-full bg-zinc-800 text-white">
            <h2 className="text-xl font-semibold mb-4">Telemetry Data</h2>
            <div className="space-y-2">
                <div className="flex justify-between border-b border-zinc-700 py-1">
                    <span>Battery</span>
                    <span className="text-green-400">12.4V</span>
                </div>
                <div className="flex justify-between border-b border-zinc-700 py-1">
                    <span>Status</span>
                    <span className="text-blue-400">Running</span>
                </div>
            </div>
        </div>
    );
};
