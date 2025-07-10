// plots/line_plot.js - Game-controlled data access
// All time handling uses local device time only
import React from 'react';
import { ResponsiveLine } from "@nivo/line";
import { getLocalTimeOnlyString } from '../utils/timeUtils';

const variableMap = {
  'Time': item => getLocalTimeOnlyString(new Date(item.timestamp)),
  'Meetings Held': item => item.meetings_held,
  'Infected Sectors': item => item.infected_sectors,
  'Infected Cadets': item => item.infected_cadets,
  'Healthy Sectors': item => item.healthy_sectors,
  'Healthy Cadets': item => item.healthy_cadets,
};

const LinePlot = ({ data = [], xVar = 'Time', yVar = 'Infected Cadets' }) => {
  // Special case: Time vs Meetings Held with dynamic binning
  const isTimeVsMeetings = xVar === 'Time' && yVar === 'Meetings Held';
  const getLineData = () => {
    if (!data || !data.length) return [];
    if (isTimeVsMeetings) {
      // Get first ESP packet time and now (local time at plot render)
      const firstTime = new Date(data[0].timestamp);
      const now = new Date(); // Use current local time as upper bound
      const numBins = 10;
      const binSizeMs = (now - firstTime) / numBins;
      // Get all unique meeting counts and their times
      const meetingTimes = data
        .filter(item => typeof item.meetings_held === 'number')
        .map(item => ({
          time: new Date(item.timestamp),
          count: item.meetings_held
        }));
      // Generate bins from firstTime to now
      const bins = [];
      for (let i = 0; i <= numBins; i++) {
        const binTime = new Date(firstTime.getTime() + i * binSizeMs);
        bins.push(binTime);
      }
      // For each bin, find the max meetings_held up to that time
      let lastCount = 0;
      const binData = bins.map(binTime => {
        const upToBin = meetingTimes.filter(mt => mt.time <= binTime);
        const count = upToBin.length > 0 ? Math.max(...upToBin.map(mt => mt.count)) : lastCount;
        lastCount = count;
        return {
          x: getLocalTimeOnlyString(binTime),
          y: count
        };
      });
      return [{ id: 'Meetings Held', data: binData }];
    }
    // Default: use variableMap
    const xAccessor = variableMap[xVar] || (item => item[xVar]);
    const yAccessor = variableMap[yVar] || (item => item[yVar]);
    const transformedData = data.map(item => ({
      x: xAccessor(item),
      y: yAccessor(item)
    }));
    return [{
      id: 'ESP Data',
      data: transformedData
    }];
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
  
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ResponsiveLine
        data={lineData}
        margin={{ top: 60, right: 90, bottom: 90, left: 90 }}
        xScale={{ type: "point" }}
        yScale={{ 
          type: "linear", 
          min: Math.max(0, minY - (maxY - minY) * 0.1), 
          max: maxY + (maxY - minY) * 0.1 
        }}
        axisBottom={{
          legend: "Time",
          legendOffset: 56,
          legendPosition: "middle",
          tickRotation: -45,
        }}
        axisLeft={{ 
          legend: "Interaction Value", 
          legendOffset: -60, 
          legendPosition: "middle" 
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
      />
    </div>
  );
};

export default LinePlot;
