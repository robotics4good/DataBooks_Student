// PiePlot.js - Comprehensive pie plot for ESP data and meeting logs
import React from 'react';
import { ResponsivePie } from "@nivo/pie";
import { playerNames, sectorIds } from './plotConfigs';
import { variableAccessors, transformData } from './plotUtils';

const PiePlot = (props) => {
  const { 
    data = [], 
    selectedVariable = 'Button A Presses',
    sessionId,
    personFilter,
    sectorFilter
  } = props;

  const getPieData = () => {
    if (!data || !data.length) {
      return [];
    }

    // Use the pie aggregation transformation
    return transformData.pieAggregation(data, selectedVariable);
  };

  const pieData = getPieData();

  // No data state
  if (!pieData.length) {
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
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
        {`Pie Chart of ${selectedVariable} Distribution`}
      </div>
      <ResponsivePie
        data={pieData}
        margin={{ top: 60, right: 90, bottom: 130, left: 90 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        colors={{ scheme: "category10" }}
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
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: '#999',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 18,
            symbolShape: 'circle',
          },
        ]}
        tooltip={({ datum }) => (
          <div
            style={{
              background: 'white',
              padding: '9px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ color: datum.color }}>
              <strong>{datum.label}</strong>: {datum.value}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default PiePlot;
