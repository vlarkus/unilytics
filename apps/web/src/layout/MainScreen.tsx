import React, { useState, useRef, useEffect } from 'react';
import { Layout, Model, TabNode, Actions, DockLocation } from 'flexlayout-react';
import { Settings, Plus, Search } from 'lucide-react';
import 'flexlayout-react/style/dark.css';
import { panelRegistry, defaultLayout } from './PanelRegistry';
import { WelcomePanel, TelemetryPanel } from './panels/BuiltInPanels';
import { StyleGuidePanel } from './panels/StyleGuidePanel';

// Register built-in panels
panelRegistry.register('WelcomePanel', WelcomePanel);
panelRegistry.register('TelemetryPanel', TelemetryPanel);
panelRegistry.register('StyleGuidePanel', StyleGuidePanel);

interface MainScreenProps {
    onOpenSettings: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({ onOpenSettings }) => {
    const [model] = useState(() => Model.fromJson(defaultLayout));
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const addPanelRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (addPanelRef.current && !addPanelRef.current.contains(event.target as Node)) {
                setIsAddPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [addPanelRef]);

    const factory = (node: TabNode) => {
        const componentType = node.getComponent();
        if (!componentType) return <div className="p-2 text-red-500">Unknown Component</div>;
        const Component = panelRegistry.get(componentType);
        if (Component) return <Component node={node} />;
        return <div className="flex items-center justify-center h-full text-zinc-500">Panel type "{componentType}" not found.</div>;
    };

    const onAddPanel = (type: string) => {
        let parentId = 'root';
        let location = DockLocation.CENTER;

        // Try to add to the currently active tabset
        const activeTabset = model.getActiveTabset();
        if (activeTabset) {
            parentId = activeTabset.getId();
            location = DockLocation.CENTER; // Add as a new tab to existing set
        } else {
            // Fallback: try to find *any* tabset to append to
            // We can iterate the model to find the first tabset, but root/center usually works if layout isn't empty.
            // If layout is completely empty (no tabsets), we need to add to root.
            // If we add to root, it creates a new tabset.
        }

        model.doAction(Actions.addNode({
            type: 'tab',
            component: type,
            name: type,
            id: `${type}-${Date.now()}` // Ensure unique ID
        }, parentId, location, -1));

        setIsAddPanelOpen(false);
    };

    const availablePanels = panelRegistry.getAvailablePanels().filter(p =>
        p.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-screen h-screen bg-black flex flex-col">
            {/* Top Bar */}
            <div className="h-12 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-lg text-zinc-100">Magic Dashboard</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Add Panel Button & Dropdown */}
                    <div className="relative" ref={addPanelRef}>
                        <button
                            className={`p-2 rounded-md transition-colors ${isAddPanelOpen ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                            onClick={() => setIsAddPanelOpen(!isAddPanelOpen)}
                            title="Add Panel"
                        >
                            <Plus size={20} />
                        </button>

                        {isAddPanelOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                {/* Search Bar */}
                                <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
                                    <Search size={16} className="text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Search panels..."
                                        className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-zinc-600"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                {/* Panel List */}
                                <div className="max-h-60 overflow-y-auto py-1">
                                    {availablePanels.length > 0 ? (
                                        availablePanels.map(panelName => (
                                            <button
                                                key={panelName}
                                                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                                                onClick={() => onAddPanel(panelName)}
                                            >
                                                {panelName}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-xs text-zinc-500 text-center">
                                            No panels found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Settings Button */}
                    <button
                        className="p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-md transition-colors"
                        onClick={onOpenSettings}
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Workspace */}
            <div className="flex-1 relative bg-zinc-950" style={{ padding: 'var(--gap)' }}>
                <div className="w-full h-full relative">
                    <Layout
                        model={model}
                        factory={factory}
                        classNameMapper={(className) => className}
                    />
                </div>
            </div>
        </div>
    );
};
