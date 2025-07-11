// LinePlot.js - Comprehensive line plot for ESP data and meeting logs
import React from 'react';
import { ResponsiveLine } from "@nivo/line";
import { getLocalTimeOnlyString } from '../utils/timeUtils';
import { fetchMeetingLogTimestamps } from '../hooks/useESPData';
import { playerNames, sectorIds } from './plotConfigs';
import { getVariableValue, getVariableAccessor, applyFilters, calculateStats, getUniqueValues, initializePersonFilter, initializeSectorFilter, transformData } from './plotUtils';

// =============================
// PRODUCTION-LOCKED: DO NOT MODIFY
// The Time vs Meetings Held line plot logic below is stable and correct as of 2024-07-11.
// Any changes must be explicitly reviewed and approved.
// =============================
const LinePlot = (props) => {
  const { 
    data = [], 
    xVar = 'Time', 
    yVar = 'Infected Cadets', 
    sessionId,
    personFilter,
    sectorFilter,
    meetingEndsSanDiego = []
  } = props;

  const [meetingPoints, setMeetingPoints] = React.useState(null);

  // Remove all special-casing for Meetings Held and Time
  // Always use the selected xVar and yVar for axes

  React.useEffect(() => {
    // Top-level debug log for pipeline audit
    console.log('[LinePlot] useEffect entry:', {
      xVar,
      yVar,
      sessionId,
      meetingEndsSanDiego,
      data
    });
    // =============================
    // PRODUCTION-LOCKED: Time vs Meetings Held binning logic
    // =============================
    // Defensive: flatten data if it's a wrapper
    let espData = data;
    if (Array.isArray(data) && data.length === 1 && Array.isArray(data[0].data)) {
      espData = data[0].data;
      console.warn('[LinePlot] Flattened ESP data from wrapper:', espData);
    }
    // Filter out ESP data with device_id 'QR' or 'CR'
    espData = espData.filter(d => d.device_id !== 'QR' && d.device_id !== 'CR');
    // Convert all ESP timestamps to numbers (ms since epoch)
    espData = espData.map(d => ({
      ...d,
      timestamp: typeof d.timestamp === 'string' ? Date.parse(d.timestamp) : d.timestamp
    }));

    let lineData = [];
    const maxBins = 30; // Default max bins for new plots

    if (xVar === 'Time') {
      if (yVar === 'Infected Cadets') {
        console.log('[LinePlot] getTimeVsInfectedCadets called', { data: espData, maxBins });
        lineData = getTimeVsInfectedCadets(espData, maxBins);
        console.log('[LinePlot] getTimeVsInfectedCadets result', lineData);
      } else if (yVar === 'Healthy Cadets') {
        console.log('[LinePlot] getTimeVsHealthyCadets called', { data: espData, maxBins });
        lineData = getTimeVsHealthyCadets(espData, maxBins);
        console.log('[LinePlot] getTimeVsHealthyCadets result', lineData);
      } else if (yVar === 'Infected Sectors') {
        console.log('[LinePlot] getTimeVsInfectedSectors called', { data: espData, maxBins });
        lineData = getTimeVsInfectedSectors(espData, maxBins);
        console.log('[LinePlot] getTimeVsInfectedSectors result', lineData);
      } else if (yVar === 'Healthy Sectors') {
        console.log('[LinePlot] getTimeVsHealthySectors called', { data: espData, maxBins });
        lineData = getTimeVsHealthySectors(espData, maxBins);
        console.log('[LinePlot] getTimeVsHealthySectors result', lineData);
      } else if (yVar === 'Meetings Held' && sessionId && Array.isArray(meetingEndsSanDiego) && meetingEndsSanDiego.length > 0 && Array.isArray(espData) && espData.length > 0) {
        // Find the first ESP data timestamp (San Diego time)
        const firstESPTimestamp = Math.min(...espData.map(d => d.timestamp));
        // Filter meeting ends to only those at or after the first ESP timestamp
        const filteredMeetings = meetingEndsSanDiego.filter(mt => mt >= firstESPTimestamp);
        if (filteredMeetings.length === 0) {
          setMeetingPoints([]);
          return;
        }
        const maxBins = 30;
        const minTime = firstESPTimestamp;
        const maxTime = Date.now(); // Use current time as upper bound
        const totalDuration = maxTime - minTime;
        const binSize = Math.max(60 * 1000, Math.ceil(totalDuration / maxBins));
        const binEdges = [];
        for (let t = minTime; t <= maxTime; t += binSize) {
          binEdges.push(t);
        }
        const points = binEdges.map(edge => ({
          timestamp: edge,
          elapsed_minutes: (edge - minTime) / 60000,
          meetings_held: filteredMeetings.filter(mt => mt <= edge).length
        }));
        setMeetingPoints(points);
        return;
      } else {
        console.error(`[LinePlot] Unknown yVar for xVar=Time: ${yVar}`);
        setMeetingPoints([]);
        return;
      }
      console.log('[LinePlot] Setting meetingPoints for new plot', lineData);
      setMeetingPoints(lineData);
      return;
    }
    // =============================
    // PRODUCTION-LOCKED: Meetings Held vs Time logic
    // =============================
    if (xVar === 'Meetings Held' && yVar === 'Time' && sessionId && Array.isArray(meetingEndsSanDiego) && meetingEndsSanDiego.length > 0) {
      // For each meeting, plot x = meeting number, y = elapsed minutes since first meeting
      const firstTime = meetingEndsSanDiego[0] instanceof Date ? meetingEndsSanDiego[0].getTime() : new Date(meetingEndsSanDiego[0]).getTime();
      const points = meetingEndsSanDiego.map((mt, i) => {
        const date = mt instanceof Date ? mt : new Date(mt);
        const elapsed = Math.round((date.getTime() - firstTime) / 60000);
        return {
          x: i + 1,
          y: elapsed,
          actualTime: isNaN(date) ? '' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        };
      });
      setMeetingPoints(points);
      return;
    }
    // =============================
    // PRODUCTION-LOCKED: Time vs Infected Cadets (STABLE, DO NOT MODIFY)
    // The logic for binning and plotting Time vs Infected Cadets is stable and correct as of 2024-07-11.
    // Any changes must be explicitly reviewed and approved.
    // =============================
    if (xVar === 'Time' && yVar === 'Infected Cadets' && Array.isArray(espData) && espData.length > 0) {
      const timestamps = espData.map(d => d.timestamp);
      const firstESPTimestamp = Math.min(...timestamps);
      const minTime = firstESPTimestamp;
      const maxTime = Date.now(); // Use current time as upper bound (match Meetings Held)
      const maxBins = 30;
      const totalDuration = maxTime - minTime;
      const binSize = totalDuration > 0 ? Math.max(60 * 1000, Math.ceil(totalDuration / maxBins)) : 1;
      const binEdges = [];
      for (let i = 0; i <= maxBins; i++) {
        binEdges.push(minTime + i * binSize);
      }
      // Format x as HH:MM, ensure uniqueness
      const seenLabels = new Set();
      const points = binEdges.map((edge, i) => {
        const latestByCadet = {};
        espData.forEach(d => {
          if (playerNames.includes(d.device_id) && d.timestamp <= edge) {
            if (!latestByCadet[d.device_id] || d.timestamp > latestByCadet[d.device_id].timestamp) {
              latestByCadet[d.device_id] = d;
            }
          }
        });
        const infectedCount = Object.values(latestByCadet).filter(d => d.infection_status === 1).length;
        let label = new Date(edge).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        // Ensure uniqueness
        let uniqueLabel = label;
        let suffix = 1;
        while (seenLabels.has(uniqueLabel)) {
          uniqueLabel = `${label}_${suffix++}`;
        }
        seenLabels.add(uniqueLabel);
        return {
          x: edge,
          y: infectedCount
        };
      });
      setMeetingPoints(points);
      return;
    }
    // =============================
    // PRODUCTION-LOCKED: Time vs Healthy Cadets (STABLE, DO NOT MODIFY)
    // The logic for binning and plotting Time vs Healthy Cadets is stable and correct as of 2024-07-11.
    // Any changes must be explicitly reviewed and approved.
    // =============================
    if (xVar === 'Time' && yVar === 'Healthy Cadets' && Array.isArray(espData) && espData.length > 0) {
      const timestamps = espData.map(d => d.timestamp);
      const firstESPTimestamp = Math.min(...timestamps);
      const minTime = firstESPTimestamp;
      const maxTime = Date.now(); // Use current time as upper bound (match Meetings Held)
      const maxBins = 30;
      const totalDuration = maxTime - minTime;
      const binSize = totalDuration > 0 ? Math.max(60 * 1000, Math.ceil(totalDuration / maxBins)) : 1;
      const binEdges = [];
      for (let i = 0; i <= maxBins; i++) {
        binEdges.push(minTime + i * binSize);
      }
      // Format x as HH:MM, ensure uniqueness
      const seenLabels = new Set();
      const points = binEdges.map((edge, i) => {
        const latestByCadet = {};
        espData.forEach(d => {
          if (playerNames.includes(d.device_id) && d.timestamp <= edge) {
            if (!latestByCadet[d.device_id] || d.timestamp > latestByCadet[d.device_id].timestamp) {
              latestByCadet[d.device_id] = d;
            }
          }
        });
        const healthyCount = Object.values(latestByCadet).filter(d => d.infection_status === 0).length;
        let label = new Date(edge).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        // Ensure uniqueness
        let uniqueLabel = label;
        let suffix = 1;
        while (seenLabels.has(uniqueLabel)) {
          uniqueLabel = `${label}_${suffix++}`;
        }
        seenLabels.add(uniqueLabel);
        return {
          x: edge,
          y: healthyCount
        };
      });
      setMeetingPoints(points);
      return;
    }
    // =============================
    // PRODUCTION-LOCKED: Time vs Infected Sectors (STABLE, DO NOT MODIFY)
    // The logic for binning and plotting Time vs Infected Sectors is stable and correct as of 2024-07-11.
    // Any changes must be explicitly reviewed and approved.
    // =============================
    if (xVar === 'Time' && yVar === 'Infected Sectors' && Array.isArray(espData) && espData.length > 0) {
      const timestamps = espData.map(d => d.timestamp);
      const firstESPTimestamp = Math.min(...timestamps);
      const minTime = firstESPTimestamp;
      const maxTime = Date.now(); // Use current time as upper bound (match Meetings Held)
      const maxBins = 30;
      const totalDuration = maxTime - minTime;
      const binSize = totalDuration > 0 ? Math.max(60 * 1000, Math.ceil(totalDuration / maxBins)) : 1;
      const binEdges = [];
      for (let i = 0; i <= maxBins; i++) {
        binEdges.push(minTime + i * binSize);
      }
      // Format x as HH:MM, ensure uniqueness
      const seenLabels = new Set();
      const points = binEdges.map((edge, i) => {
        const latestBySector = {};
        espData.forEach(d => {
          if (sectorIds.includes(d.device_id) && d.timestamp <= edge) {
            if (!latestBySector[d.device_id] || d.timestamp > latestBySector[d.device_id].timestamp) {
              latestBySector[d.device_id] = d;
            }
          }
        });
        const infectedCount = Object.values(latestBySector).filter(d => d.infection_status === 1).length;
        let label = new Date(edge).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        // Ensure uniqueness
        let uniqueLabel = label;
        let suffix = 1;
        while (seenLabels.has(uniqueLabel)) {
          uniqueLabel = `${label}_${suffix++}`;
        }
        seenLabels.add(uniqueLabel);
        return {
          x: edge,
          y: infectedCount
        };
      });
      setMeetingPoints(points);
      return;
    }
    // =============================
    // PRODUCTION-LOCKED: Time vs Healthy Sectors (STABLE, DO NOT MODIFY)
    // The logic for binning and plotting Time vs Healthy Sectors is stable and correct as of 2024-07-11.
    // Any changes must be explicitly reviewed and approved.
    // =============================
    if (xVar === 'Time' && yVar === 'Healthy Sectors' && Array.isArray(espData) && espData.length > 0) {
      const timestamps = espData.map(d => d.timestamp);
      const firstESPTimestamp = Math.min(...timestamps);
      const minTime = firstESPTimestamp;
      const maxTime = Date.now(); // Use current time as upper bound (match Meetings Held)
      const maxBins = 30;
      const totalDuration = maxTime - minTime;
      const binSize = totalDuration > 0 ? Math.max(60 * 1000, Math.ceil(totalDuration / maxBins)) : 1;
      const binEdges = [];
      for (let i = 0; i <= maxBins; i++) {
        binEdges.push(minTime + i * binSize);
      }
      // Format x as HH:MM, ensure uniqueness
      const seenLabels = new Set();
      const points = binEdges.map((edge, i) => {
        const latestBySector = {};
        espData.forEach(d => {
          if (sectorIds.includes(d.device_id) && d.timestamp <= edge) {
            if (!latestBySector[d.device_id] || d.timestamp > latestBySector[d.device_id].timestamp) {
              latestBySector[d.device_id] = d;
            }
          }
        });
        const healthyCount = Object.values(latestBySector).filter(d => d.infection_status === 0 || d.infection_status === 0.5).length;
        let label = new Date(edge).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        // Ensure uniqueness
        let uniqueLabel = label;
        let suffix = 1;
        while (seenLabels.has(uniqueLabel)) {
          uniqueLabel = `${label}_${suffix++}`;
        }
        seenLabels.add(uniqueLabel);
        return {
          x: edge,
          y: healthyCount
        };
      });
      setMeetingPoints(points);
      return;
    }
    // =============================
    // END PRODUCTION-LOCKED SECTION
    // =============================
    // Default logic for other cases
    if ((xVar === 'Time' || yVar === 'Time' || xVar === 'Meetings Held' || yVar === 'Meetings Held') && sessionId) {
      fetchMeetingLogTimestamps(sessionId).then(timestamps => {
        if (!timestamps.length) {
          setMeetingPoints([]);
          return;
        }
        const first = timestamps[0];
        const points = timestamps.map((t, i) => ({
          timestamp: t,
          meetings_held: i + 1,
          elapsed_minutes: (t - first) / 60000
        }));
        setMeetingPoints(points);
      });
    } else {
      setMeetingPoints(null);
    }
  }, [xVar, yVar, sessionId, meetingEndsSanDiego, data]);

  const getLineData = () => {
    // For Meetings Held vs Time, use one point per meeting: x = meeting number, y = timestamp
    if (xVar === 'Meetings Held' && yVar === 'Time' && Array.isArray(meetingPoints) && meetingPoints.length > 0) {
      return [{ id: `${xVar} vs ${yVar}`, data: meetingPoints }];
    }

    // For Time vs Meetings Held, use binned points with timestamp as x and meetings_held as y
    if (xVar === 'Time' && yVar === 'Meetings Held' && Array.isArray(meetingPoints) && meetingPoints.length > 0) {
      // Debug log for meetingPoints
      console.log('[LinePlot] getLineData meetingPoints:', meetingPoints);
      const points = meetingPoints.map(pt => ({
        x: pt.timestamp,
        y: pt.meetings_held
      }));
      // Defensive check: if all x or y are undefined/NaN, return error
      const allInvalid = points.every(pt => pt.x === undefined || pt.x === null || isNaN(pt.x) || pt.y === undefined || pt.y === null || isNaN(pt.y));
      if (allInvalid) {
        return 'error';
      }
      return [{ id: `${xVar} vs ${yVar}`, data: points }];
    }

    // For the four new time plots, use binned meetingPoints
    if (
      xVar === 'Time' &&
      [
        'Infected Cadets',
        'Healthy Cadets',
        'Infected Sectors',
        'Healthy Sectors'
      ].includes(yVar) &&
      Array.isArray(meetingPoints) && meetingPoints.length > 0
    ) {
      return [{ id: `${xVar} vs ${yVar}`, data: meetingPoints }];
    }

    if (!data || !data.length) {
      return [];
    }

    // If meeting log data is present and relevant, transform it to match selected axes
    if (Array.isArray(meetingEndsSanDiego) && meetingEndsSanDiego.length > 0 &&
        (xVar === 'Time' || yVar === 'Time' || xVar === 'Meetings Held' || yVar === 'Meetings Held')) {
      // Build synthetic data points from meetingEndsSanDiego
      // meetingEndsSanDiego is an array of timestamps (ms)
      const first = meetingEndsSanDiego[0];
      const points = meetingEndsSanDiego.map((t, i) => {
        const values = {
          'Time': t,
          'Meetings Held': i + 1
        };
        return {
          x: getVariableAccessor(xVar)(values),
          y: getVariableAccessor(yVar)(values)
        };
      });
      return [{ id: `${xVar} vs ${yVar}`, data: points }];
    }

    // Generic case: plot raw filtered data
    const xAccessor = getVariableAccessor(xVar);
    const yAccessor = getVariableAccessor(yVar);
    const points = data.map(item => {
      const x = xAccessor(item);
      const y = yAccessor(item);
      return { x, y };
    }).filter(pt => (
      pt.x !== undefined && pt.y !== undefined && pt.x !== null && pt.y !== null &&
      (typeof pt.x !== 'number' || !isNaN(pt.x)) &&
      (typeof pt.y !== 'number' || !isNaN(pt.y))
    ));
    return [{ id: `${xVar} vs ${yVar}`, data: points }];
  };

  const lineData = getLineData();

  // No data or error state
  if (lineData === 'error') {
    return (
      <div style={{ 
        height: "100%", 
        width: "100%",
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.1rem",
        color: "#c00",
        background: "#f8f3ea",
        borderRadius: 8,
        border: "1.5px solid #e0e0e0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
      }}>
        Error: No valid data points for plotting. Check meeting and ESP data timestamps.
      </div>
    );
  }
  if (!lineData.length || !lineData[0]?.data?.length) {
    return (
      <div style={{ 
        height: "100%", 
        width: "100%",
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.1rem",
        color: "#666",
        background: "#f8f3ea",
        borderRadius: 8,
        border: "1.5px solid #e0e0e0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
      }}>
        No data to display currently
      </div>
    );
  }

  // Calculate dynamic y scale based on actual data
  const allValues = lineData.flatMap(series => series.data.map(point => point.y)).filter(y => typeof y === 'number');
  const maxY = allValues.length > 0 ? Math.max(...allValues) : 100;
  const minY = allValues.length > 0 ? Math.min(...allValues) : 0;
  
  // For time-binned plots, set yMax to number of unique IDs in filtered data
  let yMaxOverride = null;
  if (xVar === 'Time' && ['Infected Cadets', 'Healthy Cadets'].includes(yVar)) {
    yMaxOverride = Array.from(new Set(data.map(d => d.device_id).filter(id => playerNames.includes(id)))).length;
  } else if (xVar === 'Time' && ['Infected Sectors', 'Healthy Sectors'].includes(yVar)) {
    yMaxOverride = Array.from(new Set(data.map(d => d.device_id).filter(id => sectorIds.includes(id)))).length;
  }
  
  return (
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
        {`Line Plot of ${xVar} vs ${yVar}`}
      </div>
      <ResponsiveLine
        data={lineData}
        margin={{ top: 60, right: 90, bottom: 130, left: 90 }}
        xScale={{ type: 'point' }}
        yScale={
          (xVar === 'Meetings Held' && yVar === 'Time')
            ? {
                type: 'linear',
                min: 0,
                max: 'auto'
              }
            : {
                type: 'linear',
                min: xVar === 'Time' || yVar === 'Time' ? 0 : Math.max(0, minY - (maxY - minY) * 0.1),
                max: yMaxOverride !== null ? yMaxOverride : (xVar === 'Time' || yVar === 'Time' ? 'auto' : maxY + (maxY - minY) * 0.1)
              }
        }
        axisBottom={{
          legend: (xVar === 'Time' && yVar === 'Meetings Held') ? 'Time' : xVar,
          legendOffset: 56,
          legendPosition: "middle",
          tickRotation: -45,
          format: (xVar === 'Time') ? v => {
            const d = new Date(v);
            return d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          } : undefined,
        }}
        axisLeft={{ 
          legend: (xVar === 'Meetings Held' && yVar === 'Time') ? 'Elapsed Minutes' : (xVar === 'Time' && yVar === 'Meetings Held') ? 'Meetings Held' : (xVar === 'Time' || yVar === 'Time' ? 'Elapsed Minutes' : yVar),
          legendOffset: -60,
          legendPosition: "middle",
          tickFormat: undefined,
        }}
        colors={{ scheme: "category10" }}
        pointSize={8}
        pointBorderWidth={2}
        useMesh={true}
        animate={false}
        motionConfig={{
          mass: 1,
          tension: 120,
          friction: 26,
          clamp: false,
          precision: 0.01,
          velocity: 0,
        }}
        theme={{
          axis: {
            domain: {
              line: {
                stroke: '#000000',
              },
            },
            ticks: {
              line: {
                stroke: '#000000',
              },
              text: {
                fill: '#000000',
              },
            },
            legend: {
              text: {
                fill: '#000000',
              },
            },
          },
          grid: {
            line: {
              stroke: '#d3d3d3',
              strokeWidth: 1,
            },
          },
        }}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            translateX: 80,
            itemWidth: 100,
            itemHeight: 16,
            itemsSpacing: 3,
            symbolSize: 12,
            symbolShape: 'circle',
          },
        ]}
        enableSlices="x"
        sliceTooltip={({ slice }) => {
          return (
            <div
              style={{
                background: 'white',
                padding: '9px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {slice.points.map(point => (
                <div
                  key={point.id}
                  style={{
                    color: point.serieColor,
                    padding: '3px 0',
                  }}
                >
                  <strong>{point.serieId}</strong>: {(xVar === 'Meetings Held' && yVar === 'Time')
                    ? `${point.data.y} min (${point.data.actualTime})`
                    : point.data.y}
                </div>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
};

export default LinePlot;

// Implement the four new helper functions below (outside the component):
function getTimeVsInfectedCadets(data, maxBins) {
  console.log('[LinePlot] getTimeVsInfectedCadets START', { dataLen: data.length, maxBins });
  const result = getTimeVsStatusCount(data, maxBins, 'cadet', 'infected');
  console.log('[LinePlot] getTimeVsInfectedCadets END', result);
  return result;
}
function getTimeVsHealthyCadets(data, maxBins) {
  console.log('[LinePlot] getTimeVsHealthyCadets START', { dataLen: data.length, maxBins });
  const result = getTimeVsStatusCount(data, maxBins, 'cadet', 'healthy');
  console.log('[LinePlot] getTimeVsHealthyCadets END', result);
  return result;
}
function getTimeVsInfectedSectors(data, maxBins) {
  console.log('[LinePlot] getTimeVsInfectedSectors START', { dataLen: data.length, maxBins });
  const result = getTimeVsStatusCount(data, maxBins, 'sector', 'infected');
  console.log('[LinePlot] getTimeVsInfectedSectors END', result);
  return result;
}
function getTimeVsHealthySectors(data, maxBins) {
  console.log('[LinePlot] getTimeVsHealthySectors START', { dataLen: data.length, maxBins });
  const result = getTimeVsStatusCount(data, maxBins, 'sector', 'healthy');
  console.log('[LinePlot] getTimeVsHealthySectors END', result);
  return result;
}
// Helper: type = 'cadet' or 'sector', status = 'infected' or 'healthy'
function getTimeVsStatusCount(data, maxBins, type, status) {
  console.log('[LinePlot] getTimeVsStatusCount START', { dataLen: data.length, maxBins, type, status });
  if (!data || data.length === 0) return [];
  // Filter for cadet/sector device_ids
  const isCadet = id => /^S\d+$/.test(id);
  const isSector = id => /^T\d+$/.test(id);
  const filterFn = type === 'cadet' ? isCadet : isSector;
  // Sort data by timestamp ascending
  const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  // Bin time
  const minTime = new Date(sorted[0].timestamp).getTime();
  const maxTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const binSize = Math.max(1, Math.ceil((maxTime - minTime) / maxBins));
  const bins = [];
  for (let i = 0; i < maxBins; i++) {
    bins.push({
      binStart: minTime + i * binSize,
      binEnd: minTime + (i + 1) * binSize,
      latestStatusById: {},
    });
  }
  // For each record, update latestStatusById for the correct bin
  for (const rec of sorted) {
    if (!filterFn(rec.device_id)) continue;
    const t = new Date(rec.timestamp).getTime();
    const binIdx = Math.min(Math.floor((t - minTime) / binSize), maxBins - 1);
    bins[binIdx].latestStatusById[rec.device_id] = rec.infection_status;
  }
  // For each bin, count ids with the desired status as of that bin
  let prevStatusById = {};
  const result = bins.map((bin, i) => {
    // Carry forward previous status
    const statusById = { ...prevStatusById, ...bin.latestStatusById };
    prevStatusById = statusById;
    let count = 0;
    for (const [id, inf] of Object.entries(statusById)) {
      if (status === 'infected' && inf === 1) count++;
      if (status === 'healthy' && (inf === 0 || inf === 0.5)) count++;
    }
    return {
      x: new Date(bin.binEnd),
      y: count,
    };
  });
  console.log('[LinePlot] getTimeVsStatusCount END', result);
  return result;
}
