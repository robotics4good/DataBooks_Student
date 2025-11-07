// ============================================================================
// useMeetingLogs.js - Clean refactor and documentation
// Fetches and parses MEETINGEND events from Firebase for a given session.
// All timestamps are converted to San Diego local time.
// ============================================================================

import { useState, useEffect } from "react";
import { db, ref, get } from "../firebase";
import { toZonedTime } from "date-fns-tz";

const SAN_DIEGO_TZ = "America/Los_Angeles";

// ============================================================================
// TIME HELPERS
// ============================================================================

/** Convert timestamp → San Diego Date object */
function toSanDiegoDate(ts) {
  return toZonedTime(new Date(ts), SAN_DIEGO_TZ);
}

/**
 * Parse a Firebase MeetingLogs key into a valid Date.
 * Example key: 2025-07-10T07_57_45_000-07_00 → ISO Date string.
 */
function parseMeetingLogKey(key) {
  const match = key.match(/^(.+T)(\d{2})_(\d{2})_(\d{2})_(\d{3})-(\d{2})_(\d{2})$/);
  if (match) {
    return new Date(
      `${match[1]}${match[2]}:${match[3]}:${match[4]}.${match[5]}-${match[6]}:${match[7]}`
    );
  }

  // Fallback parser for malformed keys
  let count = 0;
  const out = key
    .replace(/_/g, () => (++count === 3 ? "." : ":"))
    .replace(/-(\d{2}):(\d{2})$/, (_, h, m) => `-${h}:${m}`);
  return new Date(out);
}

// ============================================================================
// SHARED FETCH FUNCTION (for useESPData)
// ============================================================================

/**
 * Fetch all MEETINGEND timestamps for a session and return sorted Date objects.
 * @param {string} sessionId - The current session identifier in Firebase.
 * @returns {Promise<Date[]>} Array of Date objects in San Diego time.
 */
export async function fetchMeetingEnds(sessionId) {
  try {
    const snapshot = await get(ref(db, `sessions/${sessionId}/MeetingLogs`));
    const logs = snapshot.val();
    if (!logs) return [];

    return Object.keys(logs)
      .filter(k => logs[k]?.event === "MEETINGEND")
      .map(k => toSanDiegoDate(parseMeetingLogKey(k)))
      .filter(d => d instanceof Date && !isNaN(d))
      .sort((a, b) => a - b);
  } catch (err) {
    console.error("[fetchMeetingEnds] Failed to fetch meeting logs:", err);
    return [];
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * useMeetingLogs
 * Retrieves and manages the list of MEETINGEND timestamps for a given session.
 *
 * @param {string|null} sessionId - Firebase session ID to fetch from
 * @returns {Object} { meetingEnds, loading, error }
 */
export function useMeetingLogs(sessionId) {
  const [meetingEnds, setMeetingEnds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setMeetingEnds([]);
      setLoading(false);
      setError(null);
      return;
    }

    const loadLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const ends = await fetchMeetingEnds(sessionId);
        console.log("[useMeetingLogs] Meeting Ends:", ends);
        setMeetingEnds(ends);
      } catch (err) {
        console.error("[useMeetingLogs] Error:", err);
        setError(err.message || "Failed to fetch meeting logs");
        setMeetingEnds([]);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [sessionId]);

  return { meetingEnds, loading, error };
}
