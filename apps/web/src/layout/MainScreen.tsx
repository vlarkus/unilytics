import React, { useState, useRef, useEffect } from "react";
import {
  Layout,
  Model,
  TabNode,
  Actions,
  DockLocation,
} from "flexlayout-react";
import { Plus, Search, Save, FolderOpen, Upload, Menu, LayoutGrid, HardDriveDownload, HardDriveUpload, Sun, Moon, Pencil, Trash2 } from "lucide-react";
import "flexlayout-react/style/light.css";
import { panelRegistry, defaultLayout } from "./PanelRegistry";
import { robotTelemetryManager } from "./robot-telemetry-manager";
import {
  getSavedLayouts,
  saveLayout,
  deleteLayout,
  renameLayout,
  getTheme,
  setTheme,
  type SavedLayout,
  type Theme,
} from "./layout-storage";
import { WelcomePanel, welcomePanelTags } from "./panels/BuiltInPanels";
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
import { HistogramPanel, histogramPanelTags } from "./panels/HistogramPanel";
import { LineGraphPanel, lineGraphPanelTags } from "./panels/LineGraphPanel";
import { HeatmapPanel, heatmapPanelTags } from "./panels/HeatmapPanel";
import { BoxPlotPanel, boxPlotPanelTags } from "./panels/BoxPlotPanel";
import { ViolinPlotPanel, violinPlotPanelTags } from "./panels/ViolinPlotPanel";
import { VideoSyncPanel, videoSyncPanelTags } from "./panels/VideoSyncPanel";
import { FilesPanel, filesPanelTags } from "./panels/FilesPanel";
import {
  HeadingVectorPanel,
  headingVectorPanelTags,
} from "./panels/HeadingVectorPanel";

// Register built-in panels
panelRegistry.register("WelcomePanel", WelcomePanel, "Welcome", welcomePanelTags, "General");
panelRegistry.register("RobotConnectionPanel", RobotConnectionPanel, "Connection", robotConnectionPanelTags, "General");
panelRegistry.register("TelemetryTablePanel", TelemetryTablePanel, "Data Table", telemetryTablePanelTags, "General");
panelRegistry.register("PacketSelectionPanel", PacketSelectionPanel, "Select Packets", packetSelectionPanelTags, "General");
panelRegistry.register("FilesPanel", FilesPanel, "Files", filesPanelTags, "General");
panelRegistry.register("LineGraphPanel", LineGraphPanel, "Line Graph", lineGraphPanelTags, "Charts");
panelRegistry.register("TwoDGraphPanel", TwoDGraphPanel, "2D Graph", twoDGraphPanelTags, "Charts");
panelRegistry.register("HistogramPanel", HistogramPanel, "Histogram", histogramPanelTags, "Charts");
panelRegistry.register("HeatmapPanel", HeatmapPanel, "Heatmap", heatmapPanelTags, "Charts");
panelRegistry.register("PieChartPanel", PieChartPanel, "Pie Chart", pieChartPanelTags, "Charts");
panelRegistry.register("BoxPlotPanel", BoxPlotPanel, "Box Plot", boxPlotPanelTags, "Charts");
panelRegistry.register("ViolinPlotPanel", ViolinPlotPanel, "Violin Plot", violinPlotPanelTags, "Charts");
panelRegistry.register("RoseDiagramPanel", RoseDiagramPanel, "Rose Diagram", RoseDiagramPanelTags, "Charts");
panelRegistry.register("HeadingVectorPanel", HeadingVectorPanel, "Round Dial", headingVectorPanelTags, "Charts");
panelRegistry.register("VideoSyncPanel", VideoSyncPanel, "Video Sync", videoSyncPanelTags, "Media");

const PANEL_CATEGORY_ORDER = ["General", "Charts", "Media"];


