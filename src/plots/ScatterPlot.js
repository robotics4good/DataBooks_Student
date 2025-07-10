import React from 'react';
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { getLocalTimeOnlyString } from '../utils/timeUtils';

const variableMap = {
  'Time': item => getLocalTimeOnlyString(new Date(item.timestamp)),
  'Meetings Held': item => item.meetings_held,
  'Infected Sectors': item => item.infected_sectors,
  'Infected Cadets': item => item.infected_cadets,
  'Healthy Sectors': item => item.healthy_sectors,
  'Healthy Cadets': item => item.healthy_cadets,
};

const ScatterPlot = ({ data = [], xVar = 'Time', yVar = 'Infected Cadets' }) => {
  const getScatterData = () => {
    if (!data || !data.length) return [];
    const xAccessor = variableMap[xVar] || (item => item[xVar]);
    const yAccessor = variableMap[yVar] || (item => item[yVar]);
    return data.map(item => ({
      x: xAccessor(item),
      y: yAccessor(item)
    }));
  };

  const scatterData = getScatterData();

  // No data state
  if (!scatterData.length || !scatterData[0]?.data?.length) {
    return (
      <div style={{ 
        height: "100%", 
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
        color: "#666"
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
    <div style={{ height: "100%", width: "100%" }}>
      <ResponsiveScatterPlot
        data={scatterData}
        margin={{ top: 60, right: 90, bottom: 90, left: 90 }}
        xScale={{ 
          type: "linear", 
          min: Math.max(0, minX - (maxX - minX) * 0.1), 
          max: maxX + (maxX - minX) * 0.1 
        }}
        yScale={{ 
          type: "linear", 
          min: Math.max(0, minY - (maxY - minY) * 0.1), 
          max: maxY + (maxY - minY) * 0.1 
        }}
        axisBottom={{
          legend: "Interaction Value",
          legendOffset: 56,
          legendPosition: "middle",
        }}
        axisLeft={{ 
          legend: "Engagement Value", 
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

export default ScatterPlot; 