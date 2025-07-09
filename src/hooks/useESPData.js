// useESPData.js - Custom hook for fetching and transforming ESP data from Firebase
import { useState, useEffect, useRef } from 'react';
import { db, ref, get, onValue } from '../firebase';
import { formatSanDiegoTime, timeService, getSanDiegoIsoString, getSanDiegoTimeOnlyString } from '../utils/timeUtils';
import { toZonedTime } from 'date-fns-tz';
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
      // Convert to array and San Diego time
      return Object.values(logs).map(log => ({
        ...log,
        sanDiegoTime: toZonedTime(new Date(log.timestamp), 'America/Los_Angeles')
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
      // 2. Fetch meeting logs (MEETINGEND only, with San Diego time)
      const meetingEnds = sessionId ? await fetchMeetingLogs(sessionId) : [];
      // 3. Fetch ESP data
      const espDataRef = ref(db, 'readings');
      const snapshot = await get(espDataRef);
      const data = snapshot.val();
      if (data) {
        // Transform ESP data
        const transformedData = Object.keys(data).map(key => {
          const record = { id: key, ...data[key] };
          let utcDate = new Date(record.timestamp);
          record.sanDiegoTime = toZonedTime(utcDate, 'America/Los_Angeles');
          return record;
        });
        // Get current San Diego time and noon
        const nowSD = toZonedTime(new Date(), 'America/Los_Angeles');
        const noonSD = new Date(nowSD);
        noonSD.setHours(12, 0, 0, 0);
        // Filter based on current time
        const filteredData = transformedData.filter(item => {
          if (!(item.sanDiegoTime instanceof Date) || isNaN(item.sanDiegoTime)) return false;
          if (nowSD < noonSD) {
            return item.sanDiegoTime < noonSD;
      } else {
            return item.sanDiegoTime >= noonSD;
          }
        });
        // Sort by San Diego time
        filteredData.sort((a, b) => (a.sanDiegoTime - b.sanDiegoTime));
        // Find the latest timestamp in the new data
        const latestTimestamp = filteredData.length > 0 ? filteredData[filteredData.length - 1].sanDiegoTime.getTime() : null;
        // Only update if there is new data (timestamp is newer than last seen)
        if (latestTimestamp && latestTimestamp !== latestTimestampRef.current) {
          latestTimestampRef.current = latestTimestamp;
          // Add derived fields to each record, including meetings_held
          const normalizedData = filteredData.map(record => {
            // Count bits set in proximity_mask
            let proximityCount = 0;
            if (typeof record.proximity_mask === 'number') {
              let mask = record.proximity_mask;
              while (mask) {
                proximityCount += mask & 1;
                mask >>= 1;
      }
            }
            const hour = record.sanDiegoTime.getHours();
            const session_half = hour < 12 ? 'AM' : 'PM';
            // Remove is_task_event and all task_start/task_end logic
            // Count meetings held (MEETINGEND events before or at this record's time)
            const meetings_held = meetingEnds.filter(log => log.sanDiegoTime <= record.sanDiegoTime).length;
            // Infection status mapping (corrected logic)
            const isCadet = playerNames.includes(record.device_id);
            const isInfected = record.infection_status === 1;
            const infected_cadets = isCadet && isInfected ? record.device_id : null;
            const infected_sectors = !isCadet && isInfected ? record.device_id : null;
            return {
              ...record,
              proximity_count: proximityCount,
              hour,
              session_half,
              meetings_held,
              infected_cadets,
              infected_sectors
            };
          });
          setEspData(normalizedData);
        }
        // If no new data, do not update espData
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
          return;
        }
        const transformedData = Object.keys(data).map(key => {
          const record = { id: key, ...data[key] };
          // Timestamp validation
          if (!record.timestamp) return null;
          const utcDate = new Date(record.timestamp);
          if (isNaN(utcDate.getTime())) return null;
          record.sanDiegoTime = toZonedTime(utcDate, 'America/Los_Angeles');
          return record;
        }).filter(Boolean);
        // Get current San Diego time and noon
        const nowSD = toZonedTime(new Date(), 'America/Los_Angeles');
        const noonSD = new Date(nowSD);
        noonSD.setHours(12, 0, 0, 0);
        // Filter based on current time
        const filteredData = transformedData.filter(item => {
          if (!(item.sanDiegoTime instanceof Date) || isNaN(item.sanDiegoTime)) return false;
          if (nowSD < noonSD) {
            return item.sanDiegoTime < noonSD;
          } else {
            return item.sanDiegoTime >= noonSD;
          }
        });
        // Sort by San Diego time
        filteredData.sort((a, b) => (a.sanDiegoTime - b.sanDiegoTime));
        // Find the latest timestamp in the new data
        const latestTimestamp = filteredData.length > 0 ? filteredData[filteredData.length - 1].sanDiegoTime.getTime() : null;
        // Only update if there is new data (timestamp is newer than last seen)
        if (latestTimestamp && latestTimestamp !== latestTimestampRef.current) {
          latestTimestampRef.current = latestTimestamp;
          // New ID definitions
          const cadetIds = ["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12"];
          const sectorIds = ["T1","T2","T3","T4","T5","T6"];
          const ignoreIds = ["CR", "QR"];
          // Only use IDs present in this session's data
          const presentCadetIds = Array.from(new Set(filteredData.map(r => r.device_id).filter(id => cadetIds.includes(id))));
          const presentSectorIds = Array.from(new Set(filteredData.map(r => r.device_id).filter(id => sectorIds.includes(id))));
          const normalizedData = filteredData
            .filter(record => !ignoreIds.includes(record.device_id))
            .map(record => {
              // Count bits set in proximity_mask
              let proximityCount = 0;
              let prox = Number(record.proximity_mask);
              if (!isNaN(prox) && prox >= 0) {
                let mask = prox;
                while (mask) {
                  proximityCount += mask & 1;
                  mask >>= 1;
                }
              }
              const hour = record.sanDiegoTime.getHours();
              const session_half = hour < 12 ? 'AM' : 'PM';
              // Count meetings held (MEETINGEND events before or at this record's time)
              const meetings_held = meetingEnds.filter(log => {
                return log.sanDiegoTime instanceof Date && !isNaN(log.sanDiegoTime) &&
                  record.sanDiegoTime instanceof Date && !isNaN(record.sanDiegoTime) &&
                  log.sanDiegoTime <= record.sanDiegoTime;
              }).length;
              // Infection status mapping (robust, session-aware)
              const isCadet = presentCadetIds.includes(record.device_id);
              const isSector = presentSectorIds.includes(record.device_id);
              const isInfected = Number(record.infection_status) === 1;
              const infected_cadets = isCadet && isInfected ? record.device_id : null;
              const infected_sectors = isSector && isInfected ? record.device_id : null;
              const healthy_cadets = isCadet && !isInfected ? record.device_id : null;
              const healthy_sectors = isSector && !isInfected ? record.device_id : null;
              return {
                ...record,
                proximity_count: proximityCount,
                hour,
                session_half,
                meetings_held,
                infected_cadets,
                infected_sectors,
                healthy_cadets,
                healthy_sectors
              };
            });
          if (isMounted) setEspData(normalizedData);
        }
        // If no new data, do not update espData
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
            x: xVariable === "timestamp" ? getSanDiegoTimeOnlyString(new Date(item.timestamp)) : item[xVariable],
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