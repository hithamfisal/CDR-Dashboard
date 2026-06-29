import { useMemo } from "react";
import type { CallRecord, DashboardData, FleetmapRecord } from "../types/dashboard";
import { unionFleetmapRecords } from "../lib/fleetmapUtils";
import { cleanText, isKnownLabel, normalizeRadioKey } from "../lib/recordUtils";

export type FleetActivationSummary = {
  registeredCount: number;
  activeRegisteredCount: number;
  inactiveCount: number;
  activationRate: number;
  inactiveByCompany: Array<{ name: string; count: number; activeCount: number }>;
  inactiveByRegion: Array<{ name: string; count: number; activeCount: number }>;
  inactiveByMobileType: Array<{ name: string; count: number; activeCount: number }>;
};

export type UnmatchedFleetmapReportRow = {
  callerNumber: string;
  callerAlias: string;
  talkgroup: string;
  firstSeen: string;
  lastSeen: string;
  calls: number;
  totalDuration: number;
  baseStations: Set<string>;
  baseStationsText: string;
  reason: string;
};

export function useFleetActivation({
  data,
  filtered,
  masterFleetmapRecords,
  fixedFleetmapRecords,
}: {
  data: DashboardData | null;
  filtered: CallRecord[];
  masterFleetmapRecords: FleetmapRecord[];
  fixedFleetmapRecords: FleetmapRecord[];
}) {
  const fleetActivation = useMemo(() => {
    const liveFleetmap = unionFleetmapRecords(
      masterFleetmapRecords,
      fixedFleetmapRecords,
    );
    const savedFleetmap = data?.fleetmapRecords ?? [];
    const lookupFleetmapFallback: FleetmapRecord[] = (
      data?.lookupRecords ?? []
    ).map((record) => ({
      radioId: record.radioId,
      radioAlias: "",
      employeeName: "",
      employeeId: "",
      company: record.company,
      region: record.region,
      talkgroup: record.talkgroup,
      mobileType: "Unknown",
      source: "master",
    }));

    const fleetmapCandidates = [
      ...liveFleetmap,
      ...savedFleetmap,
      ...lookupFleetmapFallback,
    ];

    const activeRadioIds = new Set(
      filtered
        .map((record) => normalizeRadioKey(record.radioId))
        .filter((radioId) => isKnownLabel(radioId)),
    );

    const registeredMap = new Map<string, FleetmapRecord>();
    fleetmapCandidates.forEach((record) => {
      const radioKey = normalizeRadioKey(record.radioId);
      if (isKnownLabel(radioKey) && !registeredMap.has(radioKey)) {
        registeredMap.set(radioKey, record);
      }
    });

    const registered = [...registeredMap.entries()].map(
      ([radioKey, record]) => ({ radioKey, record }),
    );
    const activeRegistered = registered.filter((item) =>
      activeRadioIds.has(item.radioKey),
    );
    const inactive = registered
      .filter((item) => !activeRadioIds.has(item.radioKey))
      .map((item) => item.record);
    const activeRegisteredRecords = activeRegistered.map((item) => item.record);
    const registeredRecords = registered.map((item) => item.record);

    const buildAllDimensionRows = (
      getRegisteredName: (record: FleetmapRecord) => string,
      getFilteredName: (record: CallRecord) => string,
    ) => {
      const map = new Map<string, number>();

      registeredRecords.forEach((record) => {
        const name = cleanText(getRegisteredName(record), "Unknown");
        if (isKnownLabel(name) && !map.has(name)) map.set(name, 0);
      });

      filtered.forEach((record) => {
        const name = cleanText(getFilteredName(record), "Unknown");
        if (isKnownLabel(name) && !map.has(name)) map.set(name, 0);
      });

      const activeMap = new Map<string, number>();

      activeRegisteredRecords.forEach((record) => {
        const name = cleanText(getRegisteredName(record), "Unknown");
        if (isKnownLabel(name)) {
          activeMap.set(name, (activeMap.get(name) ?? 0) + 1);
        }
      });

      if (registeredRecords.length === 0) {
        const activeFilteredKeys = new Map<string, Set<string>>();
        filtered.forEach((record) => {
          const name = cleanText(getFilteredName(record), "Unknown");
          const radioKey = normalizeRadioKey(record.radioId);
          if (!isKnownLabel(name) || !isKnownLabel(radioKey)) return;
          const set = activeFilteredKeys.get(name) ?? new Set<string>();
          set.add(radioKey);
          activeFilteredKeys.set(name, set);
        });
        activeFilteredKeys.forEach((set, name) =>
          activeMap.set(name, set.size),
        );
      }

      inactive.forEach((record) => {
        const name = cleanText(getRegisteredName(record), "Unknown");
        if (isKnownLabel(name)) map.set(name, (map.get(name) ?? 0) + 1);
      });

      activeMap.forEach((_count, name) => {
        if (isKnownLabel(name) && !map.has(name)) map.set(name, 0);
      });

      return [...map.entries()]
        .map(([name, count]) => ({
          name,
          count,
          activeCount: activeMap.get(name) ?? 0,
        }))
        .sort(
          (a, b) =>
            b.count - a.count ||
            b.activeCount - a.activeCount ||
            a.name.localeCompare(b.name),
        );
    };

    return {
      registeredCount: registered.length,
      activeRegisteredCount: activeRegistered.length,
      inactiveCount: inactive.length,
      activationRate: registered.length
        ? (activeRegistered.length / registered.length) * 100
        : 0,
      inactiveByCompany: buildAllDimensionRows(
        (record) => record.company,
        (record) => record.company,
      ),
      inactiveByRegion: buildAllDimensionRows(
        (record) => record.region,
        (record) => record.region,
      ),
      inactiveByMobileType: buildAllDimensionRows(
        (record) => record.mobileType,
        (record) => record.mobileType,
      ),
    };
  }, [
    data?.fleetmapRecords,
    data?.lookupRecords,
    filtered,
    masterFleetmapRecords,
    fixedFleetmapRecords,
  ]);

  const unmatchedFleetmapReportRows = useMemo(() => {
    const map = new Map<
      string,
      {
        callerNumber: string;
        callerAlias: string;
        talkgroup: string;
        firstSeen: string;
        lastSeen: string;
        calls: number;
        totalDuration: number;
        baseStations: Set<string>;
        reason: string;
      }
    >();

    filtered.forEach((record) => {
      const isUnmatchedFleetmap = record.region === "Unmatched Fleetmap";
      const isUnknownCompany = record.company === "Unknown";
      if (!isUnmatchedFleetmap && !isUnknownCompany) return;

      const callerNumber =
        normalizeRadioKey(record.radioId) ||
        cleanText(record.radioId, "Unknown");
      const reason = isUnmatchedFleetmap
        ? "Caller Number not found in Master/Fixed Fleetmap Radio ID"
        : "Fleetmap match incomplete or Company missing";
      const current = map.get(callerNumber) ?? {
        callerNumber,
        callerAlias: cleanText(record.radioAlias, "Not labelled"),
        talkgroup: cleanText(record.talkgroup, "Unknown"),
        firstSeen: record.startTime,
        lastSeen: record.endTime || record.startTime,
        calls: 0,
        totalDuration: 0,
        baseStations: new Set<string>(),
        reason,
      };

      current.calls += 1;
      current.totalDuration += record.durationSeconds;
      if (isKnownLabel(record.baseStation)) {
        current.baseStations.add(record.baseStation);
      }
      if (
        record.startTime &&
        (!current.firstSeen || record.startTime < current.firstSeen)
      ) {
        current.firstSeen = record.startTime;
      }
      if (
        record.endTime &&
        (!current.lastSeen || record.endTime > current.lastSeen)
      ) {
        current.lastSeen = record.endTime;
      }
      if (!isKnownLabel(current.callerAlias) && isKnownLabel(record.radioAlias)) {
        current.callerAlias = record.radioAlias;
      }
      if (!isKnownLabel(current.talkgroup) && isKnownLabel(record.talkgroup)) {
        current.talkgroup = record.talkgroup;
      }
      map.set(callerNumber, current);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        baseStationsText: [...row.baseStations].sort().join(", ") || "Unknown",
      }))
      .sort(
        (a, b) =>
          b.calls - a.calls || a.callerNumber.localeCompare(b.callerNumber),
      );
  }, [filtered]);

  return { fleetActivation, unmatchedFleetmapReportRows };
}
