// BarPlot.js - Comprehensive bar plot for ESP data and meeting logs
import React from 'react';
import { ResponsiveBar } from "@nivo/bar";
import { getLocalTimeOnlyString } from '../utils/timeUtils';
import { playerNames, sectorIds } from './plotConfigs';
import { getVariableValue, applyFilters, calculateStats, getUniqueValues, initializePersonFilter, initializeSectorFilter, transformData } from './plotUtils';

const BarPlot = (props) => {
  const { 
    data = [], 
    xVar = 'Time', 
    yVar = 'Infected Cadets', 
    sessionId,
    personFilter,
    sectorFilter,
    meetingEndsSanDiego = []
  } = props;

  const getBarData = () => {
    if (!data || !data.length) {
      return [];
    }

    // 1. Device-based aggregation (device ID vs variable)
    if (['Infected Cadets', 'Infected Sectors', 'Healthy Cadets', 'Healthy Sectors'].includes(xVar)) {
      return transformData.deviceAggregation(data, xVar, yVar);
    }

    // 2. Hour-based aggregation
    if (xVar === 'Hour') {
      const hourBins = {};
      for (let hour = 0; hour < 24; hour++) {
        hourBins[hour] = [];
      }
      
      data.forEach(item => {
        const hour = item.hour || new Date(item.timestamp).getHours();
        if (hourBins[hour]) {
          hourBins[hour].push(item);
        }
      });
      
      const yAccessor = getVariableValue(yVar);
      const hourData = Object.entries(hourBins).map(([hour, items]) => {
        const y = items.reduce((sum, item) => sum + (yAccessor(item) || 0), 0);
        return { hour: `${hour}:00`, [yVar]: y };
      }).filter(item => item[yVar] > 0);
      
      return hourData;
    }

    // 3. Session Half aggregation (AM/PM)
    if (xVar === 'Session Half') {
      const sessionBins = { 'AM': [], 'PM': [] };
      
      data.forEach(item => {
        const sessionHalf = item.session_half || (new Date(item.timestamp).getHours() < 12 ? 'AM' : 'PM');
        sessionBins[sessionHalf].push(item);
      });
      
      const yAccessor = getVariableValue(yVar);
      const sessionData = Object.entries(sessionBins).map(([session, items]) => {
        const y = items.reduce((sum, item) => sum + (yAccessor(item) || 0), 0);
        return { session, [yVar]: y };
      }).filter(item => item[yVar] > 0);
      
      return sessionData;
    }

    // 4. Button presses and interactions aggregation
    if (['Button A Presses', 'Button B Presses', 'Interactions', 'Beacon Array'].includes(xVar)) {
      const deviceGroups = {};
      data.forEach(item => {
        const deviceId = item.device_id;
        if (!deviceGroups[deviceId]) {
          deviceGroups[deviceId] = {
            deviceId,
            buttonAPresses: 0,
            buttonBPresses: 0,
            interactions: 0,
            beaconArray: 0
          };
        }
        
        deviceGroups[deviceId].buttonAPresses += item.buttonA || 0;
        deviceGroups[deviceId].buttonBPresses += item.buttonB || 0;
        deviceGroups[deviceId].interactions += item.beaconArray || 0;
        deviceGroups[deviceId].beaconArray += item.beaconArray || 0;
      });
      
      const yAccessor = getVariableValue(yVar);
      const deviceData = Object.values(deviceGroups).map(device => {
        const x = device.deviceId;
        const y = yAccessor(device);
        return { device: x, [yVar]: y };
      }).filter(item => item[yVar] > 0);
      
      return deviceData;
    }

    // 5. Infection status aggregation
    if (['Infection Rate', 'Activity Level'].includes(xVar)) {
      const deviceGroups = {};
      data.forEach(item => {
        const deviceId = item.device_id;
        if (!deviceGroups[deviceId]) {
          deviceGroups[deviceId] = {
            deviceId,
            infectionStatus: item.infection_status,
            isCadet: playerNames.includes(deviceId),
            isSector: sectorIds.includes(deviceId),
            buttonAPresses: 0,
            buttonBPresses: 0,
            interactions: 0,
            beaconArray: 0
          };
        }
        
        deviceGroups[deviceId].buttonAPresses += item.buttonA || 0;
        deviceGroups[deviceId].buttonBPresses += item.buttonB || 0;
        deviceGroups[deviceId].interactions += item.beaconArray || 0;
        deviceGroups[deviceId].beaconArray += item.beaconArray || 0;
      });
      
      const yAccessor = getVariableValue(yVar);
      const deviceData = Object.values(deviceGroups).map(device => {
        const x = device.deviceId;
        const y = yAccessor(device);
        return { device: x, [yVar]: y };
      }).filter(item => item[yVar] > 0);
      
      return deviceData;
    }

    // 6. Time-based aggregation (binned by time periods)
    if (xVar === 'Time') {
      const timeBins = {};
      const binSize = Math.ceil(data.length / 10); // 10 bins
      
      data.forEach((item, index) => {
        const binIndex = Math.floor(index / binSize);
        const binLabel = `Bin ${binIndex + 1}`;
        if (!timeBins[binLabel]) {
          timeBins[binLabel] = [];
        }
        timeBins[binLabel].push(item);
      });
      
      const yAccessor = getVariableValue(yVar);
      const timeData = Object.entries(timeBins).map(([bin, items]) => {
        const y = items.reduce((sum, item) => sum + (yAccessor(item) || 0), 0);
        return { time: bin, [yVar]: y };
      }).filter(item => item[yVar] > 0);
      
      return timeData;
    }

    // 7. Default: aggregate by device ID
    const deviceGroups = {};
    data.forEach(item => {
      const deviceId = item.device_id;
      if (!deviceGroups[deviceId]) {
        deviceGroups[deviceId] = [];
      }
      deviceGroups[deviceId].push(item);
    });
    
    const yAccessor = getVariableValue(yVar);
    const aggregatedData = Object.entries(deviceGroups).map(([deviceId, items]) => {
      const y = items.reduce((sum, item) => sum + (yAccessor(item) || 0), 0);
      return { device: deviceId, [yVar]: y };
    }).filter(item => item[yVar] > 0);
    
    return aggregatedData;
  };

  const barData = getBarData();

  // No data state
  if (!barData.length) {
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

  // Get the key for the y-axis value
  const yKey = Object.keys(barData[0]).find(key => key !== 'device' && key !== 'hour' && key !== 'session' && key !== 'time');
  
  return (
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
        {`Bar Plot of ${xVar} vs ${yVar}`}
      </div>
      <ResponsiveBar
        data={barData}
        keys={[yKey]}
        indexBy={xVar === 'Hour' ? 'hour' : xVar === 'Session Half' ? 'session' : xVar === 'Time' ? 'time' : 'device'}
        margin={{ top: 60, right: 90, bottom: 130, left: 90 }}
        padding={0.3}
        groupMode="grouped"
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={{ scheme: "category10" }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: xVar,
          legendPosition: 'middle',
          legendOffset: 56,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: yVar,
          legendPosition: 'middle',
          legendOffset: -60,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
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
            dataFrom: 'keys',
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
        tooltip={({ id, value, color }) => (
          <div
            style={{
              background: 'white',
              padding: '9px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ color }}>
              <strong>{yVar}</strong>: {value}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default BarPlot;
