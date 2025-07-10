import React from 'react';
import { ResponsiveBar } from "@nivo/bar";
import { getLocalTimeOnlyString } from '../utils/timeUtils';

const variableMap = {
  'Infected Sectors': item => item.infected_sectors,
  'Infected Cadets': item => item.infected_cadets,
};

const HistogramPlot = ({ data = [], xVar = 'Infected Cadets', yVar = 'Frequency' }) => {
  const getHistogramData = () => {
    if (!data || !data.length) return [];
    const xAccessor = variableMap[xVar] || (item => item[xVar]);
    // Count frequency of each unique value
    const freqMap = {};
    data.forEach(item => {
      const xValue = xAccessor(item);
      if (xValue !== undefined && xValue !== null) {
        freqMap[xValue] = (freqMap[xValue] || 0) + 1;
      }
    });
    return Object.entries(freqMap).map(([range, frequency]) => ({
      range,
      frequency
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