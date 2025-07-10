// useESPData.js - Custom hook for fetching and transforming ESP data from Firebase
// All time handling uses local device time only
import { useState, useEffect, useRef } from 'react';
import { db, ref, get, onValue } from '../firebase';
import { formatLocalTime, getLocalIsoString, getLocalTimeOnlyString } from '../utils/timeUtils';
import { playerNames } from '../plots/plotConfigs';

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

  // Helper to fetch meeting logs for the current session
  const fetchMeetingLogs = async (sessionId) => {
    try {
      const meetingLogsRef = ref(db, `sessions/${sessionId}/MeetingLogs`);
      const snapshot = await get(meetingLogsRef);
      const logs = snapshot.val();
      if (!logs) return [];
      // Convert to array and local time
      return Object.values(logs).map(log => ({
        ...log,
        localTime: new Date(log.timestamp)
      })).filter(log => log.event === 'MEETINGEND');
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
      console.debug('[ESPData] Raw readings node from Firebase:', data); // DEBUG LOG
      if (data) {
        // Transform ESP data: always use ESP timestamp as anchor (local time)
        const transformedData = Object.keys(data).map(key => {
          const record = { id: key, ...data[key] };
          // Parse ESP timestamp as local time
          let localDate = new Date(record.timestamp);
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
          const meetings_held = meetingEnds.filter(log => log.localTime <= record.localTime).length;
          // Infection status mapping
          const isCadet = playerNames.includes(record.device_id);
          const isInfected = record.infection_status === 1;
          const infected_cadets = isCadet && isInfected ? record.device_id : null;
          const infected_sectors = !isCadet && isInfected ? record.device_id : null;
          return {
            ...record,
            hour,
            session_half,
            meetings_held,
            infected_cadets,
            infected_sectors
          };
        });
        setEspData(normalizedData);
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
        console.debug('[ESPData] processESPData received:', data); // DEBUG LOG
        if (!data) {
          if (isMounted) setEspData([]);
          return;
        }
        // Remove all proximity_mask/proximity_count logic
        // Always parse ESP timestamp as UTC, then convert to San Diego time
        const transformedData = Object.keys(data).map(key => {
          const record = { id: key, ...data[key] };
          // Parse timestamp as UTC, then convert to San Diego time
          let localDate = new Date(record.timestamp);
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
          const meetings_held = meetingEnds.filter(log => log.localTime <= record.localTime).length;
          // Infection status mapping
          const isCadet = playerNames.includes(record.device_id);
          const isInfected = record.infection_status === 1;
          const infected_cadets = isCadet && isInfected ? record.device_id : null;
          const infected_sectors = !isCadet && isInfected ? record.device_id : null;
          return {
            ...record,
            hour,
            session_half,
            meetings_held,
            infected_cadets,
            infected_sectors
          };
        });
        if (isMounted) setEspData(normalizedData);
      } catch (err) {
        setError('Error normalizing ESP data: ' + err.message);
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