// plots/pie_plot.js - Game-controlled data access
import React from 'react';
import { ResponsivePie } from "@nivo/pie";

const PiePlot = ({ data = [] }) => {
  // Transform data for pie plot if provided
  const getPieData = () => {
    if (!data || !data.length) return [];
    
    // Transform ESP data into pie chart format
    const interactionTypes = {};
    
    data.forEach(item => {
      const type = item.interactionType || 'Unknown';
      interactionTypes[type] = (interactionTypes[type] || 0) + 1;
    });
    
    return Object.entries(interactionTypes).map(([label, value]) => ({
      id: label,
      label: label,
      value: value
    }));
  };

  const pieData = getPieData();

  // No data state
  if (!pieData.length) {
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

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ResponsivePie
        data={pieData}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        colors={{ scheme: "nivo" }}
        borderWidth={1}
        borderColor={{
          from: "color",
          modifiers: [["darker", 0.2]],
        }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: "color" }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{
          from: "color",
          modifiers: [["darker", 2]],
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
          labels: {
            text: {
              fill: '#000000',
            },
          },
        }}
        legends={[
          {
            anchor: "bottom",
            direction: "row",
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: "#999",
            itemDirection: "left-to-right",
            itemOpacity: 1,
            symbolSize: 18,
            symbolShape: "circle",
          },
        ]}
      />
    </div>
  );
};

export default PiePlot;
