// ScatterPlot.js - Refactored and cleaned up
import React from 'react';
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { playerNames, sectorIds } from './plotConfigs';

// ============================================================================
// DATA PREPROCESSING
// ============================================================================

/**
 * Clean and normalize ESP data
 */
function preprocessESPData(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];
  
  return rawData
    .filter(d => d.device_id !== 'QR' && d.device_id !== 'CR')
    .map(d => ({
      ...d,
      timestamp: typeof d.timestamp === 'string' ? Date.parse(d.timestamp) : d.timestamp
    }));
}

// ============================================================================
// DEVICE CLASSIFICATION
// ============================================================================

const isCadet = (deviceId) => playerNames.includes(deviceId);
const isSector = (deviceId) => sectorIds.includes(deviceId);

// ============================================================================
// VARIABLE ACCESSORS
// ============================================================================

/**
 * Get the value for a given variable from a data item
 */
function getVariableValue(variableName) {
  const accessors = {
    'Time': (item) => item.timestamp,
    'Hour': (item) => item.hour || new Date(item.timestamp).getHours(),
    'Infected Cadets': (item) => {
      if (item.infection_status === 1 && isCadet(item.device_id)) return 1;
      return 0;
    },
    'Healthy Cadets': (item) => {
      if ((item.infection_status === 0 || item.infection_status === 0.5) && isCadet(item.device_id)) return 1;
      return 0;
    },
    'Infected Sectors': (item) => {
      if (item.infection_status === 1 && isSector(item.device_id)) return 1;
      return 0;
    },
    'Healthy Sectors': (item) => {
      if ((item.infection_status === 0 || item.infection_status === 0.5) && isSector(item.device_id)) return 1;
      return 0;
    },
    'Button A Presses': (item) => item.buttonA || 0,
    'Button B Presses': (item) => item.buttonB || 0,
    'Interactions': (item) => item.interactions || 0,
    'Beacon Array': (item) => item.beaconArray || 0,
    'Total Packets': (item) => item.totalPackets || 0,
    'Unique Devices': (item) => item.uniqueDevices || 0,
    'Infection Rate': (item) => item.infectionRate || 0,
    'Activity Level': (item) => item.activityLevel || 0,
  };
  
  return accessors[variableName] || ((item) => item[variableName]);
}

// ============================================================================
// SCATTER PLOT DATA GENERATORS
// ============================================================================

/**
 * Generate simple X vs Y scatter: just plot raw data points
 */
function generateSimpleScatter(data, xVar, yVar) {
  const xAccessor = getVariableValue(xVar);
  const yAccessor = getVariableValue(yVar);
  
  const points = data.map(item => ({
    x: xAccessor(item),
    y: yAccessor(item)
  })).filter(pt => 
    pt.x !== undefined && pt.y !== undefined && 
    pt.x !== null && pt.y !== null &&
    !isNaN(pt.x) && !isNaN(pt.y)
  );
  
  console.log(`[ScatterPlot] Simple scatter generated ${points.length} points`);
  return points;
}

/**
 * Generate time-based scatter: Time vs [variable]
 * Each point is a single ESP record
 */
function generateTimeScatter(data, yVar) {
  const points = data.map(item => ({
    x: item.timestamp,
    y: getVariableValue(yVar)(item)
  })).filter(pt => 
    pt.x !== undefined && pt.y !== undefined && 
    pt.x !== null && pt.y !== null &&
    !isNaN(pt.x) && !isNaN(pt.y)
  );
  
  console.log(`[ScatterPlot] Time scatter generated ${points.length} points`);
  return points;
}

/**
 * Generate hour-based scatter: aggregate data by hour
 */
function generateHourScatter(data, yVar) {
  // Group by hour
  const hourGroups = {};
  for (let hour = 0; hour < 24; hour++) {
    hourGroups[hour] = [];
  }
  
  data.forEach(item => {
    const hour = item.hour || new Date(item.timestamp).getHours();
    if (hourGroups[hour]) {
      hourGroups[hour].push(item);
    }
  });
  
  // Aggregate for each hour
  const yAccessor = getVariableValue(yVar);
  const points = Object.entries(hourGroups)
    .map(([hour, items]) => {
      if (items.length === 0) return null;
      
      // Sum the y values for this hour
      const y = items.reduce((sum, item) => sum + (yAccessor(item) || 0), 0);
      return { x: parseInt(hour), y };
    })
    .filter(pt => pt !== null && pt.y > 0);
  
  console.log(`[ScatterPlot] Hour scatter generated ${points.length} points`);
  return points;
}

/**
 * Generate device-aggregated scatter: one point per device
 * Useful for plotting device totals/stats
 */
