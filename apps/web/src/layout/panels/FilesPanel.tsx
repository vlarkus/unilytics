/* eslint-disable react-refresh/only-export-components */
import React, { useMemo, useRef } from "react";
import type { PanelProps } from "../PanelRegistry";
import { filesManager, useFilesSnapshot } from "../files-manager";
import { robotTelemetryManager } from "../robot-telemetry-manager";
import { useRobotTelemetry } from "../use-robot-telemetry";

export const filesPanelTags = ["files", "assets", "videos", "telemetry", "management"];

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const formatDuration = (durationSeconds: number | null) => {
  if (durationSeconds === null || !Number.isFinite(durationSeconds)) {
    return "Unknown";
  }
  return `${durationSeconds.toFixed(3)}s`;
};

const formatTimestamp = (timestamp: number | null) => {
  if (timestamp === null || !Number.isFinite(timestamp)) return "-";
  return new Date(timestamp).toLocaleString([], {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const VIDEO_ACCEPT_ATTR = [
  ".mp4",
  ".webm",
  ".mov",
  ".mkv",
  ".avi",
  ".ogv",
  ".m4v",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "video/ogg",
  "video/x-m4v",
].join(",");

export const FilesPanel: React.FC<PanelProps> = () => {
  const { telemetryColumns, telemetryRows } = useRobotTelemetry();
  const { videos } = useFilesSnapshot();
  const telemetryFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const telemetryStats = useMemo(() => {
    if (telemetryRows.length === 0) {
      return {
        firstTimestamp: null,
        lastTimestamp: null,
      };
    }

    return {
      firstTimestamp: telemetryRows[0].timestamp,
      lastTimestamp: telemetryRows[telemetryRows.length - 1].timestamp,
    };
  }, [telemetryRows]);

  const totalVideoSize = useMemo(
    () => videos.reduce((sum, video) => sum + video.sizeBytes, 0),
    [videos],
  );

  return (
    <div className="panel-content">
      <div className="panel-shell">
        <section className="ui-card">
          <h2 className="ui-card-title">Telemetry Data</h2>
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Rows</span>
              <span>{telemetryRows.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Columns</span>
              <span>{telemetryColumns.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">First timestamp</span>
              <span>{formatTimestamp(telemetryStats.firstTimestamp)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Last timestamp</span>
              <span>{formatTimestamp(telemetryStats.lastTimestamp)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn ui-btn-outline"
              onClick={() => telemetryFileInputRef.current?.click()}
            >
              Add CSV
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-outline"
              disabled={telemetryRows.length === 0}
              onClick={robotTelemetryManager.clearTelemetry}
            >
              Delete Data
            </button>
          </div>

          <input
            ref={telemetryFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const result = robotTelemetryManager.importTelemetryCsv(text);
                window.alert(`Imported ${result.importedCount} packet rows.`);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : "Unknown error";
                window.alert(`Failed to import telemetry CSV: ${message}`);
              } finally {
                event.target.value = "";
              }
            }}
          />
        </section>

        <section className="ui-card">
          <h2 className="ui-card-title">Videos</h2>
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Open videos</span>
              <span>{videos.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Total size</span>
              <span>{formatBytes(totalVideoSize)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn ui-btn-outline"
              onClick={() => videoFileInputRef.current?.click()}
            >
              Add Video
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-outline"
              disabled={videos.length === 0}
              onClick={filesManager.clearVideos}
            >
              Delete All
            </button>
          </div>

          <input
            ref={videoFileInputRef}
            type="file"
            className="hidden"
            accept={VIDEO_ACCEPT_ATTR}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              filesManager.addVideoFile(file);
              event.target.value = "";
            }}
          />

          <div className="mt-4 grid gap-2">
            {videos.length === 0 ? (
              <div className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
                No open video files.
              </div>
            ) : (
              videos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-md border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {video.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {video.mimeType} | {formatBytes(video.sizeBytes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ui-btn ui-btn-outline h-8 px-2 text-xs"
                      onClick={() => filesManager.removeVideo(video.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Duration: <span className="text-foreground">{formatDuration(video.durationSeconds)}</span></span>
                    <span className="text-muted-foreground">Opened: <span className="text-foreground">{formatTimestamp(video.createdAt)}</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

