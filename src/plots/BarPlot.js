// // ============================================================================
// // BarPlot.js - Comprehensive bar plot for ESP data and meeting logs
// // Supports multiple aggregation modes: device, time, hour, AM/PM, button presses.
// // Designed for readability and consistency with LinePlot.js / ScatterPlot.js.
// // ============================================================================

// import React from "react";
// import { ResponsiveBar } from "@nivo/bar";
// import { playerNames, sectorIds } from "../plot-helpers/plotConfigs";
// import { getVariableValue } from "../plot-helpers/plotUtils";

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// /**
//  * Aggregate data by device, hour, session half, or other categories.
//  * Each mode returns a uniform array of { xCategory, yValue } objects
//  * compatible with Nivo’s ResponsiveBar component.
//  */
// function getAggregatedData(data, xVar, yVar) {
//   if (!Array.isArray(data) || data.length === 0) return [];

//   const yAccessor = item => getVariableValue(item, yVar) ?? 0;
//   const grouped = {};

//   // ---------------------------------------------------------
//   // Device-based aggregation (Infected/Healthy Cadets/Sectors)
//   // ---------------------------------------------------------
//   if (
//     ["Infected Cadets", "Infected Sectors", "Healthy Cadets", "Healthy Sectors"].includes(xVar)
//   ) {
//     data.forEach(d => {
//       const key = d.device_id;
//       if (!grouped[key]) grouped[key] = 0;
//       grouped[key] += yAccessor(d);
//     });

//     return Object.entries(grouped).map(([device, y]) => ({ x: device, y }));
//   }

//   // ---------------------------------------------------------
//   // Hourly aggregation
//   // ---------------------------------------------------------
//   if (xVar === "Hour") {
//     for (let h = 0; h < 24; h++) grouped[h] = [];
//     data.forEach(d => {
//       const hour = d.hour ?? new Date(d.timestamp).getHours();
//       grouped[hour].push(d);
//     });

//     return Object.entries(grouped)
//       .map(([hour, arr]) => ({
//         x: `${hour}:00`,
//         y: arr.reduce((sum, d) => sum + yAccessor(d), 0),
//       }))
//       .filter(d => d.y > 0);
//   }

//   // ---------------------------------------------------------
//   // Session half aggregation (AM / PM)
//   // ---------------------------------------------------------
//   if (xVar === "Session Half") {
//     grouped["AM"] = [];
//     grouped["PM"] = [];
//     data.forEach(d => {
//       const half = d.session_half ?? (new Date(d.timestamp).getHours() < 12 ? "AM" : "PM");
//       grouped[half].push(d);
//     });

//     return Object.entries(grouped)
//       .map(([half, arr]) => ({
//         x: half,
//         y: arr.reduce((sum, d) => sum + yAccessor(d), 0),
//       }))
//       .filter(d => d.y > 0);
//   }

//   // ---------------------------------------------------------
//   // Button presses & interactions (device-level)
//   // ---------------------------------------------------------
//   if (["Button A Presses", "Button B Presses", "Interactions", "Beacon Array"].includes(xVar)) {
//     data.forEach(d => {
//       const dev = d.device_id;
//       if (!grouped[dev]) grouped[dev] = { buttonA: 0, buttonB: 0, beaconArray: 0 };
//       grouped[dev].buttonA += d.buttonA || 0;
//       grouped[dev].buttonB += d.buttonB || 0;
//       grouped[dev].beaconArray += d.beaconArray || 0;
//     });

//     return Object.entries(grouped)
//       .map(([dev, stats]) => ({
//         x: dev,
//         y: yAccessor(stats),
//       }))
//       .filter(d => d.y > 0);
//   }

//   // ---------------------------------------------------------
//   // Infection-related metrics (Infection Rate, Activity Level)
//   // ---------------------------------------------------------
//   if (["Infection Rate", "Activity Level"].includes(xVar)) {
//     data.forEach(d => {
//       const dev = d.device_id;
//       if (!grouped[dev])
//         grouped[dev] = {
//           infection_status: d.infection_status,
//           isCadet: playerNames.includes(dev),
//           isSector: sectorIds.includes(dev),
//         };
//       grouped[dev].y = (grouped[dev].y || 0) + yAccessor(d);
//     });

