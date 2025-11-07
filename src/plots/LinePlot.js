// LinePlot.js - Refactored and cleaned up
import React from 'react';
import { ResponsiveLine } from "@nivo/line";

// ============================================================================
// DATA PREPROCESSING
// ============================================================================

/**
 * Clean and normalize ESP data
 * - Removes QR/CR devices
 * - Converts timestamps to milliseconds
 * - Flattens wrapped data if needed
 */
function preprocessESPData(rawData) {
  let data = rawData;
  
  // Unwrap if data is nested in a wrapper object
  if (Array.isArray(data) && data.length === 1 && Array.isArray(data[0].data)) {
    data = data[0].data;
  }
  
  return data
    .filter(d => d.device_id !== 'QR' && d.device_id !== 'CR')
    .map(d => ({
      ...d,
      timestamp: typeof d.timestamp === 'string' ? Date.parse(d.timestamp) : d.timestamp
    }));
}

/**
 * Normalize meeting timestamps to milliseconds
 */
function preprocessMeetingEnds(meetingEnds) {
  if (!Array.isArray(meetingEnds)) return [];
  return meetingEnds.map(mt => 
    mt instanceof Date ? mt.getTime() : new Date(mt).getTime()
  );
}

// ============================================================================
// DEVICE FILTERING
// ============================================================================

const isCadet = (deviceId) => /^S\d+$/.test(deviceId);
const isSector = (deviceId) => /^T\d+$/.test(deviceId);

const DEVICE_FILTERS = {
  cadet: isCadet,
  sector: isSector
};

// ============================================================================
// STATUS CHECKING
// ============================================================================

const isInfected = (status) => status === 1;
const isHealthy = (status) => status === 0 || status === 0.5;

const STATUS_CHECKS = {
  infected: isInfected,
  healthy: isHealthy
};

// ============================================================================
// CORE COMPUTATION: Get latest status for each device at a given time
// ============================================================================

/**
 * For each device, find the most recent status at or before the given timestamp
 * @param {Array} espData - Sorted ESP records
 * @param {number} timestamp - Time to snapshot at (ms)
 * @param {Function} deviceFilter - Filter function for device IDs
 * @returns {Object} Map of device_id -> infection_status
 */
function getLatestStatusByDevice(espData, timestamp, deviceFilter) {
  const latestById = {};
  
  for (const record of espData) {
    if (!deviceFilter(record.device_id)) continue;
    if (record.timestamp > timestamp) break; // Data is sorted, so we can stop early
    
    // Update if this is the first record for this device OR it's newer than what we have
    if (!latestById[record.device_id] || record.timestamp > latestById[record.device_id].timestamp) {
      latestById[record.device_id] = record;
    }
  }
  
  return latestById;
}

/**
 * Count devices with a specific status at a given time
 */
function countDevicesWithStatus(espData, timestamp, deviceType, statusType) {
  const deviceFilter = DEVICE_FILTERS[deviceType];
  const statusCheck = STATUS_CHECKS[statusType];
  
  const latestById = getLatestStatusByDevice(espData, timestamp, deviceFilter);
  
  return Object.values(latestById).filter(record => 
    statusCheck(record.infection_status)
  ).length;
}

// ============================================================================
// TIME BINNING
// ============================================================================

/**
 * Create time bins from min to max time
 */
function createTimeBins(minTime, maxTime, maxBins = 30) {
  const totalDuration = maxTime - minTime;
  const binSize = Math.max(60 * 1000, Math.ceil(totalDuration / maxBins)); // Min 1 minute bins
  
  const bins = [];
  for (let t = minTime; t <= maxTime; t += binSize) {
    bins.push(t);
  }
  
  return bins;
}

/**
 * Generate time series data: bin times and count status at each bin
 */
function generateTimeSeriesData(espData, deviceType, statusType, maxBins = 30) {
  if (!espData || espData.length === 0) return [];
  
  const sortedData = [...espData].sort((a, b) => a.timestamp - b.timestamp);
  
  const minTime = sortedData[0].timestamp;
  const maxTime = Date.now(); // Use current time as upper bound
  
  const bins = createTimeBins(minTime, maxTime, maxBins);
  
  return bins.map(binTime => ({
    x: binTime,
    y: countDevicesWithStatus(sortedData, binTime, deviceType, statusType)
  }));
}

// ============================================================================
// MEETING-BASED SNAPSHOTS
// ============================================================================

/**
 * Generate meeting series data: count status at each meeting end time
 */
