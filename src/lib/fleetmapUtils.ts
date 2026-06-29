import type { FleetmapRecord } from "../types/dashboard";
import { isKnownLabel, normalizeRadioKey } from "./recordUtils";

export function unionFleetmapRecords(
  master: FleetmapRecord[],
  fixed: FleetmapRecord[],
): FleetmapRecord[] {
  const map = new Map<string, FleetmapRecord>();
  [...master, ...fixed].forEach((record) => {
    const radioKey = normalizeRadioKey(record.radioId);
    if (isKnownLabel(radioKey) && !map.has(radioKey)) map.set(radioKey, record);
  });
  return [...map.values()];
}
