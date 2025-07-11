// LinePlot.js - Comprehensive line plot for ESP data and meeting logs
import React from 'react';
import { ResponsiveLine } from "@nivo/line";
import { getLocalTimeOnlyString } from '../utils/timeUtils';
import { fetchMeetingLogTimestamps } from '../hooks/useESPData';
import { playerNames, sectorIds } from './plotConfigs';
import { getVariableValue, applyFilters, calculateStats, getUniqueValues, initializePersonFilter, initializeSectorFilter, transformData } from './plotUtils';

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

  // Special case: Time vs Meetings Held with dynamic binning
  const isTimeVsMeetings = xVar === 'Time' && yVar === 'Meetings Held';
  const isMeetingsVsTime = xVar === 'Meetings Held' && yVar === 'Time';

  React.useEffect(() => {
    if (isMeetingsVsTime && sessionId) {
      fetchMeetingLogTimestamps(sessionId).then(timestamps => {
        if (!timestamps.length) {
          setMeetingPoints([]);
          return;
        }
        const first = timestamps[0];
        const points = timestamps.map((t, i) => ({
          x: i + 1,
          y: (t - first) / 60000 // minutes elapsed since first meeting
        }));
        setMeetingPoints(points);
      });
    } else {
      setMeetingPoints(null);
    }
  }, [xVar, yVar, sessionId]);

  const getLineData = () => {
    if (!data || !data.length) {
      return [];
    }

    // 1. Meetings Held vs Time (step plot from meeting logs)
    if (isMeetingsVsTime && Array.isArray(meetingEndsSanDiego)) {
      const meetingEndTimes = meetingEndsSanDiego.sort((a, b) => a - b);
      const firstTime = data[0]?.localTime || (meetingEndTimes[0] || new Date());
      const lastTime = new Date();
      const totalMinutes = Math.ceil((lastTime - firstTime) / 60000);
      const numBins = Math.min(30, Math.max(3, Math.ceil(totalMinutes / 5)));
      const binSizeMs = (lastTime - firstTime) / numBins;
      
      const bins = [];
      for (let i = 0; i <= numBins; i++) {
        const binTime = new Date(firstTime.getTime() + i * binSizeMs);
        bins.push(binTime);
      }
      
      const binData = bins.map(binTime => ({
        x: getLocalTimeOnlyString(binTime),
        y: meetingEndTimes.filter(mt => mt <= binTime).length
      }));
      
      return [{ id: 'Meetings Held', data: binData }];
    }

    // 2. Time vs [other variables] (dynamic binning)
    if (xVar === 'Time' && [
      'Infected Cadets', 'Infected Sectors', 'Healthy Cadets', 'Healthy Sectors',
      'Button A Presses', 'Button B Presses', 'Interactions', 'Beacon Array',
      'Total Packets', 'Unique Devices', 'Infection Rate', 'Activity Level'
    ].includes(yVar)) {
      return transformData.timeBinning(data, xVar, yVar, 20);
    }

    // 3. Hour vs [variables] (hour-based binning)
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
        return { x: `${hour}:00`, y };
      });
      
      return [{ id: `${xVar} vs ${yVar}`, data: hourData }];
    }

    // 4. All other combinations: plot raw filtered data
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
  };

  const lineData = getLineData();

  // No data state
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
        yScale={{ 
          type: "linear", 
          min: isMeetingsVsTime ? 0 : Math.max(0, minY - (maxY - minY) * 0.1), 
          max: yMaxOverride !== null ? yMaxOverride : (isMeetingsVsTime ? 'auto' : maxY + (maxY - minY) * 0.1)
        }}
        axisBottom={{
          legend: xVar,
          legendOffset: 56,
          legendPosition: "middle",
          tickRotation: -45,
        }}
        axisLeft={{ 
          legend: isMeetingsVsTime ? 'Elapsed Minutes' : yVar, 
          legendOffset: -60, 
          legendPosition: "middle",
          tickValues: isMeetingsVsTime && lineData[0]?.data?.length > 0 ? (() => {
            const ys = lineData[0].data.map(pt => Math.round(pt.y));
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const numTicks = Math.min(8, maxY - minY + 1);
            if (numTicks <= 1) return [minY];
            const step = Math.max(1, Math.round((maxY - minY) / (numTicks - 1)));
            const ticks = [];
            for (let v = minY; v <= maxY; v += step) {
              ticks.push(v);
            }
            if (ticks[ticks.length - 1] !== maxY) ticks.push(maxY);
            return ticks;
          })() : undefined,
          tickFormat: isMeetingsVsTime ? v => Math.round(v) : undefined,
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
                  <strong>{point.serieId}</strong>: {point.data.y}
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
