// plots/HeatmapPlot.js
import React from 'react';
import { ResponsiveHeatMap } from "@nivo/heatmap";

const sampleData = [
  { id: 'A', x1: 1, x2: 2, x3: 3 },
  { id: 'B', x1: 4, x2: 5, x3: 6 },
  { id: 'C', x1: 7, x2: 8, x3: 9 },
];
const sampleKeys = ['x1', 'x2', 'x3'];
const sampleIndexBy = 'id';

const HeatmapPlot = ({ data = sampleData, keys = sampleKeys, indexBy = sampleIndexBy }) => {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ResponsiveHeatMap
        data={data}
        keys={keys}
        indexBy={indexBy}
        margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
        forceSquare={true}
        axisTop={{ orient: "top", tickSize: 5, tickPadding: 5, tickRotation: -45 }}
        axisLeft={{ orient: "left", tickSize: 5, tickPadding: 5 }}
        colors={{ type: "diverging", scheme: "red_yellow_blue", divergeAt: 0.5 }}
        cellOpacity={1}
        cellBorderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
        labelTextColor={{ from: "color", modifiers: [["darker", 1.8]] }}
        animate={true}
        motionConfig="wobbly"
      />
    </div>
  );
};

export default HeatmapPlot;
