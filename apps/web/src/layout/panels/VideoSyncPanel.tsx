/* eslint-disable react-refresh/only-export-components */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PanelProps } from "../PanelRegistry";
import { filesManager, useFilesSnapshot } from "../files-manager";
import { useRobotTelemetry } from "../use-robot-telemetry";
import { useVideoSyncSnapshot, videoSyncManager } from "../video-sync-manager";
import { SmartVideoSlider } from "./SmartVideoSlider";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  FolderOpen,
  FastForward,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
} from "lucide-react";

export const videoSyncPanelTags = [
  "video",
  "sync",
  "playback",
  "analysis",
  "timeline",
];

type SyncMode = "beginning" | "segment";
type TelemetryTargetMode = "packet" | "datetime";

interface SyncAnchor {
  mode: SyncMode;
  telemetryTimestamp: number;
  videoSecond: number;
}

const MIN_VIDEO_VIEWPORT_SCALE = 0.4;
const MAX_VIDEO_VIEWPORT_SCALE = 1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const parseNumberInput = (value: string): number | null => {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const parseIntegerInput = (value: string): number | null => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, "").slice(0, maxLength);

const toDigits = (value: number, width: number) =>
  String(value).padStart(width, "0");

const normalizeTimePart = (
  rawValue: string,
  min: number,
  max: number,
  padLength: number,
) => {
  const parsed = parseIntegerInput(rawValue);
  if (parsed === null) return toDigits(min, padLength);
  return toDigits(clamp(parsed, min, max), padLength);
};

const timestampToDateParts = (timestamp: number) => {
  const date = new Date(timestamp);
  return {
    date: `${date.getFullYear()}-${toDigits(date.getMonth() + 1, 2)}-${toDigits(date.getDate(), 2)}`,
    hour: toDigits(date.getHours(), 2),
    minute: toDigits(date.getMinutes(), 2),
    second: toDigits(date.getSeconds(), 2),
    millisecond: toDigits(date.getMilliseconds(), 3),
  };
};

