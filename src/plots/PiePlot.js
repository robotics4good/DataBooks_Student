// // ============================================================================
// // PiePlot.js - Pie chart visualization for ESP data & meeting logs
// // Displays proportional distributions using Nivo's ResponsivePie.
// // Consistent with LinePlot.js, BarPlot.js, and HistogramPlot.js structure.
// // ============================================================================

// import React from "react";
// import { ResponsivePie } from "@nivo/pie";
// import { transformData } from "../plot-helpers/plotUtils";

// // ============================================================================
// // HELPER: transform data safely for pie chart
// // ============================================================================

// /**
//  * Aggregate data for pie chart visualization.
//  * Uses transformData.pieAggregation to compute category proportions.
//  *
//  * @param {Array} data - ESP dataset
//  * @param {string} variable - Variable to visualize
//  * @returns {Array<{ id: string, label: string, value: number }>}
//  */
// function getPieData(data, variable) {
//   if (!Array.isArray(data) || data.length === 0) return [];
//   const result = transformData?.pieAggregation?.(data, variable);
//   if (!Array.isArray(result) || !result.length) return [];
//   return result.filter(d => d.value > 0);
// }

// // ============================================================================
// // MAIN COMPONENT
// // ============================================================================

// const PiePlot = ({
//   data = [],
//   selectedVariable = "Button A Presses",
//   sessionId,
//   personFilter,
//   sectorFilter,
// }) => {
//   const pieData = getPieData(data, selectedVariable);

//   // Handle empty data gracefully
//   if (!pieData.length) {
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

//   // ========================================================================
//   // Render ResponsivePie chart
//   // ========================================================================

//   return (
//     <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
//       <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>
//         {`Pie Chart of ${selectedVariable} Distribution`}
//       </div>

//       <ResponsivePie
//         data={pieData}
//         margin={{ top: 50, right: 90, bottom: 130, left: 90 }}
//         innerRadius={0.5}
//         padAngle={0.7}
//         cornerRadius={3}
//         activeOuterRadiusOffset={8}
//         colors={{ scheme: "category10" }}
//         borderWidth={1}
//         borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
//         arcLinkLabelsSkipAngle={10}
//         arcLinkLabelsTextColor="#333"
//         arcLinkLabelsThickness={2}
//         arcLinkLabelsColor={{ from: "color" }}
//         arcLabelsSkipAngle={10}
//         arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
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
//             anchor: "bottom",
//             direction: "row",
//             translateY: 56,
//             itemWidth: 100,
//             itemHeight: 18,
//             itemsSpacing: 4,
//             symbolSize: 16,
//             symbolShape: "circle",
//             itemTextColor: "#555",
//           },
//         ]}
//         tooltip={({ datum }) => (
//           <div
//             style={{
//               background: "#fff",
//               padding: "9px 12px",
//               border: "1px solid #ccc",
//               borderRadius: "4px",
//               boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
//             }}
//           >
//             <strong style={{ color: datum.color }}>
//               {datum.label}: {datum.value}
//             </strong>
//           </div>
//         )}
//       />
//     </div>
//   );
// };

// export default PiePlot;
