// ScatterPlot.js — FINAL UPGRADED VERSION (axis inversion + meaningful relationships)
import React from "react";
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { playerNames, sectorIds } from "../plot-helpers/plotConfigs";

// ============================================================================
// HELPERS
// ============================================================================
const isCadet = (id) => playerNames.includes(id);
const isSector = (id) => sectorIds.includes(id);

// Normalize timestamps and filter bad records
function preprocessESPData(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => d.device_id && !["QR", "CR"].includes(d.device_id))
    .map((d) => ({
      ...d,
      timestamp:
        typeof d.timestamp === "string"
          ? Date.parse(d.timestamp)
          : d.timestamp,
    }))
    .filter((d) => !isNaN(d.timestamp));
}

// ============================================================================
// VARIABLE ACCESSORS
// ============================================================================
function getVariableValue(varName) {
  const accessors = {
    Time: (d) => d.timestamp,
    Hour: (d) => d.hour || new Date(d.timestamp).getHours(),
    "Infected Cadets": (d) =>
      d.infection_status === 1 && isCadet(d.device_id) ? 1 : 0,
    "Healthy Cadets": (d) =>
      (d.infection_status === 0 || d.infection_status === 0.5) &&
      isCadet(d.device_id)
        ? 1
        : 0,
    "Infected Sectors": (d) =>
      d.infection_status === 1 && isSector(d.device_id) ? 1 : 0,
    "Healthy Sectors": (d) =>
      (d.infection_status === 0 || d.infection_status === 0.5) &&
      isSector(d.device_id)
        ? 1
        : 0,
  };
  return accessors[varName] || ((d) => d[varName]);
}

// ============================================================================
// DATA GENERATORS
// ============================================================================

// Helper: aggregate infections/health per time bucket
function aggregateCounts(data, bucketMinutes = 5) {
  const bucketSize = bucketMinutes * 60 * 1000;
  const buckets = {};

  data.forEach((d) => {
    const t = Math.floor(d.timestamp / bucketSize) * bucketSize;
    if (!buckets[t])
      buckets[t] = {
        infectedCadets: 0,
        healthyCadets: 0,
        infectedSectors: 0,
        healthySectors: 0,
      };

    if (isCadet(d.device_id)) {
      if (d.infection_status === 1) buckets[t].infectedCadets++;
      else buckets[t].healthyCadets++;
    } else if (isSector(d.device_id)) {
      if (d.infection_status === 1) buckets[t].infectedSectors++;
      else buckets[t].healthySectors++;
    }
  });

  return Object.entries(buckets).map(([t, counts]) => ({
    time: new Date(Number(t)),
    ...counts,
  }));
}

// ============================================================================
// PLOT LOGIC
// ============================================================================

// Build points for one variable vs. time
function buildTimeSeries(data, variable) {
  return data.map((entry) => ({
    x: entry.time,
    y: entry[variable],
  }));
}

// Build relationship plot (e.g. infected cadets vs infected sectors)
function buildRelationalPlot(data, varX, varY) {
  return data.map((entry) => ({
    x: entry[varX],
    y: entry[varY],
  }));
}

// Generate scatter data with full inversion support
function generateScatterData(xVar, yVar, data) {
  if (!data || !data.length) return [];

  const aggregated = aggregateCounts(data);

  const timeBased =
    xVar === "Time" ||
    yVar === "Time" ||
    xVar === "Hour" ||
    yVar === "Hour";

  // 🔹 Relationship plots (e.g. Infected Cadets vs Infected Sectors)
  const relMap = {
    "Infected Cadets": "infectedCadets",
    "Healthy Cadets": "healthyCadets",
    "Infected Sectors": "infectedSectors",
    "Healthy Sectors": "healthySectors",
  };

  const xKey = relMap[xVar];
  const yKey = relMap[yVar];

  // Relationship between infection groups
  if (xKey && yKey) return buildRelationalPlot(aggregated, xKey, yKey);

  // Time series (forward or inverted)
  if (timeBased) {
    const variable =
      relMap[yVar] || relMap[xVar] || "infectedCadets"; // default fallback
    const points = buildTimeSeries(aggregated, variable);
    if (xVar === "Time")
      return points.map((p) => ({ x: p.x, y: p.y })); // normal orientation
    else
      return points.map((p) => ({ x: p.y, y: p.x })); // inverted axis
  }

  return [];
}

