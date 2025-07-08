import React from 'react';
import { ResponsiveBar } from "@nivo/bar";

const HistogramPlot = ({ data = [] }) => {
  // Transform data for histogram plot if provided
  const getHistogramData = () => {
    if (!data || !data.length) return [];
    
    // Transform ESP data into histogram format
    const interactionValues = data.map(item => item.interaction || 0);
    
    if (interactionValues.length === 0) return [];
    
    // Create bins for histogram
    const min = Math.min(...interactionValues);
    const max = Math.max(...interactionValues);
    const binCount = Math.min(10, Math.ceil(Math.sqrt(interactionValues.length)));
    const binSize = (max - min) / binCount;
    
    const bins = {};
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      const binLabel = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
      bins[binLabel] = 0;
    }
    
    // Count values in each bin
    interactionValues.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
      const binStart = min + binIndex * binSize;
      const binEnd = min + (binIndex + 1) * binSize;
      const binLabel = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
      bins[binLabel]++;
    });
    
    return Object.entries(bins).map(([range, count]) => ({
      range: range,
      frequency: count
    }));
  };

  const histogramData = getHistogramData();

  // No data state
  if (!histogramData.length) {
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
      <ResponsiveBar
        data={histogramData}
        keys={["frequency"]}
        indexBy="range"
        margin={{ top: 60, right: 90, bottom: 90, left: 90 }}
        padding={0.1}
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
          legend: "Interaction Value Range",
          legendPosition: "middle",
          legendOffset: 60,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Frequency",
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

export default HistogramPlot; 