// ============================================================================
// HistogramPlot.js - Histogram visualization for ESP data & meeting logs
// Uses Nivo's ResponsiveBar to show variable distributions.
// Consistent with BarPlot.js / LinePlot.js / ScatterPlot.js structure.
// ============================================================================

import React from "react";
import { ResponsiveBar } from "@nivo/bar";
import { transformData } from "../plot-helpers/plotUtils";

// ============================================================================
// HELPER: safely transform data into histogram bins
// ============================================================================

/**
 * Build histogram bins for a given variable using transformData.histogramBinning.
 * Falls back gracefully if data or variable is missing.
 *
 * @param {Array} data - ESP dataset
 * @param {string} xVar - Variable to bin
 * @param {number} bins - Number of bins (default 15)
 * @returns {Array<{ bin: string, frequency: number }>}
 */
function getHistogramData(data, xVar, bins = 15) {
  if (!Array.isArray(data) || data.length === 0) return [];

  const hist = transformData?.histogramBinning?.(data, xVar, bins);
  if (!Array.isArray(hist) || !hist[0]?.data?.length) return [];

  // Flatten structure for Nivo bar chart
  return hist[0].data.map(item => ({
    bin: item.x,
    frequency: item.y,
  }));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HistogramPlot = ({
  data = [],
  xVar = "Infected Cadets",
  sessionId,
  personFilter,
  sectorFilter,
}) => {
  const histogramData = getHistogramData(data, xVar, 15);

  // Handle empty / missing data
  if (!histogramData.length) {
    return (
      <div
        style={{
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
        }}
      >
        No data to display currently
      </div>
    );
  }

  // ========================================================================
  // Render Nivo Bar as Histogram
  // ========================================================================

  return (
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>
        {`Histogram of ${xVar} Distribution`}
      </div>

      <ResponsiveBar
        data={histogramData}
        keys={["frequency"]}
        indexBy="bin"
        margin={{ top: 50, right: 80, bottom: 130, left: 90 }}
        padding={0.3}
        groupMode="grouped"
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={{ scheme: "category10" }}
        borderColor={{ from: "color", modifiers: [["darker", 1.4]] }}
        axisBottom={{
          tickRotation: -45,
          legend: xVar,
          legendPosition: "middle",
          legendOffset: 56,
        }}
        axisLeft={{
          legend: "Frequency",
          legendPosition: "middle",
          legendOffset: -60,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        animate={false}
        motionConfig="gentle"
        theme={{
          axis: {
            domain: { line: { stroke: "#000" } },
            ticks: { text: { fill: "#000" } },
            legend: { text: { fill: "#000" } },
          },
          grid: { line: { stroke: "#d3d3d3", strokeWidth: 1 } },
        }}
        legends={[
          {
            dataFrom: "keys",
            anchor: "bottom-right",
            direction: "column",
            translateX: 80,
            itemWidth: 100,
            itemHeight: 16,
            itemsSpacing: 3,
            symbolSize: 12,
            symbolShape: "circle",
          },
        ]}
        tooltip={({ value, color }) => (
          <div
            style={{
              background: "#fff",
              padding: "9px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <strong style={{ color }}>Frequency:</strong> {value}
          </div>
        )}
      />
    </div>
  );
};

export default HistogramPlot;
