import React, { useState, useRef, useEffect } from 'react';
import { Layout, Model, TabNode, Actions, DockLocation } from 'flexlayout-react';
import { Settings, Plus, Search } from 'lucide-react';
import 'flexlayout-react/style/light.css';
import { panelRegistry, defaultLayout } from './PanelRegistry';
import { WelcomePanel } from './panels/BuiltInPanels';
import { StyleGuidePanel } from './panels/StyleGuidePanel';
import { RobotConnectionPanel } from './panels/RobotConnectionPanel';
import { TelemetryTablePanel } from './panels/TelemetryTablePanel';
import { PacketSelectionPanel } from './panels/PacketSelectionPanel';
import { MonovariateRoseDiagramPanel } from './panels/MonovariateRoseDiagramPanel';

// Register built-in panels
panelRegistry.register('WelcomePanel', WelcomePanel, 'Welcome');
panelRegistry.register('StyleGuidePanel', StyleGuidePanel, 'UI Reference');
panelRegistry.register('RobotConnectionPanel', RobotConnectionPanel, 'Robot Connection');
panelRegistry.register('TelemetryTablePanel', TelemetryTablePanel, 'Telemetry Table');
panelRegistry.register('PacketSelectionPanel', PacketSelectionPanel, 'Packet Selection');
panelRegistry.register('MonovariateRoseDiagramPanel', MonovariateRoseDiagramPanel, 'Monovariate Rose Diagram');

interface MainScreenProps {
    onOpenSettings: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({ onOpenSettings }) => {
    const [model] = useState(() => Model.fromJson(defaultLayout));
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const addPanelRef = useRef<HTMLDivElement>(null);
    const nextPanelId = useRef(0);

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
        if (!componentType) return <div className="p-2 text-destructive">Unknown Component</div>;
        const Component = panelRegistry.get(componentType);
        if (Component) return <Component node={node} />;
        return <div className="flex items-center justify-center h-full text-muted-foreground">Panel type "{componentType}" not found.</div>;
    };

    const onAddPanel = (panelType: string) => {
        let parentId = 'root';
        const location = DockLocation.CENTER;
        const mainWorkspaceTabset = model.getFirstTabSet();
        if (mainWorkspaceTabset) {
            parentId = mainWorkspaceTabset.getId();
        }
        const panelDisplayName = panelRegistry.getDisplayName(panelType);

        model.doAction(Actions.addNode({
            type: 'tab',
            component: panelType,
            name: panelDisplayName,
            id: `${panelType}-${nextPanelId.current++}`
        }, parentId, location, -1));

        setIsAddPanelOpen(false);
    };

    const availablePanels = panelRegistry.getAvailablePanels().filter(p =>
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-screen h-screen bg-background text-foreground flex flex-col">
            {/* Top Bar */}
            <div className="ui-topbar sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg tracking-tight">Adaptive Dashboard</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Add Panel Button & Dropdown */}
                    <div className="relative" ref={addPanelRef}>
                        <button
                            className={`ui-icon-btn ${isAddPanelOpen ? 'ui-icon-btn-active' : ''}`}
                            onClick={() => setIsAddPanelOpen(!isAddPanelOpen)}
                            title="Add Panel"
                        >
                            <Plus size={20} />
                        </button>

                        {isAddPanelOpen && (
                            <div
                                className="add-panel-menu ui-menu absolute right-0 top-full mt-2 w-64 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100"
                            >
                                {/* Search Bar */}
                                <div className="p-3 border-b border-border flex items-center gap-2">
                                    <Search size={16} className="text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search panels..."
                                        className="ui-input h-8 py-1 px-2 text-sm border-0 bg-transparent focus-visible:ring-0"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                {/* Panel List */}
                                <div className="max-h-60 overflow-y-auto py-1">
                                    {availablePanels.length > 0 ? (
                                        availablePanels.map(panel => (
                                            <button
                                                key={panel.type}
                                                className="ui-menu-item"
                                                onClick={() => onAddPanel(panel.type)}
                                            >
                                                {panel.displayName}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                                            No panels found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Settings Button */}
                    <button
                        className="ui-icon-btn"
                        onClick={onOpenSettings}
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Workspace */}
            <div className="flex-1 relative bg-background p-2">
                <div className="w-full h-full relative">
                    <Layout
                        model={model}
                        factory={factory}
                        realtimeResize={true}
                        classNameMapper={(className) => className}
                    />
                </div>
            </div>
        </div>
    );
};
