import React, { useState, useRef, useEffect } from "react";
import {
  Layout,
  Model,
  TabNode,
  Actions,
  DockLocation,
} from "flexlayout-react";
import { Plus, Search, Save, FolderOpen } from "lucide-react";
import "flexlayout-react/style/light.css";
import { panelRegistry, defaultLayout } from "./PanelRegistry";
import { robotTelemetryManager } from "./robot-telemetry-manager";
import { WelcomePanel, welcomePanelTags } from "./panels/BuiltInPanels";
import { StyleGuidePanel, styleGuidePanelTags } from "./panels/StyleGuidePanel";
import {
  RobotConnectionPanel,
  robotConnectionPanelTags,
} from "./panels/RobotConnectionPanel";
import {
  TelemetryTablePanel,
  telemetryTablePanelTags,
} from "./panels/TelemetryTablePanel";
import {
  PacketSelectionPanel,
  packetSelectionPanelTags,
} from "./panels/PacketSelectionPanel";
import {
  RoseDiagramPanel,
  RoseDiagramPanelTags,
} from "./panels/RoseDiagramPanel";
import { PieChartPanel, pieChartPanelTags } from "./panels/PieChartPanel";
import { TwoDGraphPanel, twoDGraphPanelTags } from "./panels/TwoDGraphPanel";

// Register built-in panels
panelRegistry.register(
  "WelcomePanel",
  WelcomePanel,
  "Welcome",
  welcomePanelTags,
);
panelRegistry.register(
  "StyleGuidePanel",
  StyleGuidePanel,
  "UI Reference",
  styleGuidePanelTags,
);
panelRegistry.register(
  "RobotConnectionPanel",
  RobotConnectionPanel,
  "Robot Connection",
  robotConnectionPanelTags,
);
panelRegistry.register(
  "TelemetryTablePanel",
  TelemetryTablePanel,
  "Telemetry Table",
  telemetryTablePanelTags,
);
panelRegistry.register(
  "PacketSelectionPanel",
  PacketSelectionPanel,
  "Packet Selection",
  packetSelectionPanelTags,
);
panelRegistry.register(
  "RoseDiagramPanel",
  RoseDiagramPanel,
  "Rose Diagram",
  RoseDiagramPanelTags,
);
panelRegistry.register(
  "PieChartPanel",
  PieChartPanel,
  "Pie Chart",
  pieChartPanelTags,
);
panelRegistry.register(
  "TwoDGraphPanel",
  TwoDGraphPanel,
  "2D Graph",
  twoDGraphPanelTags,
);

export const MainScreen: React.FC = () => {
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const [model] = useState(() => Model.fromJson(defaultLayout));
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addPanelRef = useRef<HTMLDivElement>(null);
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const nextPanelId = useRef(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        addPanelRef.current &&
        !addPanelRef.current.contains(event.target as Node)
      ) {
        setIsAddPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addPanelRef]);

  useEffect(() => {
    const isTouchOnly =
      window.matchMedia("(any-pointer: coarse)").matches &&
      !window.matchMedia("(any-pointer: fine)").matches;

    if (!isTouchOnly) return;

    model.doAction(
      Actions.updateModelAttributes({
        tabSetEnableDivide: false,
        tabSetEnableDrag: false,
        tabSetEnableDrop: false,
        enableEdgeDock: false,
      }),
    );
  }, [model]);

  const factory = (node: TabNode) => {
    const componentType = node.getComponent();
    if (!componentType)
      return <div className="p-2 text-destructive">Unknown Component</div>;
    const Component = panelRegistry.get(componentType);
    if (Component) return <Component node={node} />;
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Panel type "{componentType}" not found.
      </div>
    );
  };

  const onAddPanel = (panelType: string) => {
    let parentId = "root";
    const location = DockLocation.CENTER;
    const mainWorkspaceTabset = model.getFirstTabSet();
    if (mainWorkspaceTabset) {
      parentId = mainWorkspaceTabset.getId();
    }
    const panelDisplayName = panelRegistry.getDisplayName(panelType);

    model.doAction(
      Actions.addNode(
        {
          type: "tab",
          component: panelType,
          name: panelDisplayName,
          id: `${panelType}-${nextPanelId.current++}`,
        },
        parentId,
        location,
        -1,
      ),
    );

    setIsAddPanelOpen(false);
  };

  const renameTabWithPrompt = (node: TabNode) => {
    const currentName = node.getName() ?? "";
    const nextName = window.prompt("Rename tab", currentName);
    if (nextName === null) return;
    const trimmedName = nextName.trim();
    if (!trimmedName || trimmedName === currentName) return;
    model.doAction(Actions.renameTab(node.getId(), trimmedName));
  };

  const availablePanels = panelRegistry
    .getAvailablePanels()
    .filter(
      (p) =>
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );

  const onSavePackets = () => {
    const csv = robotTelemetryManager.exportTelemetryCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().replaceAll(":", "-");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `packets-${dateStamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const onOpenPacketsClick = () => {
    const shouldOpen = window.confirm(
      "Open packet file? This will overwrite current packets.",
    );
    if (!shouldOpen) return;
    openFileInputRef.current?.click();
  };

  const onOpenPacketsFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = robotTelemetryManager.importTelemetryCsv(text);
      window.alert(`Imported ${result.importedCount} packet rows.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      window.alert(`Failed to open packet CSV: ${message}`);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="w-screen h-screen bg-background text-foreground flex flex-col">
      {/* Top Bar */}
      <div className="ui-topbar sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt="Logo"
            className="h-7 w-auto select-none"
            draggable={false}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            className="ui-icon-btn"
            onClick={onSavePackets}
            title="Save Packets (CSV)"
          >
            <Save size={20} />
          </button>

          <button
            className="ui-icon-btn"
            onClick={onOpenPacketsClick}
            title="Open Packets (CSV)"
          >
            <FolderOpen size={20} />
          </button>

          <input
            ref={openFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onOpenPacketsFileChange}
          />

          {/* Add Panel Button & Dropdown */}
          <div className="relative" ref={addPanelRef}>
            <button
              className={`ui-icon-btn ${isAddPanelOpen ? "ui-icon-btn-active" : ""}`}
              onClick={() => setIsAddPanelOpen(!isAddPanelOpen)}
              title="Add Panel"
            >
              <Plus size={20} />
            </button>

            {isAddPanelOpen && (
              <div className="add-panel-menu ui-menu absolute right-0 top-full mt-2 w-64 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100">
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
                    availablePanels.map((panel) => (
                      <button
                        key={panel.type}
                        className="ui-menu-item"
                        onClick={() => onAddPanel(panel.type)}
                      >
                        <span className="truncate">{panel.displayName}</span>
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

        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 relative bg-background p-2">
        <div className="w-full h-full relative">
          <Layout
            model={model}
            factory={factory}
            realtimeResize={true}
            onRenderTab={(node, renderValues) => {
              renderValues.content = (
                <span
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    renameTabWithPrompt(node);
                  }}
                >
                  {renderValues.content}
                </span>
              );
            }}
            onAuxMouseClick={(node, event) => {
              if (event.button !== 1) return;
              if (!(node instanceof TabNode)) return;
              model.doAction(Actions.deleteTab(node.getId()));
            }}
            classNameMapper={(className) => className}
          />
        </div>
      </div>
    </div>
  );
};