export const MainScreen: React.FC = () => {
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const [model, setModel] = useState(() => Model.fromJson(defaultLayout));
  const [openMenu, setOpenMenu] = useState<"menu" | "addPanel" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLayoutManager, setShowLayoutManager] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>(getSavedLayouts);
  const [saveLayoutModal, setSaveLayoutModal] = useState(false);
  const [saveLayoutName, setSaveLayoutName] = useState("");
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const openPresetInputRef = useRef<HTMLInputElement>(null);
  const openProjectInputRef = useRef<HTMLInputElement>(null);
  const nextPanelId = useRef(0);
  const saveLayoutInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

    setOpenMenu(null);
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

  const groupedPanels = PANEL_CATEGORY_ORDER
    .map((category) => ({
      category,
      panels: availablePanels.filter((p) => p.category === category),
    }))
    .filter((group) => group.panels.length > 0);

  const onSaveCurrentLayout = () => {
    setOpenMenu(null);
    setSaveLayoutName(`Layout ${savedLayouts.length + 1}`);
    setSaveLayoutModal(true);
    setTimeout(() => saveLayoutInputRef.current?.select(), 50);
  };

  const onConfirmSaveLayout = () => {
    const name = saveLayoutName.trim();
    if (!name) return;
    saveLayout(name, model.toJson());
    setSavedLayouts(getSavedLayouts());
    setSaveLayoutModal(false);
  };

  const onLoadSavedLayout = (layout: SavedLayout) => {
    try {
      const newModel = Model.fromJson(layout.layout);
      setModel(newModel);
      setOpenMenu(null);
      setShowLayoutManager(false);
    } catch {
      window.alert("Failed to load layout.");
    }
  };

  const onRenameSavedLayout = (layout: SavedLayout) => {
    const newName = window.prompt("Rename layout", layout.name);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === layout.name) return;
    renameLayout(layout.id, trimmed);
    setSavedLayouts(getSavedLayouts());
  };

  const onDeleteSavedLayout = (layout: SavedLayout) => {
    deleteLayout(layout.id);
    setSavedLayouts(getSavedLayouts());
  };

  const onSaveProject = () => {
    const project = {
      type: "unilytics-project",
      layout: model.toJson(),
      packets: {
        columns: robotTelemetryManager.getSnapshot().telemetryColumns,
        rows: robotTelemetryManager.getSnapshot().telemetryRows,
      },
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().replaceAll(":", "-");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `project-${dateStamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

  const onLoadProjectClick = () => {
    openProjectInputRef.current?.click();
    setOpenMenu(null);
  };

  const onLoadProjectFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const project = JSON.parse(text);
      if (project.type !== "unilytics-project") {
        throw new Error("Not a valid Unilytics project file.");
      }
      if (project.layout) {
        const newModel = Model.fromJson(project.layout);
        setModel(newModel);
      }
      if (project.packets?.rows) {
        const rows = project.packets.rows.map(
          (row: { id?: number; timestamp: number; values: Record<string, unknown> }) => ({
            id: row.id,
            timestamp: row.timestamp,
            values: row.values,
          }),
        );
        robotTelemetryManager.importTelemetryCsv(
          robotTelemetryManager.exportTelemetryCsv(), // clear first
        );
        // Direct import via CSV roundtrip - build CSV from project data
        const columns = project.packets.columns as string[];
        const header = ["id", "timestamp", ...columns].join(",");
        const csvRows = rows.map((row: { id: number; timestamp: number; values: Record<string, unknown> }) => {
          const cells = [
            String(row.id ?? ""),
            String(row.timestamp),
            ...columns.map((col: string) => {
              const v = row.values[col];
              return v === undefined ? "" : String(v);
            }),
          ];
          return cells.join(",");
        });
        const csv = [header, ...csvRows].join("\n");
        robotTelemetryManager.importTelemetryCsv(csv);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      window.alert(`Failed to load project: ${message}`);
    } finally {
      event.target.value = "";
    }
  };

  const onToggleTheme = () => {
    const next: Theme = currentTheme === "dark" ? "light" : "dark";
    setTheme(next);
    setCurrentTheme(next);
    setOpenMenu(null);
  };

  const onSavePreset = () => {
    const json = model.toJson();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().replaceAll(":", "-");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `preset-${dateStamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const onOpenPresetClick = () => {
    openPresetInputRef.current?.click();
  };

  const onOpenPresetFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const newModel = Model.fromJson(json);
      setModel(newModel);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      window.alert(`Failed to load preset: ${message}`);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="w-full h-full min-h-0 overflow-hidden bg-background text-foreground flex flex-col">
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

        <div className="flex items-center gap-2" ref={menuContainerRef}>
          <input ref={openPresetInputRef} type="file" accept=".json,application/json" className="hidden" onChange={onOpenPresetFileChange} />
          <input ref={openProjectInputRef} type="file" accept=".json,application/json" className="hidden" onChange={onLoadProjectFileChange} />

          {/* Add Panel */}
          <div className="relative">
            <button
              className={`ui-icon-btn ${openMenu === "addPanel" ? "ui-icon-btn-active" : ""}`}
              onClick={() => setOpenMenu(openMenu === "addPanel" ? null : "addPanel")}
              title="Add Panel"
            >
              <Plus size={20} />
            </button>

            {openMenu === "addPanel" && (
              <div className="add-panel-menu ui-menu absolute right-0 top-full mt-2 w-64 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100">
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

                <div className="max-h-80 overflow-y-auto py-1">
                  {groupedPanels.length > 0 ? (
                    groupedPanels.map((group) => (
                      <div key={group.category}>
                        <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.category}
                        </div>
                        {group.panels.map((panel) => (
                          <button
                            key={panel.type}
                            className="ui-menu-item"
                            onClick={() => onAddPanel(panel.type)}
                          >
                            <span className="truncate">{panel.displayName}</span>
                          </button>
                        ))}
                      </div>
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

          {/* Hamburger Menu */}
          <div className="relative">
            <button
              className={`ui-icon-btn ${openMenu === "menu" ? "ui-icon-btn-active" : ""}`}
              onClick={() => {
                setOpenMenu(openMenu === "menu" ? null : "menu");
                setShowLayoutManager(false);
              }}
              title="Menu"
            >
              <Menu size={20} />
            </button>

            {openMenu === "menu" && showLayoutManager && (
              <div className="add-panel-menu ui-menu absolute top-full mt-2 w-56 z-50 p-1 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto" style={{ right: "calc(14rem + 0.5rem)" }}>
                {savedLayouts.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                    No layouts saved yet.
                  </div>
                ) : (
                  savedLayouts.map((layout) => (
                    <div
                      key={layout.id}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-accent group"
                    >
                      <button
                        className="flex-1 text-left text-sm truncate hover:text-accent-foreground"
                        onClick={() => onLoadSavedLayout(layout)}
                        title={`Load "${layout.name}"`}
                      >
                        {layout.name}
                      </button>
                      <button
                        className="p-1 rounded opacity-50 hover:opacity-100 hover:bg-secondary"
                        onClick={() => onRenameSavedLayout(layout)}
                        title="Rename layout"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="p-1 rounded opacity-50 hover:opacity-100 hover:bg-secondary"
                        onClick={() => onDeleteSavedLayout(layout)}
                        title="Delete layout"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {openMenu === "menu" && (
              <div className="add-panel-menu ui-menu absolute right-0 top-full mt-2 w-56 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100 p-1">
                <button
                  className="ui-menu-item text-left px-3 py-2 flex items-center gap-2"
                  onClick={onSaveCurrentLayout}
                >
                  <Save size={14} /> Save Current Layout
                </button>
                <button
                  className={`ui-menu-item text-left px-3 py-2 flex items-center gap-2 ${showLayoutManager ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => setShowLayoutManager(!showLayoutManager)}
                >
                  <LayoutGrid size={14} /> Layout Manager
                </button>

                <button
                  className="ui-menu-item text-left px-3 py-2 flex items-center gap-2"
                  onClick={() => {
                    onSavePreset();
                    setOpenMenu(null);
                  }}
                >
                  <Upload size={14} /> Export Layout...
                </button>
                <button
                  className="ui-menu-item text-left px-3 py-2 flex items-center gap-2"
                  onClick={() => {
                    onOpenPresetClick();
                    setOpenMenu(null);
                  }}
                >
                  <FolderOpen size={14} /> Import Layout...
                </button>

                <div className="mx-3 my-1 border-t border-muted-foreground/20" />

                <button
                  className="ui-menu-item text-left px-3 py-2 flex items-center gap-2"
                  onClick={onSaveProject}
                >
                  <HardDriveDownload size={14} /> Save Project
                </button>
                <button
                  className="ui-menu-item text-left px-3 py-2 flex items-center gap-2"
                  onClick={onLoadProjectClick}
                >
                  <HardDriveUpload size={14} /> Load Project
                </button>

                <div className="mx-3 my-1 border-t border-muted-foreground/20" />

                <button
                  className="ui-menu-item text-left px-3 py-2 flex items-center gap-2"
                  onClick={onToggleTheme}
                >
                  {currentTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  {currentTheme === "dark" ? "Light mode" : "Dark mode"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Layout Modal */}
      {saveLayoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="ui-card w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-1">Save Layout</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a name for this workspace arrangement.
            </p>
            <input
              ref={saveLayoutInputRef}
              type="text"
              className="ui-input w-full mb-4"
              value={saveLayoutName}
              onChange={(e) => setSaveLayoutName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirmSaveLayout();
                if (e.key === "Escape") setSaveLayoutModal(false);
              }}
              placeholder="Layout name"
            />
            <div className="flex justify-end gap-2">
              <button
                className="ui-btn ui-btn-outline"
                onClick={() => setSaveLayoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="ui-btn bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={onConfirmSaveLayout}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 min-h-0 relative bg-background p-2">
        <div className="w-full h-full min-h-0 relative">
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