//     return Object.entries(grouped)
//       .map(([dev, obj]) => ({ x: dev, y: obj.y }))
//       .filter(d => d.y > 0);
//   }

//   // ---------------------------------------------------------
//   // Time-based binning (even split into 10 bins)
//   // ---------------------------------------------------------
//   if (xVar === "Time") {
//     const binCount = 10;
//     const binSize = Math.ceil(data.length / binCount);
//     for (let i = 0; i < binCount; i++) grouped[`Bin ${i + 1}`] = [];

//     data.forEach((d, idx) => {
//       const binIndex = Math.floor(idx / binSize);
//       grouped[`Bin ${binIndex + 1}`].push(d);
//     });

//     return Object.entries(grouped)
//       .map(([bin, arr]) => ({
//         x: bin,
//         y: arr.reduce((sum, d) => sum + yAccessor(d), 0),
//       }))
//       .filter(d => d.y > 0);
//   }

//   // ---------------------------------------------------------
//   // Default: aggregate by device ID
//   // ---------------------------------------------------------
//   data.forEach(d => {
//     const dev = d.device_id;
//     if (!grouped[dev]) grouped[dev] = [];
//     grouped[dev].push(d);
//   });

//   return Object.entries(grouped)
//     .map(([dev, arr]) => ({
//       x: dev,
//       y: arr.reduce((sum, d) => sum + yAccessor(d), 0),
//     }))
//     .filter(d => d.y > 0);
// }

// // ============================================================================
// // MAIN COMPONENT
// // ============================================================================

// const BarPlot = ({
//   data = [],
//   xVar = "Time",
//   yVar = "Infected Cadets",
//   sessionId,
//   personFilter,
//   sectorFilter,
// }) => {
//   const barData = getAggregatedData(data, xVar, yVar);

//   // Handle empty state
//   if (!barData.length) {
//     return (
//       <div
//         style={{
//           height: "100%",
//           width: "100%",
//           minHeight: 320,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           fontSize: "1.1rem",
//           color: "#666",
//           background: "#f8f3ea",
//           borderRadius: 8,
//           border: "1.5px solid #e0e0e0",
//           boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
//         }}
//       >
//         No data to display currently
//       </div>
//     );
//   }

//   return (
//     <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
//       <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>
//         {`Bar Plot of ${xVar} vs ${yVar}`}
//       </div>
//       <ResponsiveBar
//         data={barData}
//         keys={["y"]}
//         indexBy="x"
//         margin={{ top: 50, right: 90, bottom: 130, left: 90 }}
//         padding={0.3}
//         groupMode="grouped"
//         valueScale={{ type: "linear" }}
//         indexScale={{ type: "band", round: true }}
//         colors={{ scheme: "category10" }}
//         borderColor={{ from: "color", modifiers: [["darker", 1.4]] }}
//         axisBottom={{
//           tickRotation: -45,
//           legend: xVar,
//           legendPosition: "middle",
//           legendOffset: 56,
//         }}
//         axisLeft={{
//           legend: yVar,
//           legendPosition: "middle",
//           legendOffset: -60,
//         }}
//         labelSkipWidth={12}
//         labelSkipHeight={12}
//         labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
//         animate={false}
//         motionConfig="gentle"
//         theme={{
//           axis: {
//             domain: { line: { stroke: "#000" } },
//             ticks: { text: { fill: "#000" } },
//             legend: { text: { fill: "#000" } },
//           },
//           grid: { line: { stroke: "#d3d3d3", strokeWidth: 1 } },
//         }}
//         legends={[
//           {
//             dataFrom: "keys",
//             anchor: "bottom-right",
//             direction: "column",
//             translateX: 80,
//             itemWidth: 100,
//             itemHeight: 16,
//             itemsSpacing: 3,
//             symbolSize: 12,
//             symbolShape: "circle",
//           },
//         ]}
//         tooltip={({ value, color }) => (
//           <div
//             style={{
//               background: "#fff",
//               padding: "9px 12px",
//               border: "1px solid #ccc",
//               borderRadius: "4px",
//               boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
//             }}
//           >
//             <strong style={{ color }}>{yVar}:</strong> {value}
//           </div>
//         )}
//       />
//     </div>
//   );
// };

// export default BarPlot;
