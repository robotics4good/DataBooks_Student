// plots/line_plot.js - Game-controlled data access
import React from 'react';
import { ResponsiveLine } from "@nivo/line";
import { formatSanDiegoTimeOnly } from '../utils/timeUtils';

const LinePlot = ({ data = [] }) => {
  // Transform data for line plot if provided
  const getLineData = () => {
    if (!data || !data.length) return [];
    
    // Transform ESP data into line plot format
    const transformedData = data.map(item => ({
      x: formatSanDiegoTimeOnly(item.timestamp),
      y: item.interaction || 0
    }));
    
    return [{
      id: 'ESP Interactions',
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
