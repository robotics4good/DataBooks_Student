// HistogramPlot.js - Comprehensive histogram plot for ESP data and meeting logs
import React from 'react';
import { ResponsiveBar } from "@nivo/bar";
import { playerNames, sectorIds } from './plotConfigs';
import { variableAccessors, transformData } from './plotUtils';

const HistogramPlot = (props) => {
  const { 
    data = [], 
    xVar = 'Infected Cadets', 
    sessionId,
    personFilter,
    sectorFilter
  } = props;

  const getHistogramData = () => {
    if (!data || !data.length) {
      return [];
    }

    // Use the histogram binning transformation
    return transformData.histogramBinning(data, xVar, 15);
  };

  const histogramData = getHistogramData();

  // No data state
  if (!histogramData.length || !histogramData[0]?.data?.length) {
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

  // Transform data for Nivo bar chart
  const barData = histogramData[0].data.map(item => ({
    bin: item.x,
    frequency: item.y
  }));

  return (
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
        {`Histogram of ${xVar} Distribution`}
      </div>
      <ResponsiveBar
        data={barData}
        keys={['frequency']}
        indexBy="bin"
        margin={{ top: 60, right: 90, bottom: 130, left: 90 }}
        padding={0.3}
        groupMode="grouped"
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={{ scheme: "category10" }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: xVar,
          legendPosition: 'middle',
          legendOffset: 56,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Frequency',
          legendPosition: 'middle',
          legendOffset: -60,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
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
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            translateX: 80,
            itemWidth: 100,
            itemHeight: 16,
            itemsSpacing: 3,
            symbolSize: 12,
            symbolShape: 'circle',
          },
        ]}
        tooltip={({ id, value, color }) => (
          <div
            style={{
              background: 'white',
              padding: '9px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ color }}>
              <strong>Frequency</strong>: {value}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default HistogramPlot; 