// ============================================================================
// useESPData.js - Clean refactor and documentation
// Fetches ESP data and meeting logs from Firebase, normalizes timestamps
// for San Diego time, deduplicates, downsamples, and enriches with metadata.
// ============================================================================

import { useState, useEffect, useRef } from "react";
import { db, ref, get, onValue } from "../firebase";
import { toZonedTime } from "date-fns-tz";
import { playerNames, sectorIds } from "../plots/plotConfigs";
import { fetchMeetingEnds } from "./useMeetingLogs"; // <-- Reuse meeting log logic

const SAN_DIEGO_TZ = "America/Los_Angeles";

// ============================================================================
// TIME HELPERS
// ============================================================================

/** Convert timestamp → San Diego Date object */
function toSanDiegoDate(ts) {
  return toZonedTime(new Date(ts), SAN_DIEGO_TZ);
}

// ============================================================================
// FIREBASE HELPERS
// ============================================================================

/** Fetch active ESP readings from Firebase */
async function fetchESPReadings() {
  const snapshot = await get(ref(db, "readings"));
  return snapshot.exists() ? snapshot.val() : null;
}

// ============================================================================
// DATA NORMALIZATION
// ============================================================================

/**
 * Clean, deduplicate, and downsample ESP records.
 * Adds derived fields: hour, session_half, meetings_held, infection metadata.
 */
function normalizeESPData(rawData, meetingEnds) {
  if (!rawData) return [];

  const data = Object.entries(rawData).map(([id, rec]) => ({
    id,
    ...rec,
    localTime: toSanDiegoDate(rec.timestamp),
  }));

  data.sort((a, b) => a.localTime - b.localTime);
  const filtered = data.filter(d => d.device_id !== "QR" && d.device_id !== "CR");

  // Deduplicate consecutive identical readings (excluding timestamp)
  const deduped = [];
  const lastByDevice = {};
  for (const rec of filtered) {
    const { device_id, ...clone } = rec;
    delete clone.timestamp;
    delete clone.localTime;
    const prev = lastByDevice[device_id];
    if (!prev || JSON.stringify(prev) !== JSON.stringify(clone)) {
      deduped.push(rec);
      lastByDevice[device_id] = clone;
    }
  }

  // Downsample to ≤200 records per device
  const grouped = {};
  for (const r of deduped) (grouped[r.device_id] ??= []).push(r);
  const downsampled = Object.values(grouped).flatMap(arr =>
    arr.length > 200 ? arr.filter((_, i) => i % Math.ceil(arr.length / 200) === 0) : arr
  );

  // Add derived fields
  return downsampled.map(r => {
    const hour = r.localTime.getHours();
    const session_half = hour < 12 ? "AM" : "PM";
    const meetings_held = meetingEnds.filter(t => t <= r.localTime).length;
    const isCadet = playerNames.includes(r.device_id);
    const isInfected = r.infection_status === 1;
    return {
      ...r,
      hour,
      session_half,
      meetings_held,
      infected_cadets: isCadet && isInfected ? r.device_id : null,
      infected_sectors: !isCadet && isInfected ? r.device_id : null,
      healthy_sectors:
        !isCadet && (r.infection_status === 0 || r.infection_status === 0.5)
          ? r.device_id
          : null,
    };
  });
}

/** Track latest infection status per device */
function computeStatusSets(data) {
  const latest = {};
  for (const d of data) {
    const dev = d.device_id;
    if (!dev) continue;
    if (!latest[dev] || d.timestamp > latest[dev].timestamp) latest[dev] = d;
  }

  const infectedCadets = new Set();
  const healthyCadets = new Set();
  const infectedSectors = new Set();
  const healthySectors = new Set();

  for (const [dev, rec] of Object.entries(latest)) {
    if (playerNames.includes(dev)) {
      rec.infection_status === 1 ? infectedCadets.add(dev) : healthyCadets.add(dev);
    } else if (sectorIds.includes(dev)) {
      rec.infection_status === 1
        ? infectedSectors.add(dev)
        : healthySectors.add(dev);
    }
  }

  return { infectedCadets, healthyCadets, infectedSectors, healthySectors };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * useESPData
 * Fetches and tracks ESP device data + meeting logs in real time.
 *
 * @param {boolean} enableRealTime - Enable live Firebase updates (default false)
 * @returns {object} { espData, loading, error, allInfectedCadets, getPlotData, ... }
 */
export function useESPData(enableRealTime = false) {
  const [espData, setEspData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Infection sets for filters
  const [allInfectedCadets, setAllInfectedCadets] = useState(new Set());
  const [allHealthyCadets, setAllHealthyCadets] = useState(new Set());
  const [allInfectedSectors, setAllInfectedSectors] = useState(new Set());
  const [allHealthySectors, setAllHealthySectors] = useState(new Set());

  const unsubscribeRef = useRef(null);
  const pollingRef = useRef(null);

  /** Fetch all ESP + meeting data once */
  const fetchAll = async () => {
    try {
      setLoading(true);
      const sessionSnap = await get(ref(db, "activeSessionId"));
      const sessionId = sessionSnap.exists() ? sessionSnap.val() : null;

      const meetingEnds = sessionId ? await fetchMeetingEnds(sessionId) : [];
      const rawESP = await fetchESPReadings();
      if (!rawESP) {
        setEspData([]);
        return;
      }

      const cleaned = normalizeESPData(rawESP, meetingEnds);
      setEspData(cleaned);

      const sets = computeStatusSets(cleaned);
      setAllInfectedCadets(sets.infectedCadets);
      setAllHealthyCadets(sets.healthyCadets);
      setAllInfectedSectors(sets.infectedSectors);
      setAllHealthySectors(sets.healthySectors);
    } catch (err) {
      console.error("[useESPData] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Set up real-time Firebase listener if enabled */
  useEffect(() => {
    fetchAll(); // initial load

    if (!enableRealTime) return;

    const espRef = ref(db, "readings");
    unsubscribeRef.current = onValue(espRef, async (snapshot) => {
      const data = snapshot.val();
      const sessionSnap = await get(ref(db, "activeSessionId"));
      const sessionId = sessionSnap.exists() ? sessionSnap.val() : null;
      const meetingEnds = sessionId ? await fetchMeetingEnds(sessionId) : [];
      const cleaned = normalizeESPData(data, meetingEnds);
      setEspData(cleaned);

      const sets = computeStatusSets(cleaned);
      setAllInfectedCadets(sets.infectedCadets);
      setAllHealthyCadets(sets.healthyCadets);
      setAllInfectedSectors(sets.infectedSectors);
      setAllHealthySectors(sets.healthySectors);
    });

    // Poll backup every 60 seconds
    pollingRef.current = setInterval(fetchAll, 60000);

    return () => {
      unsubscribeRef.current?.();
      clearInterval(pollingRef.current);
    };
  }, [enableRealTime]);

  return {
    espData,
    loading,
    error,
    allInfectedCadets,
    allHealthyCadets,
    allInfectedSectors,
    allHealthySectors,
    fetchESPData: fetchAll,
  };
}
