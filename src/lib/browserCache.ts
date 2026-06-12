import { useCallback, useState } from "react";
import { SAVED_WORKBOOK_DB, SAVED_WORKBOOK_KEY, SAVED_WORKBOOK_META_KEY, SAVED_WORKBOOK_STORE } from "./dashboardConstants";
import type { DashboardData, FleetmapMeta, FleetmapRecord, SavedWorkbookMeta, ThemeName } from "../types/dashboard";
export function themeClass(theme: ThemeName) { return theme === "light" ? "light-background-theme" : "dark-background-theme"; }

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>("dark");
  const isDark = theme === "dark";
  const toggleTheme = useCallback(() => setTheme((current) => (current === "light" ? "dark" : "light")), []);

  return { theme, isDark, toggleTheme };
}

export function workbookMeta(data: DashboardData): SavedWorkbookMeta {
  return { fileName: data.fileName, sourceSheet: data.sourceSheet, loadedAt: data.loadedAt, rawRows: data.rawRows };
}

export function getSavedWorkbookMeta(): SavedWorkbookMeta | null {
  try { const raw = window.localStorage.getItem(SAVED_WORKBOOK_META_KEY); return raw ? JSON.parse(raw) as SavedWorkbookMeta : null; } catch { return null; }
}

export function setSavedWorkbookMeta(meta: SavedWorkbookMeta | null) {
  try { if (meta) window.localStorage.setItem(SAVED_WORKBOOK_META_KEY, JSON.stringify(meta)); else window.localStorage.removeItem(SAVED_WORKBOOK_META_KEY); } catch { /* ignore */ }
}

export function openSavedWorkbookDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(SAVED_WORKBOOK_DB, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(SAVED_WORKBOOK_STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkbookToBrowser(data: DashboardData) {
  const db = await openSavedWorkbookDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAVED_WORKBOOK_STORE, "readwrite");
    tx.objectStore(SAVED_WORKBOOK_STORE).put(data, SAVED_WORKBOOK_KEY);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
  setSavedWorkbookMeta(workbookMeta(data));
}

export async function loadWorkbookFromBrowser(): Promise<DashboardData | null> {
  const db = await openSavedWorkbookDb();
  const data = await new Promise<DashboardData | null>((resolve, reject) => {
    const tx = db.transaction(SAVED_WORKBOOK_STORE, "readonly");
    const req = tx.objectStore(SAVED_WORKBOOK_STORE).get(SAVED_WORKBOOK_KEY);
    req.onsuccess = () => resolve((req.result as DashboardData | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return data;
}

export async function saveFleetmapToBrowser(key: string, records: FleetmapRecord[], meta: FleetmapMeta) {
  const db = await openSavedWorkbookDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAVED_WORKBOOK_STORE, "readwrite");
    tx.objectStore(SAVED_WORKBOOK_STORE).put({ records, meta }, key);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadFleetmapFromBrowser(key: string): Promise<{ records: FleetmapRecord[]; meta: FleetmapMeta } | null> {
  const db = await openSavedWorkbookDb();
  const data = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(SAVED_WORKBOOK_STORE, "readonly");
    const req = tx.objectStore(SAVED_WORKBOOK_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null); req.onerror = () => reject(req.error);
  });
  db.close();
  return data;
}