// ============================================================================
// COMPONENT
// ============================================================================
const ScatterPlot = ({ data = [], xVar = "Time", yVar = "Infected Cadets" }) => {
  const [points, setPoints] = React.useState([]);

  React.useEffect(() => {
    const clean = preprocessESPData(data);
    setPoints(generateScatterData(xVar, yVar, clean));
  }, [data, xVar, yVar]);

  const scatterData =
    points.length > 0 ? [{ id: `${xVar} vs ${yVar}`, data: points }] : [];

  if (!points.length)
    return (
      <div
        style={{
          height: "100%",
          minHeight: 320,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.1rem",
          color: "#666",
          background: "#f8f3ea",
          borderRadius: 8,
          border: "1.5px solid #e0e0e0",
        }}
      >
        No data to display currently
      </div>
    );

  // Bounds
  const isTimeOnX = xVar === "Time";
  const isTimeOnY = yVar === "Time";

  const allX = points.map((p) =>
    isTimeOnX && p.x instanceof Date ? p.x.getTime() : Number(p.x)
  );
  const allY = points.map((p) =>
    isTimeOnY && p.y instanceof Date ? p.y.getTime() : Number(p.y)
  );
  const minX = Math.min(...allX),
    maxX = Math.max(...allX),
    minY = Math.min(...allY),
    maxY = Math.max(...allY);
  const xPad = (maxX - minX) * 0.1 || 1;
  const yPad = (maxY - minY) * 0.1 || 1;

  // Axis formatters
  const formatTime = (v) =>
    new Date(v).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const formatX = (v) => (isTimeOnX ? formatTime(v) : v);
  const formatY = (v) => (isTimeOnY ? formatTime(v) : v);

  // X/Y scale type
  const xScale =
    isTimeOnX
      ? { type: "time", format: "native", precision: "minute" }
      : { type: "linear", min: minX - xPad, max: maxX + xPad };

  const yScale =
    isTimeOnY
      ? { type: "time", format: "native", precision: "minute" }
      : { type: "linear", min: minY - yPad, max: maxY + yPad };

  return (
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>
        {`Scatter Plot of ${xVar} vs ${yVar}`}
      </div>
      <ResponsiveScatterPlot
        data={scatterData}
        margin={{ top: 50, right: 80, bottom: 120, left: 90 }}
        xScale={xScale}
        yScale={yScale}
        axisBottom={{
          legend: xVar,
          legendOffset: 56,
          legendPosition: "middle",
          tickRotation: -45,
          format: formatX,
        }}
        axisLeft={{
          legend: yVar,
          legendOffset: -60,
          legendPosition: "middle",
          format: formatY,
        }}
        colors={{ scheme: "set1" }}
        pointSize={8}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        useMesh={true}
        animate={false}
        theme={{
          axis: {
            domain: { line: { stroke: "#000" } },
            ticks: { line: { stroke: "#000" }, text: { fill: "#000" } },
          },
          grid: { line: { stroke: "#d3d3d3", strokeWidth: 1 } },
        }}
        tooltip={({ node }) => (
          <div
            style={{
              background: "white",
              padding: "9px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <div>
              <strong>{xVar}</strong>:{" "}
              {isTimeOnX
                ? formatTime(node.data.x)
                : node.data.x.toFixed
                ? node.data.x.toFixed(2)
                : node.data.x}
            </div>
            <div>
              <strong>{yVar}</strong>:{" "}
              {isTimeOnY
                ? formatTime(node.data.y)
                : node.data.y.toFixed
                ? node.data.y.toFixed(2)
                : node.data.y}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default ScatterPlot;
