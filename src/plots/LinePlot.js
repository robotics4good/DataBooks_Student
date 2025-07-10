// plots/line_plot.js - Game-controlled data access
// All time handling uses local device time only
import React from 'react';
import { ResponsiveLine } from "@nivo/line";
import { getLocalTimeOnlyString } from '../utils/timeUtils';
import { fetchMeetingLogTimestamps } from '../hooks/useESPData';
import { getDatabase, ref, get } from 'firebase/database';
import { playerNames } from './plotConfigs';
const sectorIds = ["T1","T2","T3","T4","T5","T6"];

const variableMap = {
  'Time': item => getLocalTimeOnlyString(new Date(item.timestamp)),
  'Meetings Held': item => item.meetings_held,
  'Infected Sectors': item => item.infected_sectors,
  'Infected Cadets': item => item.infected_cadets,
  'Healthy Sectors': item => item.healthy_sectors,
  'Healthy Cadets': item => item.healthy_cadets,
};

const LinePlot = (props) => {
  console.log('[LinePlot] props:', props);
  const { data = [], xVar = 'Time', yVar = 'Infected Cadets', sessionId } = props;
  const [meetingPoints, setMeetingPoints] = React.useState(null);
  // Special case: Time vs Meetings Held with dynamic binning
  const isTimeVsMeetings = xVar === 'Time' && yVar === 'Meetings Held';

  React.useEffect(() => {
    if (xVar === 'Meetings Held' && yVar === 'Time' && sessionId) {
      console.log('[LinePlot] Fetching MeetingLogs for sessionId:', sessionId);
      fetchMeetingLogTimestamps(sessionId).then(timestamps => {
        if (!timestamps.length) {
          setMeetingPoints([]);
          return;
        }
        const first = timestamps[0];
        const points = timestamps.map((t, i) => ({
          x: i + 1,
          y: (t - first) / 60000 // true minutes elapsed since first meeting, can be decimal
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
    if (isTimeVsMeetings) {
      // Get first ESP packet time and now (local time at plot render)
      const firstTime = new Date(data[0].timestamp);
      const now = new Date(); // Use current local time as upper bound
      const numBins = 10;
      const binSizeMs = (now - firstTime) / numBins;
      // Get all unique meeting counts and their times
      const meetingTimes = data
        .filter(item => {
          if (typeof item.meetings_held !== 'number' || !isFinite(item.meetings_held)) {
            return false;
          }
          return true;
        })
        .map(item => ({
          time: new Date(item.timestamp),
          count: Number.isFinite(item.meetings_held) ? item.meetings_held : 0
        }));
      // Generate bins from firstTime to now
      const bins = [];
      for (let i = 0; i <= numBins; i++) {
        const binTime = new Date(firstTime.getTime() + i * binSizeMs);
        bins.push(binTime);
      }
      // For each bin, find the max meetings_held up to that time
      let lastCount = 0;
      let binData = bins.map(binTime => {
        const upToBin = meetingTimes.filter(mt => mt.time <= binTime);
        const count = upToBin.length > 0 ? Math.max(...upToBin.map(mt => mt.count)) : lastCount;
        lastCount = count;
        return {
          x: getLocalTimeOnlyString(binTime),
          y: Number.isFinite(count) ? count : 0
        };
      });
      // Filter out any points with non-numeric or NaN y (but keep zeros)
      binData = binData.filter(pt => typeof pt.y === 'number' && !isNaN(pt.y));
      return [{ id: 'Meetings Held', data: binData }];
    }
    if (xVar === 'Meetings Held' && yVar === 'Time' && meetingPoints) {
      // Use meetingPoints as (x: meeting number, y: minutes since first meeting)
      return [{ id: 'Elapsed Minutes', data: meetingPoints }];
    }
    // NEW: Time binning for all X = 'Time' cases
    if (xVar === 'Time' && [
      'Infected Cadets', 'Infected Sectors', 'Healthy Cadets', 'Healthy Sectors'
    ].includes(yVar)) {
      // Bin by time
      const firstTime = new Date(data[0].timestamp);
      const lastTime = new Date(data[data.length - 1].timestamp);
      const maxMinutes = Math.min(90, Math.ceil((lastTime - firstTime) / 60000));
      const numBins = 10;
      const binSizeMs = (90 * 60000) / numBins; // 90 minutes max, 10 bins
      // Create bins
      const bins = [];
      for (let i = 0; i <= numBins; i++) {
        const binTime = new Date(firstTime.getTime() + i * binSizeMs);
        bins.push(binTime);
      }
      // For each bin, count the number of Y variable present at that time
      // For each device, find the latest record up to that bin
      // FILTER: Only include devices that are selected in the filter
      let filterSet = null;
      if (yVar === 'Infected Cadets' || yVar === 'Healthy Cadets') {
        filterSet = new Set((props.personFilter && Object.entries(props.personFilter).filter(([id, sel]) => sel).map(([id]) => id)) || []);
      } else if (yVar === 'Infected Sectors' || yVar === 'Healthy Sectors') {
        filterSet = new Set((props.sectorFilter && Object.entries(props.sectorFilter).filter(([id, sel]) => sel).map(([id]) => id)) || []);
      }
      const deviceIds = Array.from(new Set(data.map(d => d.device_id))).filter(id => !filterSet || filterSet.has(id));
      const series = [{ id: yVar, data: [] }];
      for (let i = 0; i < bins.length; i++) {
        const binEnd = bins[i];
        // For each device, get the latest record up to this bin
        let count = 0;
        deviceIds.forEach(id => {
          const records = data.filter(d => d.device_id === id && d.localTime <= binEnd);
          if (records.length > 0) {
            const latest = records[records.length - 1];
            if (yVar === 'Infected Cadets' && latest.infected_cadets) count++;
            if (yVar === 'Infected Sectors' && latest.infected_sectors) count++;
            if (yVar === 'Healthy Cadets' && latest.healthy_cadets) count++;
            if (yVar === 'Healthy Sectors' && latest.healthy_sectors) count++;
          }
        });
        series[0].data.push({ x: getLocalTimeOnlyString(binEnd), y: count });
      }
      return series;
    }
    // For all other allowed combinations, use the filtered data as provided
    // Group by label (id) if present, otherwise single series
    if (data.length > 0 && data[0].label && data[0].data) {
      return data.map(series => ({ id: series.label, data: series.data }));
    }
    // Fallback: single line for all data
    return [{ id: 'ESP Data', data }];
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
        {`Line plot of ${xVar} vs ${yVar}`}
      </div>
      <ResponsiveLine
        data={lineData}
        margin={{ top: 60, right: 90, bottom: 110, left: 90 }}
        xScale={{ type: 'point' }}
        yScale={{ 
          type: "linear", 
          min: xVar === 'Meetings Held' && yVar === 'Time' ? 0 : Math.max(0, minY - (maxY - minY) * 0.1), 
          max: yMaxOverride !== null ? yMaxOverride : (xVar === 'Meetings Held' && yVar === 'Time' ? 'auto' : maxY + (maxY - minY) * 0.1)
        }}
        axisBottom={{
          legend: xVar,
          legendOffset: 56,
          legendPosition: "middle",
          tickRotation: -45,
        }}
        axisLeft={{ 
          legend: xVar === 'Meetings Held' && yVar === 'Time' ? 'Elapsed Minutes' : yVar, 
          legendOffset: -60, 
          legendPosition: "middle",
          tickValues: xVar === 'Meetings Held' && yVar === 'Time' && lineData[0]?.data?.length > 0 ? (() => {
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
          tickFormat: xVar === 'Meetings Held' && yVar === 'Time' ? v => Math.round(v) : undefined,
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
                symbolShape: 'circle'
            }
        ]}
        tooltip={({ point }) => (
          <div style={{ background: 'white', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
            <strong>x: {point.data.x}, y: {xVar === 'Meetings Held' && yVar === 'Time' ? point.data.y.toFixed(2) : Math.round(point.data.y)}</strong>
          </div>
        )}
      />
    </div>
  );
};

export default LinePlot;
