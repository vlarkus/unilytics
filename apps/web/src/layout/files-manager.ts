import { useSyncExternalStore } from "react";

export interface VideoFileRecord {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  objectUrl: string;
  createdAt: number;
  durationSeconds: number | null;
}

interface FilesSnapshot {
  videos: VideoFileRecord[];
}

const createVideoId = () =>
  `video-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

class FilesManager {
  private videos: VideoFileRecord[] = [];

  private listeners = new Set<() => void>();

  private snapshot: FilesSnapshot = {
    videos: this.videos,
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  addVideoFile = (file: File) => {
    const record: VideoFileRecord = {
      id: createVideoId(),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      objectUrl: URL.createObjectURL(file),
      createdAt: Date.now(),
      durationSeconds: null,
    };
    this.videos = [...this.videos, record];
    this.emit();
    return record;
  };

  removeVideo = (videoId: string) => {
    const target = this.videos.find((video) => video.id === videoId);
    if (!target) return false;
    URL.revokeObjectURL(target.objectUrl);
    this.videos = this.videos.filter((video) => video.id !== videoId);
    this.emit();
    return true;
  };

  clearVideos = () => {
    this.videos.forEach((video) => URL.revokeObjectURL(video.objectUrl));
    this.videos = [];
    this.emit();
  };

  updateVideoDuration = (videoId: string, durationSeconds: number) => {
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) return;
    this.videos = this.videos.map((video) =>
      video.id === videoId
        ? { ...video, durationSeconds }
        : video,
    );
    this.emit();
  };

  getVideoById = (videoId: string) =>
    this.videos.find((video) => video.id === videoId);

  private emit = () => {
    this.snapshot = {
      videos: this.videos.map((video) => ({ ...video })),
    };
    this.listeners.forEach((listener) => listener());
  };
}

export const filesManager = new FilesManager();

export const useFilesSnapshot = () =>
  useSyncExternalStore(
    filesManager.subscribe,
    filesManager.getSnapshot,
    filesManager.getSnapshot,
  );
