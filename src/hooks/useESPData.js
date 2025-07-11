// useESPData.js - Custom hook for fetching and transforming ESP data from Firebase
// All time handling uses local device time only
import { useState, useEffect, useRef } from 'react';
import { db, ref, get, onValue } from '../firebase';
import { formatLocalTime, getLocalIsoString, getLocalTimeOnlyString } from '../utils/timeUtils';
import { playerNames } from '../plots/plotConfigs';
import { toZonedTime } from 'date-fns-tz';

const SAN_DIEGO_TZ = 'America/Los_Angeles';
function toSanDiegoDate(ts) {
  return toZonedTime(new Date(ts), SAN_DIEGO_TZ);
}

/**
 * Custom hook for fetching ESP data from Firebase and transforming it for plots
 * @param {boolean} enableRealTime - Whether to enable real-time updates (default: false)
 * @returns {Object} - ESP data in various formats for different plot types
 */
export function useESPData(enableRealTime = false) {
  const [espData, setEspData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latestTimestampRef = useRef(null);

  // Persistent sets for all healthy/infected cadets and sectors
  const [allInfectedCadets, setAllInfectedCadets] = useState(new Set());
  const [allHealthyCadets, setAllHealthyCadets] = useState(new Set());
  const [allInfectedSectors, setAllInfectedSectors] = useState(new Set());
  const [allHealthySectors, setAllHealthySectors] = useState(new Set());

  // Helper to update persistent sets
  const updateStatusSets = (data) => {
    const infectedCadets = new Set();
    const healthyCadets = new Set();
    const infectedSectors = new Set();
    const healthySectors = new Set();
    (data || []).forEach(d => {
      const isCadet = playerNames.includes(d.device_id);
      if (isCadet) {
        if (d.infected_cadets) infectedCadets.add(d.device_id);
        if (d.healthy_cadets) healthyCadets.add(d.device_id);
      } else {
        // Sector logic: use infection_status
        if (d.infection_status === 1) infectedSectors.add(d.device_id);
        if (d.infection_status === 0) healthySectors.add(d.device_id);
      }
    });
    setAllInfectedCadets(infectedCadets);
    setAllHealthyCadets(healthyCadets);
    setAllInfectedSectors(infectedSectors);
    setAllHealthySectors(healthySectors);
  };

  // Helper to fetch meeting logs for the current session
  const fetchMeetingLogs = async (sessionId) => {
    try {
      const meetingLogsRef = ref(db, `sessions/${sessionId}/MeetingLogs`);
      const snapshot = await get(meetingLogsRef);
      const logs = snapshot.val();
      if (!logs) return [];
      // Only keep MEETINGEND events, parse key and convert to San Diego time
      return Object.keys(logs)
        .filter(key => logs[key]?.event === 'MEETINGEND')
        .map(key => toSanDiegoDate(parseMeetingLogKey(key)))
        .filter(d => d instanceof Date && !isNaN(d))
        .sort((a, b) => a - b);
    } catch (err) {
      return [];
    }
  };

  // Main fetch function (ESP + meetings)
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get sessionId
      const sessionIdSnap = await get(ref(db, 'activeSessionId'));
      const sessionId = sessionIdSnap.exists() ? sessionIdSnap.val() : null;
      // 2. Fetch meeting logs (MEETINGEND only, with local time)
      const meetingEnds = sessionId ? await fetchMeetingLogs(sessionId) : [];
      // 3. Fetch ESP data
      const espDataRef = ref(db, 'readings');
      const snapshot = await get(espDataRef);
      const data = snapshot.val();
      if (data) {
        // Transform ESP data: always use ESP timestamp as anchor (local time)
        const transformedData = Object.keys(data).map(key => {
          const record = { id: key, ...data[key] };
          // Parse ESP timestamp as San Diego time
          let localDate = toSanDiegoDate(record.timestamp);
          record.localTime = localDate;
          return record;
        });
        // Sort by ESP local time
        transformedData.sort((a, b) => (a.localTime - b.localTime));
        // Deduplicate: remove consecutive records for the same device_id with identical fields (except timestamp)
        const dedupedData = [];
        const lastByDevice = {};
        for (const rec of transformedData) {
          const dev = rec.device_id;
          const prev = lastByDevice[dev];
          // Compare all fields except timestamp
          const recClone = { ...rec };
          delete recClone.timestamp;
          delete recClone.localTime;
          if (!prev || JSON.stringify(prev) !== JSON.stringify(recClone)) {
            dedupedData.push(rec);
            lastByDevice[dev] = { ...recClone };
          }
        }
        // Downsample: if a device has >200 records, keep only every Nth record
        const grouped = {};
        for (const rec of dedupedData) {
          if (!grouped[rec.device_id]) grouped[rec.device_id] = [];
          grouped[rec.device_id].push(rec);
        }
        let downsampledData = [];
        for (const dev in grouped) {
          const arr = grouped[dev];
          if (arr.length > 200) {
            const N = Math.ceil(arr.length / 200);
            for (let i = 0; i < arr.length; i += N) {
              downsampledData.push(arr[i]);
            }
          } else {
            downsampledData = downsampledData.concat(arr);
          }
        }
        // Sort again by ESP local time after dedup/downsample
        downsampledData.sort((a, b) => (a.localTime - b.localTime));
        // Add derived fields to each record, including meetings_held and session_half (based on ESP time)
        const normalizedData = downsampledData.map(record => {
          const hour = record.localTime.getHours();
          const session_half = hour < 12 ? 'AM' : 'PM';
          // Count meetings held (MEETINGEND events before or at this record's ESP time)
          const meetings_held = meetingEnds.filter(endTime => endTime <= record.localTime).length;
          // Infection status mapping
          const isCadet = playerNames.includes(record.device_id);
          const isInfected = record.infection_status === 1;
          const infected_cadets = isCadet && isInfected ? record.device_id : null;
          const infected_sectors = !isCadet && isInfected ? record.device_id : null;
          const healthy_sectors = !isCadet && record.infection_status === 0 ? record.device_id : null;
          return {
            ...record,
            hour,
            session_half,
            meetings_held,
            infected_cadets,
            infected_sectors,
            healthy_sectors
          };
        });
        setEspData(normalizedData);
        updateStatusSets(normalizedData);
      } // else: no data, do not update
    } catch (err) {
      console.error("Error processing ESP or meeting data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and polling every 30 seconds
  useEffect(() => {
    let unsubscribe = null;
    let meetingEnds = [];
    let meetingInterval = null;
    let sessionId = null;
    let isMounted = true;
    let lastSessionId = null;
    // No need for espDataCallback, use unsubscribe from onValue

    // Helper to process and update ESP data
    const processESPData = (data) => {
      try {
        if (!data) {
          if (isMounted) setEspData([]);
          updateStatusSets([]);
          return;
        }
        // Remove all proximity_mask/proximity_count logic
        // Always parse ESP timestamp as UTC, then convert to San Diego time
        const transformedData = Object.keys(data).map(key => {
          const record = { id: key, ...data[key] };
          // Parse timestamp as UTC, then convert to San Diego time
          let localDate = toSanDiegoDate(record.timestamp);
          record.localTime = localDate;
          return record;
        });
        // Sort by ESP San Diego time
        transformedData.sort((a, b) => (a.localTime - b.localTime));
        // Deduplicate: remove consecutive records for the same device_id with identical fields (except timestamp)
        const dedupedData = [];
        const lastByDevice = {};
        for (const rec of transformedData) {
          const dev = rec.device_id;
          const prev = lastByDevice[dev];
          // Compare all fields except timestamp
          const recClone = { ...rec };
          delete recClone.timestamp;
          delete recClone.localTime;
          if (!prev || JSON.stringify(prev) !== JSON.stringify(recClone)) {
            dedupedData.push(rec);
            lastByDevice[dev] = { ...recClone };
          }
        }
        // Downsample: if a device has >200 records, keep only every Nth record
        const grouped = {};
        for (const rec of dedupedData) {
          if (!grouped[rec.device_id]) grouped[rec.device_id] = [];
          grouped[rec.device_id].push(rec);
        }
        let downsampledData = [];
        for (const dev in grouped) {
          const arr = grouped[dev];
          if (arr.length > 200) {
            const N = Math.ceil(arr.length / 200);
            for (let i = 0; i < arr.length; i += N) {
              downsampledData.push(arr[i]);
            }
          } else {
            downsampledData = downsampledData.concat(arr);
          }
        }
        // Sort by ESP San Diego time again after dedup/downsample
        downsampledData.sort((a, b) => (a.localTime - b.localTime));
        // Add derived fields to each record, including meetings_held and session_half (based on ESP time)
        const normalizedData = downsampledData.map(record => {
          const hour = record.localTime.getHours();
          const session_half = hour < 12 ? 'AM' : 'PM';
          // Count meetings held (MEETINGEND events before or at this record's ESP time)
          const meetings_held = meetingEnds.filter(endTime => endTime <= record.localTime).length;
          // Infection status mapping
          const isCadet = playerNames.includes(record.device_id);
          const isInfected = record.infection_status === 1;
          const infected_cadets = isCadet && isInfected ? record.device_id : null;
          const infected_sectors = !isCadet && isInfected ? record.device_id : null;
          const healthy_sectors = !isCadet && record.infection_status === 0 ? record.device_id : null;
          return {
            ...record,
            hour,
            session_half,
            meetings_held,
            infected_cadets,
            infected_sectors,
            healthy_sectors
          };
        });
        if (isMounted) setEspData(normalizedData);
        updateStatusSets(normalizedData);
      } catch (err) {
        if (isMounted) setError('Error normalizing ESP data: ' + err.message);
      }
    };

    // Helper to fetch sessionId and set up meeting logs polling
    const setupMeetingsAndListener = async () => {
      setLoading(true);
      setError(null);
      try {
        // Poll sessionId every 30 seconds
        const pollSessionAndMeetings = async () => {
          const sessionIdSnap = await get(ref(db, 'activeSessionId'));
          const newSessionId = sessionIdSnap.exists() ? sessionIdSnap.val() : null;
          if (newSessionId !== lastSessionId) {
            lastSessionId = newSessionId;
            sessionId = newSessionId;
            meetingEnds = sessionId ? await fetchMeetingLogs(sessionId) : [];
          }
        };
        await pollSessionAndMeetings();
        meetingInterval = setInterval(async () => {
          await pollSessionAndMeetings();
          if (sessionId) {
            meetingEnds = await fetchMeetingLogs(sessionId);
          }
        }, 30000);
        // Set up real-time listener for ESP data
        const espDataRef = ref(db, 'readings');
        unsubscribe = onValue(espDataRef, (snapshot) => {
          const data = snapshot.val();
          processESPData(data);
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    setupMeetingsAndListener();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (meetingInterval) clearInterval(meetingInterval);
    };
  }, []);

  // Transform ESP data for different plot types
  const getPlotData = (plotType, xVariable = "timestamp", yVariable = "status") => {
    if (!espData.length) return [];

    switch (plotType) {
      case 'line':
      case 'scatter':
        return [{
          id: 'ESP Data',
          data: espData.map(item => ({
            x: xVariable === "timestamp" ? getLocalTimeOnlyString(new Date(item.timestamp)) : item[xVariable],
            y: item[yVariable] || 0
          }))
        }];

      case 'bar':
        // Group by device ID and count button presses
        const groupedData = espData.reduce((acc, item) => {
          const deviceId = item.id || 'Unknown';
          if (!acc[deviceId]) {
            acc[deviceId] = {
              buttonAPresses: 0,
              buttonBPresses: 0,
              interactions: 0,
              totalPackets: 0
            };
          }
          acc[deviceId].buttonAPresses += item.buttonA || 0;
          acc[deviceId].buttonBPresses += item.buttonB || 0;
          acc[deviceId].interactions += item.beaconArray || 0;
          acc[deviceId].totalPackets += 1;
          return acc;
        }, {});
        
        return [
          {
            id: 'Button A Presses',
            data: Object.entries(groupedData).map(([deviceId, stats]) => ({
              x: deviceId,
              y: stats.buttonAPresses
            }))
          },
          {
            id: 'Button B Presses',
            data: Object.entries(groupedData).map(([deviceId, stats]) => ({
              x: deviceId,
              y: stats.buttonBPresses
            }))
          },
          {
            id: 'Interactions',
            data: Object.entries(groupedData).map(([deviceId, stats]) => ({
              x: deviceId,
              y: stats.interactions
            }))
          }
        ];

      case 'histogram':
        // Create histogram of status values
        const statusCounts = {};
        espData.forEach(item => {
          const status = item.status || 0;
          const bucket = Math.floor(status * 10) / 10; // Group by 0.1 increments
          statusCounts[bucket] = (statusCounts[bucket] || 0) + 1;
        });
        
        return [{
          id: 'Status Distribution',
          data: Object.entries(statusCounts).map(([bucket, count]) => ({
            x: `${parseFloat(bucket).toFixed(1)}`,
            y: count
          }))
        }];

      case 'pie':
        // Count button presses and interactions
        const totalStats = espData.reduce((acc, item) => {
          acc.buttonAPresses += item.buttonA || 0;
          acc.buttonBPresses += item.buttonB || 0;
          acc.interactions += item.beaconArray || 0;
          return acc;
        }, { buttonAPresses: 0, buttonBPresses: 0, interactions: 0 });
        
        return [
          {
            id: 'Button A',
            label: 'Button A Presses',
            value: totalStats.buttonAPresses
          },
          {
            id: 'Button B',
            label: 'Button B Presses',
            value: totalStats.buttonBPresses
          },
          {
            id: 'Interactions',
            label: 'Device Interactions',
            value: totalStats.interactions
          }
        ];

      default:
        return [];
    }
  };

  // Get available variables for plot configuration
  const getAvailableVariables = () => {
    if (!espData.length) return [];
    
    const firstItem = espData[0];
    return Object.keys(firstItem).filter(key => 
      key !== 'id' && 
      typeof firstItem[key] === 'number' || 
      typeof firstItem[key] === 'string'
    );
  };

  // Get unique device IDs
  const getDeviceIds = () => {
    return [...new Set(espData.map(item => item.id).filter(Boolean))];
  };

  // Calculate statistics
  const totalPackets = espData.length;
  const uniqueStudents = getDeviceIds().length;
  const timeRange = espData.length > 0 ? {
    start: espData[0]?.timestamp,
    end: espData[espData.length - 1]?.timestamp
  } : null;

  return {
    // Raw data
    espData,
    loading,
    error,
    // Persistent sets for filters
    allInfectedCadets,
    allHealthyCadets,
    allInfectedSectors,
    allHealthySectors,
    // Manual fetch function
    fetchESPData: fetchAllData, // Renamed to avoid conflict with new fetchAllData
    // Plot data functions
    getPlotData,
    getAvailableVariables,
    getDeviceIds,
    // Statistics
    totalPackets,
    uniqueStudents,
    timeRange
  };
} 

// Utility to robustly parse MeetingLogs keys to Date
function parseMeetingLogKey(key) {
  // Example: 2025-07-10T07_57_45_000-07_00
  // Want:    2025-07-10T07:57:45.000-07:00
  const match = key.match(/^(.+T)(\d{2})_(\d{2})_(\d{2})_(\d{3})-(\d{2})_(\d{2})$/);
  if (match) {
    // match[1]=dateT, [2]=hh, [3]=mm, [4]=ss, [5]=ms, [6]=tz1, [7]=tz2
    const iso = `${match[1]}${match[2]}:${match[3]}:${match[4]}.${match[5]}-${match[6]}:${match[7]}`;
    const dateObj = new Date(iso);
    console.log('[parseMeetingLogKey] key:', key, '| iso:', iso, '| date:', dateObj);
    return dateObj;
  }
  // Fallback: replace all underscores with colons except the third (which becomes a period)
  let out = key;
  let count = 0;
  out = out.replace(/_/g, () => {
    count++;
    if (count === 3) return '.';
    return ':';
  });
  // Fix timezone
  out = out.replace(/-(\d{2}):(\d{2})$/, (m, h, m2) => `-${h}:${m2}`);
  const dateObj = new Date(out);
  console.log('[parseMeetingLogKey] key:', key, '| fallback out:', out, '| date:', dateObj);
  return dateObj;
}

export async function fetchMeetingLogTimestamps(sessionId) {
  try {
    const meetingLogsRef = ref(db, `sessions/${sessionId}/MeetingLogs`);
    const snapshot = await get(meetingLogsRef);
    const logs = snapshot.val();
    if (!logs) return [];
    // Only keep MEETINGEND events
    const filteredKeys = Object.keys(logs).filter(key => logs[key]?.event === 'MEETINGEND');
    console.log('[fetchMeetingLogTimestamps] Raw keys (MEETINGEND only):', filteredKeys);
    // Parse and convert to San Diego time
    const parsed = filteredKeys.map(key => toSanDiegoDate(parseMeetingLogKey(key)));
    console.log('[fetchMeetingLogTimestamps] Parsed timestamps (San Diego time):', parsed);
    if (parsed.length > 1) {
      const first = parsed[0];
      const elapsed = parsed.map((t, i) => ({ x: i + 1, y: Math.round((t - first) / 60000) }));
      console.log('[fetchMeetingLogTimestamps] Elapsed minutes for each meeting:', elapsed);
    }
    return parsed.filter(d => d instanceof Date && !isNaN(d)).sort((a, b) => a - b);
  } catch (err) {
    return [];
  }
} 