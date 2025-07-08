// plots/bar_plot.js - Game-controlled data access
import React from 'react';
import { ResponsiveBar } from "@nivo/bar";
import { formatSanDiegoTimeOnly } from '../utils/timeUtils';

const BarPlot = ({ data = [] }) => {
  // Transform data for bar plot if provided
  const getBarData = () => {
    if (!data || !data.length) return [];
    
    // Transform ESP data into bar chart format
    const timeSlots = {};
    
    data.forEach(item => {
      const time = formatSanDiegoTimeOnly(item.timestamp);
      timeSlots[time] = (timeSlots[time] || 0) + 1;
    });
    
    return Object.entries(timeSlots).map(([time, count]) => ({
      time: time,
      interactions: count
    }));
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

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ResponsiveBar
        data={barData}
        keys={["interactions"]}
        indexBy="time"
        margin={{ top: 60, right: 90, bottom: 90, left: 90 }}
        padding={0.3}
        groupMode="grouped"
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={{ scheme: "nivo" }}
        borderColor={{
          from: "color",
          modifiers: [["darker", 1.6]],
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: "Time",
          legendPosition: "middle",
          legendOffset: 60,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Number of Interactions",
          legendPosition: "middle",
          legendOffset: -60,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{
          from: "color",
          modifiers: [["darker", 1.6]],
        }}
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
            dataFrom: "keys",
            anchor: "bottom-right",
            direction: "column",
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemsDirection: "left-to-right",
            itemOpacity: 0.85,
            symbolSize: 20,
            effects: [
              {
                on: "hover",
                style: {
                  itemOpacity: 1,
                },
              },
            ],
          },
        ]}
      />
    </div>
  );
};

export default BarPlot;