const buildTimestampFromParts = (
  datePart: string,
  hourPart: string,
  minutePart: string,
  secondPart: string,
  millisecondPart: string,
): number | null => {
  if (!datePart) return null;

  const hour = parseIntegerInput(hourPart);
  const minute = parseIntegerInput(minutePart);
  const second = parseIntegerInput(secondPart);
  const millisecond = parseIntegerInput(millisecondPart);

  if (
    hour === null ||
    minute === null ||
    second === null ||
    millisecond === null ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59 ||
    millisecond < 0 ||
    millisecond > 999
  ) {
    return null;
  }

  const dateTime = new Date(
    `${datePart}T${toDigits(hour, 2)}:${toDigits(minute, 2)}:${toDigits(second, 2)}.${toDigits(millisecond, 3)}`,
  );
  const timestamp = dateTime.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const formatSeconds = (value: number) => {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
};

const formatSecondsPrecise = (value: number) => {
  if (!Number.isFinite(value)) return "0.000";
  return value.toFixed(3);
};

const formatTelemetryTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString([], {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const clampRowIndex = (index: number, rowCount: number) => {
  if (rowCount <= 0) return 0;
  return clamp(Math.round(index), 0, rowCount - 1);
};

export const VideoSyncPanel: React.FC<PanelProps> = ({ node }) => {
  const { telemetryRows, packetSelection } = useRobotTelemetry();
  const { videos } = useFilesSnapshot();
  const {
    selectedTime: selectedTelemetryTime,
    activePanelId,
    activePanelPlaying,
  } = useVideoSyncSnapshot();
  const panelId = useMemo(() => node.getId(), [node]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastAnimationUpdateRef = useRef(0);

  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isReplaceMenuOpen, setIsReplaceMenuOpen] = useState(false);

  const [syncMode, setSyncMode] = useState<SyncMode>("beginning");
  const [telemetryTargetMode, setTelemetryTargetMode] =
    useState<TelemetryTargetMode>("packet");
  const [packetNumberInput, setPacketNumberInput] = useState("1");
  const [telemetryDateInput, setTelemetryDateInput] = useState("");
  const [telemetryHourInput, setTelemetryHourInput] = useState("00");
  const [telemetryMinuteInput, setTelemetryMinuteInput] = useState("00");
  const [telemetrySecondInput, setTelemetrySecondInput] = useState("00");
  const [telemetryMillisecondInput, setTelemetryMillisecondInput] =
    useState("000");
  const [videoSecondInput, setVideoSecondInput] = useState("0");
  const [offset, setOffset] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncAnchor, setSyncAnchor] = useState<SyncAnchor | null>(null);

  const [showPacketMarkers, setShowPacketMarkers] = useState(true);
  const [showSelectedRange, setShowSelectedRange] = useState(true);

  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [viewportScale, setViewportScale] = useState(1);
  const resizeSessionRef = useRef<{
    startX: number;
    startY: number;
    startScale: number;
  } | null>(null);

  const currentVideo = useMemo(() => {
    if (videos.length === 0) return null;
    if (currentVideoId === null) return videos[videos.length - 1];
    return (
      videos.find((video) => video.id === currentVideoId) ??
      videos[videos.length - 1]
    );
  }, [currentVideoId, videos]);

  const hasVideo = currentVideo !== null;
  const isSynced = hasVideo && offset !== null;
  const isUploadState = !hasVideo;
  const isTimestampState = hasVideo && !isSynced;
  const isFullySyncedState = isSynced;
  const isMainPanel = activePanelId === panelId;

  const stopPlaybackLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const beginViewportResize = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault();

      resizeSessionRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startScale: viewportScale,
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        const session = resizeSessionRef.current;
        if (!session) return;

        const deltaX = moveEvent.clientX - session.startX;
        const deltaY = moveEvent.clientY - session.startY;

        // Dragging left/up shrinks. Dragging right/down expands (capped at 100%).
        const delta = (deltaX + deltaY) / 2;
        const nextScale = clamp(
          session.startScale + delta / 700,
          MIN_VIDEO_VIEWPORT_SCALE,
          MAX_VIDEO_VIEWPORT_SCALE,
        );
        setViewportScale(nextScale);
      };

      const onPointerUp = () => {
        resizeSessionRef.current = null;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [viewportScale],
  );

  const publishVideoTelemetryTime = useCallback(
    (videoTime: number) => {
      if (!isSynced || offset === null || !isMainPanel) return;
      const telemetryTime = videoTime * 1000 + offset;
      videoSyncManager.setSelectedTime(telemetryTime);
    },
    [isMainPanel, isSynced, offset],
  );

  const seekVideo = useCallback(
    (nextTime: number) => {
      const duration = Math.max(videoDuration, 0);
      const clampedTime = duration > 0 ? clamp(nextTime, 0, duration) : 0;
      const videoElement = videoRef.current;

      if (
        videoElement &&
        Math.abs(videoElement.currentTime - clampedTime) > 0.01
      ) {
        videoElement.currentTime = clampedTime;
      }

      setVideoCurrentTime((previousTime) =>
        Math.abs(previousTime - clampedTime) > 0.01
          ? clampedTime
          : previousTime,
      );
      publishVideoTelemetryTime(clampedTime);
    },
    [publishVideoTelemetryTime, videoDuration],
  );

  const startPlaybackLoop = useCallback(() => {
    stopPlaybackLoop();
    lastAnimationUpdateRef.current = 0;
    const tick = (now: number) => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        stopPlaybackLoop();
        return;
      }

      if (now - lastAnimationUpdateRef.current >= 33) {
        lastAnimationUpdateRef.current = now;
        const nextTime = videoElement.currentTime;
        setVideoCurrentTime((previousTime) =>
          Math.abs(previousTime - nextTime) > 0.015 ? nextTime : previousTime,
        );
        publishVideoTelemetryTime(nextTime);
      }

      if (!videoElement.paused && !videoElement.ended) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
        stopPlaybackLoop();
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, [publishVideoTelemetryTime, stopPlaybackLoop]);

  useEffect(
    () => () => {
      stopPlaybackLoop();
    },
    [stopPlaybackLoop],
  );

  useEffect(() => {
    if (!isSynced || offset === null || selectedTelemetryTime === null) return;
    if (videoDuration <= 0) return;

    const nextVideoTime = clamp(
      (selectedTelemetryTime - offset) / 1000,
      0,
      videoDuration,
    );
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const drift = nextVideoTime - videoElement.currentTime;
    const absDrift = Math.abs(drift);

    // Secondary panels follow by position only; they do not play media/audio.
    if (!isMainPanel && activePanelPlaying) {
      if (!videoElement.paused) {
        videoElement.pause();
      }
      if (absDrift > 0.08) {
        videoElement.currentTime = nextVideoTime;
      }
      return;
    }

    if (!isMainPanel && !videoElement.paused) {
      videoElement.pause();
    }

    if (isPlaying) return;
    if (absDrift <= 0.05) return;
    videoElement.currentTime = nextVideoTime;
  }, [
    activePanelPlaying,
    isMainPanel,
    isPlaying,
    isSynced,
    offset,
    selectedTelemetryTime,
    videoDuration,
  ]);

  const packetMarkerTimes = useMemo(() => {
    if (!isSynced || offset === null || videoDuration <= 0)
      return [] as number[];

    const markers: number[] = [];
    telemetryRows.forEach((row) => {
      const mappedVideoTime = (row.timestamp - offset) / 1000;
      if (mappedVideoTime < 0 || mappedVideoTime > videoDuration) return;
      markers.push(mappedVideoTime);
    });
    return markers;
  }, [isSynced, offset, telemetryRows, videoDuration]);

  const selectedRange = useMemo(() => {
    if (!isSynced || offset === null || videoDuration <= 0) return null;
    if (telemetryRows.length === 0) return null;

    const startIndex = clampRowIndex(
      packetSelection.startIndex,
      telemetryRows.length,
    );
    const endIndex = clampRowIndex(
      packetSelection.endIndex,
      telemetryRows.length,
    );
    const lowIndex = Math.min(startIndex, endIndex);
    const highIndex = Math.max(startIndex, endIndex);
    const startRow = telemetryRows[lowIndex];
    const endRow = telemetryRows[highIndex];
    if (!startRow || !endRow) return null;

    const rawStart = (startRow.timestamp - offset) / 1000;
    const rawEnd = (endRow.timestamp - offset) / 1000;
    const clampedStart = clamp(Math.min(rawStart, rawEnd), 0, videoDuration);
    const clampedEnd = clamp(Math.max(rawStart, rawEnd), 0, videoDuration);

    if (clampedEnd <= clampedStart) return null;
    if (clampedEnd <= 0 || clampedStart >= videoDuration) return null;

    return { start: clampedStart, end: clampedEnd };
  }, [
    isSynced,
    offset,
    packetSelection.endIndex,
    packetSelection.startIndex,
    telemetryRows,
    videoDuration,
  ]);

  const telemetryBounds = useMemo(() => {
    if (telemetryRows.length === 0) return null;

    let minTimestamp = telemetryRows[0].timestamp;
    let maxTimestamp = telemetryRows[0].timestamp;
    telemetryRows.forEach((row) => {
      if (row.timestamp < minTimestamp) minTimestamp = row.timestamp;
      if (row.timestamp > maxTimestamp) maxTimestamp = row.timestamp;
    });

    return { minTimestamp, maxTimestamp };
  }, [telemetryRows]);

  const packetCount = telemetryRows.length;

  const switchToVideo = (videoId: string) => {
    setCurrentVideoId(videoId);
    setIsReplaceMenuOpen(false);
    setSyncMode("beginning");
    setOffset(null);
    setSyncAnchor(null);
    setSyncError(null);
    setVideoSecondInput("0");
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setIsPlaying(false);
    stopPlaybackLoop();

    const defaultTimestamp =
      selectedTelemetryTime ??
      (telemetryRows.length > 0
        ? telemetryRows[telemetryRows.length - 1].timestamp
        : 0);
    const dateParts = timestampToDateParts(defaultTimestamp);
    setTelemetryDateInput(dateParts.date);
    setTelemetryHourInput(dateParts.hour);
    setTelemetryMinuteInput(dateParts.minute);
    setTelemetrySecondInput(dateParts.second);
    setTelemetryMillisecondInput(dateParts.millisecond);

    const nearestPacketNumber =
      telemetryRows.length === 0
        ? 1
        : Math.max(
            1,
            telemetryRows.reduce((closestIndex, row, index) => {
              const closestDistance = Math.abs(
                telemetryRows[closestIndex].timestamp - defaultTimestamp,
              );
              const currentDistance = Math.abs(
                row.timestamp - defaultTimestamp,
              );
              return currentDistance < closestDistance ? index : closestIndex;
            }, 0) + 1,
          );
    setPacketNumberInput(String(nearestPacketNumber));
  };

  const applySync = () => {
    const telemetryTimestamp =
      telemetryTargetMode === "packet"
        ? (() => {
            const packetNumber = parseIntegerInput(packetNumberInput);
            if (packetNumber === null) return null;
            if (telemetryRows.length === 0) return null;
            const index = clamp(packetNumber - 1, 0, telemetryRows.length - 1);
            return telemetryRows[index]?.timestamp ?? null;
          })()
        : buildTimestampFromParts(
            telemetryDateInput,
            telemetryHourInput,
            telemetryMinuteInput,
            telemetrySecondInput,
            telemetryMillisecondInput,
          );

    if (telemetryTimestamp === null) {
      setSyncError(
        telemetryTargetMode === "packet"
          ? "Choose a valid packet number and ensure telemetry rows exist."
          : "Provide a valid full date/time with millisecond precision.",
      );
      return;
    }

    const parsedVideoSecond =
      syncMode === "beginning" ? 0 : parseNumberInput(videoSecondInput);
    if (parsedVideoSecond === null) {
      setSyncError("Video second must be a valid number.");
      return;
    }
    if (parsedVideoSecond < 0) {
      setSyncError("Video second must be zero or greater.");
      return;
    }

    if (telemetryTargetMode === "datetime") {
      const hour = parseIntegerInput(telemetryHourInput);
      const minute = parseIntegerInput(telemetryMinuteInput);
      const second = parseIntegerInput(telemetrySecondInput);
      const millisecond = parseIntegerInput(telemetryMillisecondInput);
      const invalidTimeFields =
        hour === null ||
        minute === null ||
        second === null ||
        millisecond === null ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59 ||
        millisecond < 0 ||
        millisecond > 999;
      if (invalidTimeFields) {
        setSyncError(
          "Time fields must be valid: hr 00-23, min/sec 00-59, ms 000-999.",
        );
        return;
      }
    }

    const normalizedVideoSecond =
      videoDuration > 0
        ? clamp(parsedVideoSecond, 0, videoDuration)
        : parsedVideoSecond;
    const nextOffset = telemetryTimestamp - normalizedVideoSecond * 1000;

    setOffset(nextOffset);
    setSyncAnchor({
      mode: syncMode,
      telemetryTimestamp,
      videoSecond: normalizedVideoSecond,
    });
    setVideoSecondInput(String(normalizedVideoSecond));
    setSyncError(null);
  };

  const seekToNextPacket = () => {
    if (!isSynced || offset === null || telemetryRows.length === 0) return;

    const currentTelemetryTime = videoCurrentTime * 1000 + offset;
    const nextRow = telemetryRows.find(
      (row) => row.timestamp > currentTelemetryTime + 0.5,
    );
    if (!nextRow) {
      seekVideo(videoDuration);
      return;
    }

    const nextVideoTime = (nextRow.timestamp - offset) / 1000;
    seekVideo(nextVideoTime);
  };

  const seekToPreviousPacket = () => {
    if (!isSynced || offset === null || telemetryRows.length === 0) return;

    const currentTelemetryTime = videoCurrentTime * 1000 + offset;
    let previousRow = telemetryRows[0];
    for (let index = telemetryRows.length - 1; index >= 0; index -= 1) {
      const row = telemetryRows[index];
      if (row.timestamp < currentTelemetryTime - 0.5) {
        previousRow = row;
        break;
      }
    }

    const previousVideoTime = (previousRow.timestamp - offset) / 1000;
    seekVideo(previousVideoTime);
  };

  const syncControls = (
    <div className="grid gap-3">
      <div>
        <label className="ui-label" htmlFor="video-sync-mode">
          Sync Mode
        </label>
        <select
          id="video-sync-mode"
          className="ui-input"
          value={syncMode}
          onChange={(event) => setSyncMode(event.target.value as SyncMode)}
        >
          <option value="beginning">Timestamp beginning of video</option>
          <option value="segment">Timestamp specific segment</option>
        </select>
      </div>

      {syncMode === "segment" ? (
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="ui-label" htmlFor="video-sync-second">
              Video second (since beginning)
            </label>
            <input
              id="video-sync-second"
              className="ui-input"
              type="text"
              inputMode="decimal"
              value={videoSecondInput}
              onChange={(event) => setVideoSecondInput(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="ui-btn ui-btn-outline h-10"
            onClick={() => {
              const videoElement = videoRef.current;
              const currentSecond =
                videoElement?.currentTime ?? videoCurrentTime;
              setVideoSecondInput(String(currentSecond));
            }}
          >
            Use current video position
          </button>
        </div>
      ) : null}

      <div>
        <label className="ui-label" htmlFor="video-sync-telemetry-target-mode">
          Telemetry target
        </label>
        <select
          id="video-sync-telemetry-target-mode"
          className="ui-input"
          value={telemetryTargetMode}
          onChange={(event) =>
            setTelemetryTargetMode(event.target.value as TelemetryTargetMode)
          }
        >
          <option value="packet">Telemetry packet</option>
          <option value="datetime">Specific date/time</option>
        </select>
      </div>

      <div>
        <label className="ui-label" htmlFor="video-sync-telemetry-ts">
          {telemetryTargetMode === "packet"
            ? "Telemetry packet number"
            : "Telemetry date/time"}
        </label>
        {telemetryTargetMode === "packet" ? (
          <input
            id="video-sync-telemetry-ts"
            className="ui-input"
            type="text"
            inputMode="numeric"
            value={packetNumberInput}
            onChange={(event) =>
              setPacketNumberInput(event.target.value.replace(/\D/g, ""))
            }
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[12rem] flex-1">
              <input
                id="video-sync-telemetry-ts"
                className="ui-input h-9"
                type="date"
                title="Date"
                aria-label="Telemetry date"
                value={telemetryDateInput}
                onChange={(event) => setTelemetryDateInput(event.target.value)}
              />
            </div>

            <div className="relative w-[4.5rem]">
              <span
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "hsl(var(--secondary-foreground) / 0.65)" }}
              >
                hr
              </span>
              <input
                className="ui-input h-9 pr-7"
                type="text"
                inputMode="numeric"
                placeholder="00"
                title="Hour (00-23)"
                aria-label="Telemetry hour"
                value={telemetryHourInput}
                onChange={(event) =>
                  setTelemetryHourInput(sanitizeDigits(event.target.value, 2))
                }
                onBlur={() =>
                  setTelemetryHourInput(
                    normalizeTimePart(telemetryHourInput, 0, 23, 2),
                  )
                }
              />
            </div>

            <div className="relative w-[4.5rem]">
              <span
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "hsl(var(--secondary-foreground) / 0.65)" }}
              >
                min
              </span>
              <input
                className="ui-input h-9 pr-8"
                type="text"
                inputMode="numeric"
                placeholder="00"
                title="Minute (00-59)"
                aria-label="Telemetry minute"
                value={telemetryMinuteInput}
                onChange={(event) =>
                  setTelemetryMinuteInput(sanitizeDigits(event.target.value, 2))
                }
                onBlur={() =>
                  setTelemetryMinuteInput(
                    normalizeTimePart(telemetryMinuteInput, 0, 59, 2),
                  )
                }
              />
            </div>

            <div className="relative w-[4.5rem]">
              <span
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "hsl(var(--secondary-foreground) / 0.65)" }}
              >
                sec
              </span>
              <input
                className="ui-input h-9 pr-8"
                type="text"
                inputMode="numeric"
                placeholder="00"
                title="Second (00-59)"
                aria-label="Telemetry second"
                value={telemetrySecondInput}
                onChange={(event) =>
                  setTelemetrySecondInput(sanitizeDigits(event.target.value, 2))
                }
                onBlur={() =>
                  setTelemetrySecondInput(
                    normalizeTimePart(telemetrySecondInput, 0, 59, 2),
                  )
                }
              />
            </div>

            <div className="relative w-[5.25rem]">
              <span
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "hsl(var(--secondary-foreground) / 0.65)" }}
              >
                ms
              </span>
              <input
                className="ui-input h-9 pr-8"
                type="text"
                inputMode="numeric"
                placeholder="000"
                title="Millisecond (000-999)"
                aria-label="Telemetry millisecond"
                value={telemetryMillisecondInput}
                onChange={(event) =>
                  setTelemetryMillisecondInput(
                    sanitizeDigits(event.target.value, 3),
                  )
                }
                onBlur={() =>
                  setTelemetryMillisecondInput(
                    normalizeTimePart(telemetryMillisecondInput, 0, 999, 3),
                  )
                }
              />
            </div>
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {telemetryBounds
            ? `Telemetry span: ${formatTelemetryTimestamp(telemetryBounds.minTimestamp)} - ${formatTelemetryTimestamp(telemetryBounds.maxTimestamp)} | Packets: ${packetCount}`
            : "No telemetry rows loaded yet. Packet target requires telemetry; date/time target can still be set manually."}
        </p>
        {telemetryTargetMode === "datetime" ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Use Date + hr/min/sec/ms fields.
          </p>
        ) : null}
      </div>

      {syncError ? (
        <p className="text-xs text-[hsl(var(--error))]" aria-live="polite">
          {syncError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={applySync}
        >
          {isFullySyncedState ? "Re-sync video" : "Apply sync"}
        </button>
        {syncAnchor ? (
          <span className="text-xs text-muted-foreground">
            Applied: video {formatSeconds(syncAnchor.videoSecond)}s {"<->"}{" "}
            telemetry {Math.round(syncAnchor.telemetryTimestamp)}ms
          </span>
        ) : null}
      </div>
    </div>
  );

  if (isUploadState) {
    return (
      <div className="panel-content">
        <div className="panel-shell">
          <section className="ui-card">
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-border p-6 text-center">
              <i className="fa-solid fa-film mb-4 text-3xl text-muted-foreground" />
              <h2 className="text-base font-semibold">No video selected</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add videos from the Files panel, then select one here.
              </p>
              <button
                type="button"
                className="ui-btn ui-btn-outline mt-4"
                onClick={() => setIsReplaceMenuOpen((open) => !open)}
                disabled={videos.length === 0}
              >
                {videos.length === 0 ? "No videos in Files" : "Select video"}
              </button>
              {isReplaceMenuOpen && videos.length > 0 ? (
                <div className="ui-menu mt-3 max-h-48 w-full overflow-y-auto p-1 text-left">
                  {videos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      className="ui-menu-item"
                      onClick={() => switchToVideo(video.id)}
                    >
                      <span className="truncate">{video.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-content">
      <div
        className="panel-shell"
        onPointerDownCapture={() => {
          if (isSynced) {
            videoSyncManager.setActivePanel(panelId);
          }
        }}
      >
        <section className="ui-card">
          <div className="grid gap-3">
            <div
              className="mx-auto w-full"
              style={{ width: `${viewportScale * 100}%` }}
            >
              <div className="relative overflow-hidden rounded-md border border-border bg-black/40">
                <video
                  ref={videoRef}
                  src={currentVideo?.objectUrl}
                  className="h-auto w-full"
                  controls={false}
                  muted={isMainPanel ? isMuted : true}
                  preload="metadata"
                  onLoadedMetadata={() => {
                    const duration = Number(videoRef.current?.duration ?? 0);
                    setVideoDuration(Number.isFinite(duration) ? duration : 0);
                    if (currentVideo && Number.isFinite(duration)) {
                      filesManager.updateVideoDuration(
                        currentVideo.id,
                        duration,
                      );
                    }
                  }}
                  onPlay={() => {
                    setIsPlaying(true);
                    if (isSynced) {
                      videoSyncManager.setActivePanel(panelId);
                      videoSyncManager.setActivePanelPlaying(panelId, true);
                    } else {
                      videoSyncManager.setActivePanelPlaying(panelId, false);
                    }
                    startPlaybackLoop();
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    videoSyncManager.setActivePanelPlaying(panelId, false);
                    stopPlaybackLoop();
                    const current = videoRef.current?.currentTime ?? 0;
                    setVideoCurrentTime(current);
                    publishVideoTelemetryTime(current);
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    videoSyncManager.setActivePanelPlaying(panelId, false);
                    stopPlaybackLoop();
                    const current = videoRef.current?.currentTime ?? 0;
                    setVideoCurrentTime(current);
                    publishVideoTelemetryTime(current);
                  }}
                  onTimeUpdate={() => {
                    const videoElement = videoRef.current;
                    if (!videoElement) return;
                    if (!videoElement.paused && !videoElement.ended) return;
                    const current = videoElement.currentTime;
                    setVideoCurrentTime(current);
                    publishVideoTelemetryTime(current);
                  }}
                />

                {/* Resize handles: right edge, bottom edge, bottom-right corner */}
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full w-5 translate-x-1/2 cursor-ew-resize bg-transparent"
                  aria-label="Resize video viewport"
                  title="Drag to resize video viewport"
                  onPointerDown={beginViewportResize}
                />
                <button
                  type="button"
                  className="absolute bottom-0 left-0 h-5 w-full translate-y-1/2 cursor-ns-resize bg-transparent"
                  aria-label="Resize video viewport"
                  title="Drag to resize video viewport"
                  onPointerDown={beginViewportResize}
                />
                <button
                  type="button"
                  className="absolute bottom-0 right-0 h-6 w-6 translate-x-1/2 translate-y-1/2 cursor-nwse-resize bg-transparent"
                  aria-label="Resize video viewport"
                  title="Drag to resize video viewport"
                  onPointerDown={beginViewportResize}
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div
                className="ui-btn ui-btn-outline h-9 px-3 justify-self-start cursor-default select-none text-xs font-medium pointer-events-none"
                role="status"
                aria-live="off"
              >
                {formatSecondsPrecise(videoCurrentTime)}s/
                {formatSecondsPrecise(videoDuration)}s
              </div>
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  className="ui-btn ui-btn-outline h-9 w-9 p-0"
                  onClick={() => seekVideo(0)}
                  disabled={videoDuration <= 0}
                  title="Go to start"
                  aria-label="Go to start"
                >
                  <ArrowLeftToLine size={16} />
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-outline h-9 w-9 p-0"
                  onClick={() => seekVideo(videoCurrentTime - 5)}
                  disabled={videoDuration <= 0}
                  title="Back 5 seconds"
                  aria-label="Back 5 seconds"
                >
                  <Rewind size={16} />
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-outline h-9 w-9 p-0"
                  onClick={seekToPreviousPacket}
                  disabled={
                    !isSynced ||
                    telemetryRows.length === 0 ||
                    videoDuration <= 0
                  }
                  title="Previous packet"
                  aria-label="Previous packet"
                >
                  <SkipBack size={16} />
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-outline h-9 w-9 p-0"
                  onClick={() => seekVideo(videoCurrentTime - 1 / 30)}
                  disabled={videoDuration <= 0}
                  title="Previous frame"
                  aria-label="Previous frame"
                >
                  <StepBack size={16} />
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary h-10 w-10 p-0"
                  onClick={() => {
                    const videoElement = videoRef.current;
                    if (!videoElement) return;
                    if (isSynced) {
                      videoSyncManager.setActivePanel(panelId);
                    }
                    if (videoElement.paused) {
                      void videoElement.play();
                    } else {
                      videoElement.pause();
                    }
                  }}
                  title={isPlaying ? "Pause" : "Play"}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-outline h-9 w-9 p-0"
                  onClick={() => seekVideo(videoCurrentTime + 1 / 30)}
                  disabled={videoDuration <= 0}
                  title="Next frame"
                  aria-label="Next frame"
                >
                  <StepForward size={16} />
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-outline h-9 w-9 p-0"
                  onClick={seekToNextPacket}
                  disabled={
                    !isSynced ||
                    telemetryRows.length === 0 ||
                    videoDuration <= 0
                  }
                  title="Next packet"
                  aria-label="Next packet"
                >
                  <SkipForward size={16} />
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-outline h-9 w-9 p-0"
                  onClick={() => seekVideo(videoCurrentTime + 5)}
                  disabled={videoDuration <= 0}
                  title="Forward 5 seconds"
                  aria-label="Forward 5 seconds"
                >
                  <FastForward size={16} />
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-outline h-9 w-9 p-0"
                  onClick={() => seekVideo(videoDuration)}
                  disabled={videoDuration <= 0}
                  title="Jump to end"
                  aria-label="Jump to end"
                >
                  <ArrowRightToLine size={16} />
                </button>
              </div>
              <div className="justify-self-end">
                <div className="relative flex items-center gap-1">
                  <button
                    type="button"
                    className="ui-btn ui-btn-outline h-9 w-9 p-0"
                    onClick={() => setIsMuted((muted) => !muted)}
                    title={isMuted ? "Unmute" : "Mute"}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-outline h-9 w-9 p-0"
                    onClick={() => setIsReplaceMenuOpen((open) => !open)}
                    title="Replace video"
                    aria-label="Replace video"
                  >
                    <FolderOpen size={16} />
                  </button>
                  {isReplaceMenuOpen ? (
                    <div className="ui-menu absolute right-0 top-full z-30 mt-2 max-h-60 w-72 overflow-y-auto p-1">
                      {videos.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No videos in Files panel.
                        </div>
                      ) : (
                        videos.map((video) => (
                          <button
                            key={video.id}
                            type="button"
                            className="ui-menu-item"
                            onClick={() => switchToVideo(video.id)}
                          >
                            <span className="truncate">{video.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <SmartVideoSlider
              duration={videoDuration}
              currentTime={videoCurrentTime}
              onSeek={seekVideo}
              disabled={videoDuration <= 0}
              showPacketMarkers={isSynced && showPacketMarkers}
              packetMarkerTimes={packetMarkerTimes}
              showSelectedRange={isSynced && showSelectedRange}
              selectedRange={selectedRange}
            />

            {isTimestampState ? (
              <div className="rounded-md border border-border bg-card p-3">
                <h2 className="mb-2 text-sm font-semibold">
                  Timestamp this video before analysis features unlock
                </h2>
                {syncControls}
              </div>
            ) : null}
          </div>
        </section>

        {isFullySyncedState ? (
          <section className="ui-card">
            <div className="grid gap-5">
              <div>
                <h2 className="ui-card-title">Packet Display Controls</h2>
                <div className="grid gap-2 text-sm">
                  <label className="inline-flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={showPacketMarkers}
                      onChange={(event) =>
                        setShowPacketMarkers(event.target.checked)
                      }
                    />
                    Display packets
                  </label>
                  <label className="inline-flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={showSelectedRange}
                      onChange={(event) =>
                        setShowSelectedRange(event.target.checked)
                      }
                    />
                    Display range of selected packets
                  </label>
                </div>
              </div>

              <div>
                <h2 className="ui-card-title">Timestamp Sync Settings</h2>
                {syncControls}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};
