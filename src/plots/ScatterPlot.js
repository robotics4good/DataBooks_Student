import React from 'react';
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { getLocalTimeOnlyString } from '../utils/timeUtils';
import { playerNames } from './plotConfigs';
const sectorIds = ["T1","T2","T3","T4","T5","T6"];

const variableMap = {
  'Time': item => getLocalTimeOnlyString(new Date(item.timestamp)),
  'Meetings Held': item => item.meetings_held,
  'Infected Sectors': item => item.infected_sectors,
  'Infected Cadets': item => item.infected_cadets,
  'Healthy Sectors': item => item.healthy_sectors,
  'Healthy Cadets': item => item.healthy_cadets,
};

const ScatterPlot = ({ data = [], xVar = 'Time', yVar = 'Infected Cadets', personFilter, sectorFilter }) => {
  // FILTER: Only include devices that are selected in the filter
  let filterSet = null;
  const cadetVars = ['Infected Cadets', 'Healthy Cadets'];
  const sectorVars = ['Infected Sectors', 'Healthy Sectors'];
  if (cadetVars.includes(xVar) || cadetVars.includes(yVar)) {
    filterSet = new Set((personFilter && Object.entries(personFilter).filter(([id, sel]) => sel).map(([id]) => id)) || []);
  } else if (sectorVars.includes(xVar) || sectorVars.includes(yVar)) {
    filterSet = new Set((sectorFilter && Object.entries(sectorFilter).filter(([id, sel]) => sel).map(([id]) => id)) || []);
  }
  const filteredData = filterSet ? data.filter(d => filterSet.has(d.device_id)) : data;

  const getScatterData = () => {
    if (!filteredData || !filteredData.length) return [];
    const xAccessor = variableMap[xVar] || (item => item[xVar]);
    const yAccessor = variableMap[yVar] || (item => item[yVar]);
    return [{
      id: 'ESP Data',
      data: filteredData.map(item => ({
        x: xAccessor(item),
        y: yAccessor(item)
      }))
    }];
  };

  const scatterData = getScatterData();

  // No data state
  if (!scatterData.length || !scatterData[0]?.data?.length) {
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

  // Calculate dynamic scales based on actual data
  const allXValues = scatterData.flatMap(series => series.data.map(point => point.x)).filter(x => typeof x === 'number');
  const allYValues = scatterData.flatMap(series => series.data.map(point => point.y)).filter(y => typeof y === 'number');

  // For cadet/sector variables, set axis max to number of unique IDs in filtered data
  let xMaxOverride = null;
  let yMaxOverride = null;
  if (cadetVars.includes(xVar)) {
    xMaxOverride = Array.from(new Set(filteredData.map(d => d.device_id).filter(id => playerNames.includes(id)))).length;
  } else if (sectorVars.includes(xVar)) {
    xMaxOverride = Array.from(new Set(filteredData.map(d => d.device_id).filter(id => sectorIds.includes(id)))).length;
  }
  if (cadetVars.includes(yVar)) {
    yMaxOverride = Array.from(new Set(filteredData.map(d => d.device_id).filter(id => playerNames.includes(id)))).length;
  } else if (sectorVars.includes(yVar)) {
    yMaxOverride = Array.from(new Set(filteredData.map(d => d.device_id).filter(id => sectorIds.includes(id)))).length;
  }

  const maxX = allXValues.length > 0 ? Math.max(...allXValues) : 100;
  const minX = allXValues.length > 0 ? Math.min(...allXValues) : 0;
  const maxY = allYValues.length > 0 ? Math.max(...allYValues) : 100;
  const minY = allYValues.length > 0 ? Math.min(...allYValues) : 0;

  return (
    <div style={{ height: "100%", width: "100%", maxHeight: 400 }}>
      <ResponsiveScatterPlot
        data={scatterData}
        margin={{ top: 60, right: 90, bottom: 90, left: 90 }}
        xScale={{ 
          type: "linear", 
          min: Math.max(0, minX - (maxX - minX) * 0.1), 
          max: xMaxOverride !== null ? xMaxOverride : maxX + (maxX - minX) * 0.1 
        }}
        yScale={{ 
          type: "linear", 
          min: Math.max(0, minY - (maxY - minY) * 0.1), 
          max: yMaxOverride !== null ? yMaxOverride : maxY + (maxY - minY) * 0.1 
        }}
        axisBottom={{
          legend: xVar,
          legendOffset: 56,
          legendPosition: "middle",
        }}
        axisLeft={{ 
          legend: yVar, 
          legendOffset: -60, 
          legendPosition: "middle" 
        }}
        colors={{ scheme: "category10" }}
        pointSize={8}
        pointBorderWidth={2}
        useMesh={true}
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
                anchor: 'bottom-right',
                direction: 'column',
                translateX: 80,
                itemWidth: 100,
                itemHeight: 16,
                itemsSpacing: 3,
                symbolShape: 'circle'
            }
        ]}
      />
    </div>
  );
};

export default ScatterPlot; 