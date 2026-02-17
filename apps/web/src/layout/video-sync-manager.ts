import { useSyncExternalStore } from "react";

interface VideoSyncSnapshot {
  selectedTime: number | null;
  activePanelId: string | null;
  activePanelPlaying: boolean;
}

class VideoSyncManager {
  private selectedTime: number | null = null;
  private activePanelId: string | null = null;
  private activePanelPlaying = false;

  private listeners = new Set<() => void>();

  private snapshot: VideoSyncSnapshot = {
    selectedTime: this.selectedTime,
    activePanelId: this.activePanelId,
    activePanelPlaying: this.activePanelPlaying,
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  setSelectedTime = (selectedTime: number | null) => {
    const normalizedTime =
      selectedTime === null || !Number.isFinite(selectedTime)
        ? null
        : selectedTime;

    if (normalizedTime === this.selectedTime) return;

    this.selectedTime = normalizedTime;
    this.snapshot = {
      selectedTime: this.selectedTime,
      activePanelId: this.activePanelId,
      activePanelPlaying: this.activePanelPlaying,
    };
    this.listeners.forEach((listener) => listener());
  };

  setActivePanel = (panelId: string) => {
    if (!panelId || panelId === this.activePanelId) return;
    this.activePanelId = panelId;
    this.activePanelPlaying = false;
    this.snapshot = {
      selectedTime: this.selectedTime,
      activePanelId: this.activePanelId,
      activePanelPlaying: this.activePanelPlaying,
    };
    this.listeners.forEach((listener) => listener());
  };

  setActivePanelPlaying = (panelId: string, playing: boolean) => {
    if (this.activePanelId !== panelId) return;
    if (this.activePanelPlaying === playing) return;
    this.activePanelPlaying = playing;
    this.snapshot = {
      selectedTime: this.selectedTime,
      activePanelId: this.activePanelId,
      activePanelPlaying: this.activePanelPlaying,
    };
    this.listeners.forEach((listener) => listener());
  };
}

export const videoSyncManager = new VideoSyncManager();

export const useVideoSyncSelectedTime = () =>
  useSyncExternalStore(
    videoSyncManager.subscribe,
    () => videoSyncManager.getSnapshot().selectedTime,
    () => videoSyncManager.getSnapshot().selectedTime,
  );

export const useVideoSyncSnapshot = () =>
  useSyncExternalStore(
    videoSyncManager.subscribe,
    videoSyncManager.getSnapshot,
    videoSyncManager.getSnapshot,
  );