function generateDeviceScatter(data, xVar, yVar) {
  // Group records by device
  const deviceGroups = {};
  
  data.forEach(item => {
    const deviceId = item.device_id;
    if (!deviceGroups[deviceId]) {
      deviceGroups[deviceId] = {
        deviceId,
        records: [],
        buttonAPresses: 0,
        buttonBPresses: 0,
        interactions: 0,
        beaconArray: 0,
        latestStatus: item.infection_status,
        isCadet: isCadet(deviceId),
        isSector: isSector(deviceId)
      };
    }
    
    const device = deviceGroups[deviceId];
    device.records.push(item);
    device.buttonAPresses += item.buttonA || 0;
    device.buttonBPresses += item.buttonB || 0;
    device.interactions += item.interactions || 0;
    device.beaconArray += item.beaconArray || 0;
    
    // Keep latest infection status
    if (item.timestamp > (device.latestTimestamp || 0)) {
      device.latestStatus = item.infection_status;
      device.latestTimestamp = item.timestamp;
    }
  });
  
  // Convert to points
  const xAccessor = getVariableValue(xVar);
  const yAccessor = getVariableValue(yVar);
  
  const points = Object.values(deviceGroups)
    .map(device => ({
      x: xAccessor(device),
      y: yAccessor(device)
    }))
    .filter(pt => 
      pt.x !== undefined && pt.y !== undefined && 
      pt.x !== null && pt.y !== null &&
      !isNaN(pt.x) && !isNaN(pt.y)
    );
  
  console.log(`[ScatterPlot] Device scatter generated ${points.length} points from ${Object.keys(deviceGroups).length} devices`);
  return points;
}

// ============================================================================
// PLOT DATA GENERATION (Router)
// ============================================================================

/**
 * Route to the correct scatter generation function based on xVar and yVar
 */
function generateScatterData(xVar, yVar, espData) {
  console.log(`[ScatterPlot] Generating scatter for ${xVar} vs ${yVar}`, {
    dataLen: espData?.length
  });
  
  if (!espData || espData.length === 0) {
    console.warn('[ScatterPlot] No ESP data available');
    return [];
  }
  
  // Time-based scatter
  if (xVar === 'Time') {
    return generateTimeScatter(espData, yVar);
  }
  
  // Hour-based scatter (aggregated)
  if (xVar === 'Hour') {
    return generateHourScatter(espData, yVar);
  }
  
  // Device status variables might want per-device aggregation
  const deviceStatusVars = ['Infected Cadets', 'Healthy Cadets', 'Infected Sectors', 'Healthy Sectors'];
  if (deviceStatusVars.includes(xVar) || deviceStatusVars.includes(yVar)) {
    // If both are device status vars, or one is and the other is an aggregate metric, use device scatter
    return generateDeviceScatter(espData, xVar, yVar);
  }
  
  // Default: simple scatter (raw data points)
  return generateSimpleScatter(espData, xVar, yVar);
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

const ScatterPlot = (props) => {
  const { 
    data = [], 
    xVar = 'Time', 
    yVar = 'Infected Cadets',
    sessionId,
    personFilter,
    sectorFilter,
    meetingEndsSanDiego = []
  } = props;

  const [scatterPoints, setScatterPoints] = React.useState([]);

  React.useEffect(() => {
    console.log('[ScatterPlot] useEffect triggered:', {
      xVar,
      yVar,
      dataLen: data?.length
    });
    
    const espData = preprocessESPData(data);
    const points = generateScatterData(xVar, yVar, espData);
    
    console.log('[ScatterPlot] Generated points:', points?.length);
    setScatterPoints(points);
  }, [xVar, yVar, data]);

  // Format data for Nivo
  const scatterData = scatterPoints.length > 0 
    ? [{ id: `${xVar} vs ${yVar}`, data: scatterPoints }]
    : [];

  // Empty state
  if (scatterData.length === 0 || scatterData[0].data.length === 0) {
    return (
      <div style={{ 
        height: "100%", 
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

  // Calculate dynamic scales based on actual data
  const allXValues = scatterPoints.map(p => p.x).filter(x => typeof x === 'number');
  const allYValues = scatterPoints.map(p => p.y).filter(y => typeof y === 'number');
  
  const maxX = allXValues.length > 0 ? Math.max(...allXValues) : 100;
  const minX = allXValues.length > 0 ? Math.min(...allXValues) : 0;
  const maxY = allYValues.length > 0 ? Math.max(...allYValues) : 100;
  const minY = allYValues.length > 0 ? Math.min(...allYValues) : 0;
  
  const xPadding = (maxX - minX) * 0.1 || 1;
  const yPadding = (maxY - minY) * 0.1 || 1;

  // Format X-axis labels for time
  const formatXAxis = (value) => {
    if (xVar === 'Time') {
      return new Date(value).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }
    return value;
  };

  return (
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
        {`Scatter Plot of ${xVar} vs ${yVar}`}
      </div>
      <ResponsiveScatterPlot
        data={scatterData}
        margin={{ top: 60, right: 90, bottom: 130, left: 90 }}
        xScale={{ 
          type: 'linear', 
          min: Math.max(0, minX - xPadding), 
          max: maxX + xPadding 
        }}
        yScale={{ 
          type: 'linear', 
          min: Math.max(0, minY - yPadding), 
          max: maxY + yPadding 
        }}
        axisBottom={{
          legend: xVar,
          legendOffset: 56,
          legendPosition: "middle",
          tickRotation: -45,
          format: formatXAxis,
        }}
        axisLeft={{ 
          legend: yVar, 
          legendOffset: -60, 
          legendPosition: "middle",
        }}
        colors={{ scheme: "category10" }}
        pointSize={8}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
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
        tooltip={({ node }) => (
          <div style={{
            background: 'white',
            padding: '9px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ color: node.color }}>
              <strong>{xVar}</strong>: {
                xVar === 'Time' 
                  ? new Date(node.data.x).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                  : node.data.x
              }
            </div>
            <div style={{ color: node.color }}>
              <strong>{yVar}</strong>: {node.data.y}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default ScatterPlot;