function generateMeetingSeriesData(espData, meetingEnds, deviceType, statusType) {
  if (!espData || espData.length === 0 || !meetingEnds || meetingEnds.length === 0) {
    console.warn('[generateMeetingSeriesData] Missing data:', { 
      espDataLen: espData?.length, 
      meetingEndsLen: meetingEnds?.length 
    });
    return [];
  }
  
  const sortedData = [...espData].sort((a, b) => a.timestamp - b.timestamp);
  
  console.log('[generateMeetingSeriesData] Processing:', {
    deviceType,
    statusType,
    espDataLen: sortedData.length,
    meetingEndsLen: meetingEnds.length,
    firstESPTime: new Date(sortedData[0].timestamp),
    lastESPTime: new Date(sortedData[sortedData.length - 1].timestamp),
    firstMeetingTime: new Date(meetingEnds[0]),
    lastMeetingTime: new Date(meetingEnds[meetingEnds.length - 1])
  });
  
  const result = meetingEnds.map((meetingTime, index) => {
    const count = countDevicesWithStatus(sortedData, meetingTime, deviceType, statusType);
    console.log(`[Meeting ${index + 1}] Time: ${new Date(meetingTime).toLocaleTimeString()}, Count: ${count}`);
    return {
      x: index + 1, // Meeting number (1-indexed)
      y: count
    };
  });
  
  console.log('[generateMeetingSeriesData] Result:', result);
  return result;
}

// ============================================================================
// MEETINGS HELD OVER TIME
// ============================================================================

/**
 * Generate cumulative meetings held over time
 */
function generateMeetingsHeldOverTime(espData, meetingEnds, maxBins = 30) {
  if (!meetingEnds || meetingEnds.length === 0 || !espData || espData.length === 0) {
    return [];
  }
  
  const firstESPTime = Math.min(...espData.map(d => d.timestamp));
  const filteredMeetings = meetingEnds.filter(mt => mt >= firstESPTime);
  
  if (filteredMeetings.length === 0) return [];
  
  const bins = createTimeBins(firstESPTime, Date.now(), maxBins);
  
  return bins.map(binTime => ({
    x: binTime,
    y: filteredMeetings.filter(mt => mt <= binTime).length
  }));
}

/**
 * Generate elapsed time for each meeting
 */
function generateMeetingsVsElapsedTime(meetingEnds) {
  if (!meetingEnds || meetingEnds.length === 0) return [];
  
  const firstTime = meetingEnds[0];
  
  return meetingEnds.map((meetingTime, index) => ({
    x: index + 1, // Meeting number
    y: Math.round((meetingTime - firstTime) / 60000), // Elapsed minutes
    actualTime: new Date(meetingTime).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    })
  }));
}

// ============================================================================
// PLOT DATA GENERATION (Router)
// ============================================================================

/**
 * Route to the correct data generation function based on xVar and yVar
 */
