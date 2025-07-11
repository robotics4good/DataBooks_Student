import { useState, useEffect } from 'react';
import { db, ref, get } from '../firebase';
import { toZonedTime } from 'date-fns-tz';

const SAN_DIEGO_TZ = 'America/Los_Angeles';
function toSanDiegoDate(ts) {
  return toZonedTime(new Date(ts), SAN_DIEGO_TZ);
}

function parseMeetingLogKey(key) {
  // Example: 2025-07-10T07_57_45_000-07_00
  const match = key.match(/^(.+T)(\d{2})_(\d{2})_(\d{2})_(\d{3})-(\d{2})_(\d{2})$/);
  if (match) {
    const iso = `${match[1]}${match[2]}:${match[3]}:${match[4]}.${match[5]}-${match[6]}:${match[7]}`;
    return new Date(iso);
  }
  let out = key;
  let count = 0;
  out = out.replace(/_/g, () => {
    count++;
    if (count === 3) return '.';
    return ':';
  });
  out = out.replace(/-(\d{2}):(\d{2})$/, (m, h, m2) => `-${h}:${m2}`);
  return new Date(out);
}

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
    setLoading(true);
    setError(null);
    const fetchLogs = async () => {
      try {
        const meetingLogsRef = ref(db, `sessions/${sessionId}/MeetingLogs`);
        const snapshot = await get(meetingLogsRef);
        const logs = snapshot.val();
        if (!logs) {
          setMeetingEnds([]);
          setLoading(false);
          return;
        }
        const ends = Object.keys(logs)
          .filter(key => logs[key]?.event === 'MEETINGEND')
          .map(key => toSanDiegoDate(parseMeetingLogKey(key)))
          .filter(d => d instanceof Date && !isNaN(d))
          .sort((a, b) => a - b);
        setMeetingEnds(ends);
      } catch (err) {
        setMeetingEnds([]);
        setError(err.message || 'Failed to fetch meeting logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [sessionId]);

  return { meetingEnds, loading, error };
} 