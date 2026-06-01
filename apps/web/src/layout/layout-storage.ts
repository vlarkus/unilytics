import type { IJsonModel } from "flexlayout-react";

const LAYOUTS_KEY = "unilytics-saved-layouts";
const THEME_KEY = "unilytics-theme";

export interface SavedLayout {
  id: string;
  name: string;
  layout: IJsonModel;
}

const createId = () =>
  `layout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function getSavedLayouts(): SavedLayout[] {
  try {
    const raw = localStorage.getItem(LAYOUTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedLayout[];
  } catch {
    return [];
  }
}

function persistLayouts(layouts: SavedLayout[]) {
  localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts));
}

export function saveLayout(name: string, layout: IJsonModel): SavedLayout {
  const layouts = getSavedLayouts();
  const entry: SavedLayout = { id: createId(), name, layout };
  layouts.push(entry);
  persistLayouts(layouts);
  return entry;
}

export function deleteLayout(id: string) {
  const layouts = getSavedLayouts().filter((l) => l.id !== id);
  persistLayouts(layouts);
}

export function renameLayout(id: string, newName: string) {
  const layouts = getSavedLayouts();
  const entry = layouts.find((l) => l.id === id);
  if (entry) {
    entry.name = newName;
    persistLayouts(layouts);
  }
}

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return "dark";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}