function generatePlotData(xVar, yVar, espData, meetingEnds) {
  // Validate we have the data we need
  if (!espData || espData.length === 0) {
    console.warn('[LinePlot] No ESP data available');
    return [];
  }
  
  // Time on X-axis
  if (xVar === 'Time') {
    if (yVar === 'Meetings Held') {
      return generateMeetingsHeldOverTime(espData, meetingEnds);
    }
    if (yVar === 'Infected Cadets') {
      return generateTimeSeriesData(espData, 'cadet', 'infected');
    }
    if (yVar === 'Healthy Cadets') {
      return generateTimeSeriesData(espData, 'cadet', 'healthy');
    }
    if (yVar === 'Infected Sectors') {
      return generateTimeSeriesData(espData, 'sector', 'infected');
    }
    if (yVar === 'Healthy Sectors') {
      return generateTimeSeriesData(espData, 'sector', 'healthy');
    }
  }
  
  // Meetings Held on X-axis (requires meeting data)
  if (xVar === 'Meetings Held') {
    if (!meetingEnds || meetingEnds.length === 0) {
      console.warn('[LinePlot] No meeting data available for Meetings Held plots');
      return [];
    }
    
    if (yVar === 'Time') {
      return generateMeetingsVsElapsedTime(meetingEnds);
    }
    if (yVar === 'Infected Cadets') {
      return generateMeetingSeriesData(espData, meetingEnds, 'cadet', 'infected');
    }
    if (yVar === 'Healthy Cadets') {
      return generateMeetingSeriesData(espData, meetingEnds, 'cadet', 'healthy');
    }
    if (yVar === 'Infected Sectors') {
      return generateMeetingSeriesData(espData, meetingEnds, 'sector', 'infected');
    }
    if (yVar === 'Healthy Sectors') {
      return generateMeetingSeriesData(espData, meetingEnds, 'sector', 'healthy');
    }
  }
  
  console.warn(`[LinePlot] Unknown plot combination: ${xVar} vs ${yVar}`);
  return [];
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

const LinePlot = (props) => {
  const { 
    data = [], 
    xVar = 'Time', 
    yVar = 'Infected Cadets', 
    sessionId,
    meetingEndsSanDiego = []
  } = props;

  const [plotPoints, setPlotPoints] = React.useState([]);

  React.useEffect(() => {
    console.log('[LinePlot] useEffect triggered:', {
      xVar,
      yVar,
      dataLen: data?.length,
      meetingEndsLen: meetingEndsSanDiego?.length
    });
    
    const espData = preprocessESPData(data);
    const meetingEnds = preprocessMeetingEnds(meetingEndsSanDiego);
    
    console.log('[LinePlot] After preprocessing:', {
      espDataLen: espData?.length,
      meetingEndsLen: meetingEnds?.length
    });
    
    const points = generatePlotData(xVar, yVar, espData, meetingEnds);
    console.log('[LinePlot] Generated points:', points?.length);
    
    setPlotPoints(points);
  }, [xVar, yVar, data, meetingEndsSanDiego]);

  // Format data for Nivo
  const lineData = plotPoints.length > 0 
    ? [{ id: `${xVar} vs ${yVar}`, data: plotPoints }]
    : [];

  // Calculate Y-axis bounds
  const allYValues = plotPoints.map(p => p.y).filter(y => typeof y === 'number');
  const maxY = allYValues.length > 0 ? Math.max(...allYValues) : 100;
  const minY = allYValues.length > 0 ? Math.min(...allYValues) : 0;
  const yPadding = (maxY - minY) * 0.1;

  // Special Y-axis configuration for device count plots
  let yScaleMax = maxY + yPadding;
  if (xVar === 'Time') {
    const espData = preprocessESPData(data);
    if (yVar.includes('Cadet')) {
      const uniqueCadets = new Set(espData.filter(d => isCadet(d.device_id)).map(d => d.device_id));
      yScaleMax = uniqueCadets.size;
    } else if (yVar.includes('Sector')) {
      const uniqueSectors = new Set(espData.filter(d => isSector(d.device_id)).map(d => d.device_id));
      yScaleMax = uniqueSectors.size;
    }
  }

  // Empty state
  if (lineData.length === 0 || lineData[0].data.length === 0) {
    // Check if the issue is missing meeting data for a Meetings Held plot
    const needsMeetingData = xVar === 'Meetings Held' || yVar === 'Meetings Held';
    const hasMeetingData = meetingEndsSanDiego && meetingEndsSanDiego.length > 0;
    
    let message = 'No data to display currently';
    if (needsMeetingData && !hasMeetingData) {
      message = 'No meeting data available. Meeting logs are required for "Meetings Held" plots.';
    }
    
    return (
      <div style={{ 
        height: "100%", 
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "8px",
        fontSize: "1.1rem",
        color: "#666",
        background: "#f8f3ea",
        borderRadius: 8,
        border: "1.5px solid #e0e0e0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        padding: "20px",
        textAlign: "center"
      }}>
        <div>{message}</div>
        {needsMeetingData && !hasMeetingData && (
          <div style={{ fontSize: "0.9rem", color: "#999" }}>
            Ensure the session has meeting logs and they are being loaded correctly.
          </div>
        )}
      </div>
    );
  }

  // Format X-axis labels
  const formatXAxis = (value) => {
    if (xVar === 'Time') {
      return new Date(value).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }
    return String(value);
  };

  // Y-axis label
  const yAxisLabel = (xVar === 'Meetings Held' && yVar === 'Time') 
    ? 'Elapsed Minutes' 
    : yVar;

  return (
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
        {`Line Plot of ${xVar} vs ${yVar}`}
      </div>
      <ResponsiveLine
        data={lineData}
        margin={{ top: 60, right: 90, bottom: 130, left: 90 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 0,
          max: yScaleMax
        }}
        axisBottom={{
          legend: xVar,
          legendOffset: 56,
          legendPosition: "middle",
          tickRotation: -45,
          format: formatXAxis,
        }}
        axisLeft={{ 
          legend: yAxisLabel,
          legendOffset: -60,
          legendPosition: "middle",
        }}
        colors={{ scheme: "category10" }}
        pointSize={8}
        pointBorderWidth={2}
        useMesh={true}
        animate={false}
        theme={{
          axis: {
            domain: { line: { stroke: '#000000' } },
            ticks: { line: { stroke: '#000000' }, text: { fill: '#000000' } },
            legend: { text: { fill: '#000000' } },
          },
          grid: { line: { stroke: '#d3d3d3', strokeWidth: 1 } },
        }}
        legends={[{
          anchor: 'bottom-right',
          direction: 'column',
          translateX: 80,
          itemWidth: 100,
          itemHeight: 16,
          itemsSpacing: 3,
          symbolSize: 12,
          symbolShape: 'circle',
        }]}
        enableSlices="x"
        sliceTooltip={({ slice }) => (
          <div style={{
            background: 'white',
            padding: '9px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            {slice.points.map(point => (
              <div key={point.id} style={{ color: point.serieColor, padding: '3px 0' }}>
                <strong>{point.serieId}</strong>: {
                  (xVar === 'Meetings Held' && yVar === 'Time')
                    ? `${point.data.y} min (${point.data.actualTime})`
                    : point.data.y
                }
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
};

export default LinePlot;