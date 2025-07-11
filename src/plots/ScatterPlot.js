// ScatterPlot.js - Comprehensive scatter plot for ESP data and meeting logs
import React from 'react';
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { getLocalTimeOnlyString } from '../utils/timeUtils';
import { playerNames, sectorIds } from './plotConfigs';
import { getVariableValue, applyFilters, calculateStats, getUniqueValues, initializePersonFilter, initializeSectorFilter, transformData } from './plotUtils';

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

  const getScatterData = () => {
    if (!data || !data.length) {
      return [];
    }

    // 1. Time vs [variables] (time-based scatter)
    if (xVar === 'Time' && [
      'Infected Cadets', 'Infected Sectors', 'Healthy Cadets', 'Healthy Sectors',
      'Button A Presses', 'Button B Presses', 'Interactions', 'Beacon Array',
      'Total Packets', 'Unique Devices', 'Infection Rate', 'Activity Level'
    ].includes(yVar)) {
      const xAccessor = getVariableValue(xVar);
      const yAccessor = getVariableValue(yVar);
      
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
    }

    // 2. Hour vs [variables] (hour-based scatter)
    if (xVar === 'Hour') {
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
      
      const yAccessor = getVariableValue(yVar);
      const hourData = Object.entries(hourGroups).map(([hour, items]) => {
        const y = items.reduce((sum, item) => sum + (yAccessor(item) || 0), 0);
        return { x: parseInt(hour), y };
      }).filter(pt => pt.y > 0);
      
      return [{ id: `${xVar} vs ${yVar}`, data: hourData }];
    }

    // 3. Device-based scatter (device ID vs variable)
    if (['Infected Cadets', 'Infected Sectors', 'Healthy Cadets', 'Healthy Sectors'].includes(xVar)) {
      const deviceGroups = {};
      data.forEach(item => {
        const deviceId = item.device_id;
        if (!deviceGroups[deviceId]) {
          deviceGroups[deviceId] = {
            deviceId,
            buttonAPresses: 0,
            buttonBPresses: 0,
            interactions: 0,
            beaconArray: 0,
            infectionStatus: item.infection_status,
            isCadet: playerNames.includes(deviceId),
            isSector: sectorIds.includes(deviceId)
          };
        }
        
        deviceGroups[deviceId].buttonAPresses += item.buttonA || 0;
        deviceGroups[deviceId].buttonBPresses += item.buttonB || 0;
        deviceGroups[deviceId].interactions += item.beaconArray || 0;
        deviceGroups[deviceId].beaconArray += item.beaconArray || 0;
      });
      
      const xAccessor = getVariableValue(xVar);
      const yAccessor = getVariableValue(yVar);
      
      const deviceData = Object.values(deviceGroups).map(device => {
        const x = xAccessor(device);
        const y = yAccessor(device);
        return { x, y };
      }).filter(point => 
        point.x !== undefined && point.y !== undefined && 
        point.x !== null && point.y !== null &&
        (typeof point.x !== 'number' || !isNaN(point.x)) &&
        (typeof point.y !== 'number' || !isNaN(point.y))
      );
      
      return [{ id: `${xVar} vs ${yVar}`, data: deviceData }];
    }

    // 4. All other combinations: plot raw filtered data
    const xAccessor = getVariableValue(xVar) || (item => item[xVar]);
    const yAccessor = getVariableValue(yVar) || (item => item[yVar]);
    
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

  const scatterData = getScatterData();

  // No data state
  if (!scatterData.length || !scatterData[0]?.data?.length) {
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

  // Calculate dynamic scales based on actual data
  const allXValues = scatterData.flatMap(series => series.data.map(point => point.x)).filter(x => typeof x === 'number');
  const allYValues = scatterData.flatMap(series => series.data.map(point => point.y)).filter(y => typeof y === 'number');
  
  const maxX = allXValues.length > 0 ? Math.max(...allXValues) : 100;
  const minX = allXValues.length > 0 ? Math.min(...allXValues) : 0;
  const maxY = allYValues.length > 0 ? Math.max(...allYValues) : 100;
  const minY = allYValues.length > 0 ? Math.min(...allYValues) : 0;
  
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
          min: Math.max(0, minX - (maxX - minX) * 0.1), 
          max: maxX + (maxX - minX) * 0.1 
        }}
        yScale={{ 
          type: 'linear', 
          min: Math.max(0, minY - (maxY - minY) * 0.1), 
          max: maxY + (maxY - minY) * 0.1 
        }}
        axisBottom={{
          legend: xVar,
          legendOffset: 56,
          legendPosition: "middle",
          tickRotation: -45,
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
        tooltip={({ node }) => (
          <div
            style={{
              background: 'white',
              padding: '9px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ color: node.color }}>
              <strong>{xVar}</strong>: {node.data.x}
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