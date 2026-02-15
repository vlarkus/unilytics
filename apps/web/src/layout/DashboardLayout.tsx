import React, { useState } from 'react';
import { Layout, Model, TabNode, Actions, DockLocation } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css'; // Import base styles
import { panelRegistry, defaultLayout } from './PanelRegistry';
import { WelcomePanel, TelemetryPanel } from './panels/BuiltInPanels';

// Register built-in panels - ensuring they are registered before render
panelRegistry.register('WelcomePanel', WelcomePanel);
panelRegistry.register('TelemetryPanel', TelemetryPanel);

export const DashboardLayout: React.FC = () => {
    const [model] = useState(() => Model.fromJson(defaultLayout));

    const factory = (node: TabNode) => {
        // ... (existing factory logic)
        const componentType = node.getComponent();
        if (!componentType) return <div className="p-2 text-red-500">Unknown Component</div>;
        const Component = panelRegistry.get(componentType);
        if (Component) return <Component node={node} />;
        return <div className="flex items-center justify-center h-full text-zinc-500">Panel type "{componentType}" not found.</div>;
    };

    const onAddPanel = (type: string) => {
        model.doAction(Actions.addNode({
            type: 'tab',
            component: type,
            name: type,
            id: `${type}-${Date.now()}`
        }, 'root', DockLocation.CENTER, -1));
    };

    return (
        <div className="w-screen h-screen bg-black flex flex-col">
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
                <span className="font-bold text-zinc-100 mr-4">Adaptive Dashboard</span>
                <button
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-sm rounded border border-zinc-700"
                    onClick={() => onAddPanel('WelcomePanel')}
                >
                    + Welcome
                </button>
                <button
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-sm rounded border border-zinc-700"
                    onClick={() => onAddPanel('TelemetryPanel')}
                >
                    + Telemetry
                </button>
            </div>
            <div className="flex-1 relative">
                <Layout
                    model={model}
                    factory={factory}
                    classNameMapper={(className) => className}
                />
            </div>
        </div>
    );
};
