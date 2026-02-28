import React, { useMemo, useRef, useState } from "react";

interface SliderRange {
  start: number;
  end: number;
}

interface SmartVideoSliderProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
  showPacketMarkers: boolean;
  packetMarkerTimes: number[];
  showSelectedRange: boolean;
  selectedRange: SliderRange | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toPercent = (value: number, duration: number) => {
  if (!Number.isFinite(value) || duration <= 0) return 0;
  return clamp((value / duration) * 100, 0, 100);
};

export const SmartVideoSlider: React.FC<SmartVideoSliderProps> = ({
  duration,
  currentTime,
  onSeek,
  disabled = false,
  showPacketMarkers,
  packetMarkerTimes,
  showSelectedRange,
  selectedRange,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clampedCurrentTime =
    duration > 0 ? clamp(currentTime, 0, duration) : 0;
  const cursorPercent = toPercent(clampedCurrentTime, duration);

  const markerPercents = useMemo(() => {
    if (!showPacketMarkers || duration <= 0) return [] as number[];

    const seen = new Set<number>();
    const markers: number[] = [];

    packetMarkerTimes.forEach((time) => {
      const percent = toPercent(time, duration);
      const dedupeKey = Math.round(percent * 1000);
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      markers.push(percent);
    });

    return markers;
  }, [duration, packetMarkerTimes, showPacketMarkers]);

  const selectedRangePercents = useMemo(() => {
    if (!showSelectedRange || !selectedRange || duration <= 0) {
      return null;
    }

    const start = clamp(Math.min(selectedRange.start, selectedRange.end), 0, duration);
    const end = clamp(Math.max(selectedRange.start, selectedRange.end), 0, duration);
    if (end <= start) return null;

    return {
      start: toPercent(start, duration),
      end: toPercent(end, duration),
    };
  }, [duration, selectedRange, showSelectedRange]);

  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    const sliderElement = sliderRef.current;
    if (!sliderElement) return;

    const rect = sliderElement.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    onSeek(ratio * duration);
  };

  return (
    <div className="w-full select-none">
      <div
        ref={sliderRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={clampedCurrentTime}
        className={`relative h-7 rounded-md ${
          disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
        }`}
        onPointerDown={(event) => {
          if (disabled) return;
          setIsDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (!isDragging || disabled) return;
          updateFromPointer(event);
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
        onKeyDown={(event) => {
          if (disabled || duration <= 0) return;

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            onSeek(clamp(clampedCurrentTime - 0.25, 0, duration));
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            onSeek(clamp(clampedCurrentTime + 0.25, 0, duration));
          }
        }}
      >
        <div
          className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: "hsl(var(--secondary))" }}
        />

        {selectedRangePercents ? (
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
            style={{
              left: `${selectedRangePercents.start}%`,
              width: `${selectedRangePercents.end - selectedRangePercents.start}%`,
              backgroundColor: "hsl(var(--primary) / 0.35)",
            }}
          />
        ) : null}

        {markerPercents.map((percent, index) => (
          <span
            key={`packet-marker-${percent}-${index}`}
            className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2"
            style={{
              left: `${percent}%`,
              backgroundColor: "hsl(var(--foreground) / 0.55)",
            }}
          />
        ))}

        <span
          className="pointer-events-none absolute h-3 w-3 rounded-full border"
          style={{
            left: `${cursorPercent}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "hsl(var(--primary))",
            borderColor: "hsl(var(--background))",
            boxShadow: "0 0 0 1px hsl(var(--primary) / 0.35)",
          }}
        />
      </div>
    </div>
  );
};

