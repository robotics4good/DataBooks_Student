// plotUtils.js - Utility functions for plot data processing
import { playerNames, sectorIds } from './plotConfigs';

// Variable accessor functions for ESP data
export const getVariableValue = (dataPoint, variableName) => {
  switch (variableName) {
    case "Time":
      return dataPoint.timestamp;
    case "Meetings Held":
      return dataPoint.meetings_held || 0;
    case "Infected Sectors":
      return dataPoint.infectedSectors || 0;
    case "Infected Cadets":
      return dataPoint.infectedCadets || 0;
    case "Healthy Sectors":
      return dataPoint.healthySectors || 0;
    case "Healthy Cadets":
      return dataPoint.healthyCadets || 0;
    default:
      return 0;
  }
};

// Data transformation functions
export const transformData = (data, xVariable, yVariable, transformType = 'none', binCount = 10) => {
  if (!data || data.length === 0) return [];

  switch (transformType) {
    case 'bin':
      return binData(data, xVariable, yVariable, binCount);
    case 'thin':
      return thinData(data, xVariable, yVariable);
    case 'aggregate':
      return aggregateData(data, xVariable, yVariable);
    default:
      return data;
  }
};

// Binning function for histogram-like data
const binData = (data, xVariable, yVariable, binCount) => {
  if (xVariable === "Time") {
    // Time-based binning
    const timeRange = Math.max(...data.map(d => d.timestamp)) - Math.min(...data.map(d => d.timestamp));
    const binSize = timeRange / binCount;
    
    return data.reduce((bins, point) => {
      const binIndex = Math.floor((point.timestamp - Math.min(...data.map(d => d.timestamp))) / binSize);
      const binKey = Math.min(...data.map(d => d.timestamp)) + (binIndex * binSize);
      
      if (!bins[binKey]) {
        bins[binKey] = {
          timestamp: binKey,
          count: 0,
          sum: 0,
          values: []
        };
      }
      
      bins[binKey].count++;
      bins[binKey].sum += getVariableValue(point, yVariable);
      bins[binKey].values.push(getVariableValue(point, yVariable));
      
      return bins;
    }, {});
  } else {
    // Value-based binning
    const values = data.map(d => getVariableValue(d, xVariable));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / binCount;
    
    return data.reduce((bins, point) => {
      const value = getVariableValue(point, xVariable);
      const binIndex = Math.floor((value - min) / binSize);
      const binKey = min + (binIndex * binSize);
      
      if (!bins[binKey]) {
        bins[binKey] = {
          x: binKey,
          count: 0,
          sum: 0,
          values: []
        };
      }
      
      bins[binKey].count++;
      bins[binKey].sum += getVariableValue(point, yVariable);
      bins[binKey].values.push(getVariableValue(point, yVariable));
      
      return bins;
    }, {});
  }
};

// Thinning function to reduce data points
const thinData = (data, xVariable, yVariable) => {
  if (data.length <= 100) return data; // Don't thin if already small
  
  const step = Math.ceil(data.length / 100);
  return data.filter((_, index) => index % step === 0);
};

// Aggregation function
const aggregateData = (data, xVariable, yVariable) => {
  if (xVariable === "Time") {
    // Time-based aggregation
    return data.reduce((acc, point) => {
      const timeKey = Math.floor(point.timestamp / 60000) * 60000; // Round to minute
      
      if (!acc[timeKey]) {
        acc[timeKey] = {
          timestamp: timeKey,
          count: 0,
          sum: 0,
          values: []
        };
      }
      
      acc[timeKey].count++;
      acc[timeKey].sum += getVariableValue(point, yVariable);
      acc[timeKey].values.push(getVariableValue(point, yVariable));
      
      return acc;
    }, {});
  } else {
    // Value-based aggregation
    return data.reduce((acc, point) => {
      const value = getVariableValue(point, xVariable);
      const key = Math.round(value * 100) / 100; // Round to 2 decimal places
      
      if (!acc[key]) {
        acc[key] = {
          x: key,
          count: 0,
          sum: 0,
          values: []
        };
      }
      
      acc[key].count++;
      acc[key].sum += getVariableValue(point, yVariable);
      acc[key].values.push(getVariableValue(point, yVariable));
      
      return acc;
    }, {});
  }
};

// Filter functions
export const initializePersonFilter = () => {
  return playerNames.reduce((acc, name) => {
    acc[name] = true;
    return acc;
  }, {});
};

export const initializeSectorFilter = () => {
  return sectorIds.reduce((acc, id) => {
    acc[id] = true;
    return acc;
  }, {});
};

// Apply filters to data
export const applyFilters = (data, personFilter, sectorFilter) => {
  if (!data) return [];
  
  return data.filter(point => {
    // Apply person filter if device_id exists
    if (point.device_id && personFilter) {
      const deviceId = point.device_id;
      if (!personFilter[deviceId]) return false;
    }
    
    // Apply sector filter if sector_id exists
    if (point.sector_id && sectorFilter) {
      const sectorId = point.sector_id;
      if (!sectorFilter[sectorId]) return false;
    }
    
    return true;
  });
};

// Get unique values for a variable
export const getUniqueValues = (data, variableName) => {
  if (!data || data.length === 0) return [];
  
  const values = data.map(d => getVariableValue(d, variableName));
  return [...new Set(values)].sort((a, b) => a - b);
};

// Calculate statistics for a variable
export const calculateStats = (data, variableName) => {
  if (!data || data.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
  
  const values = data.map(d => getVariableValue(d, variableName)).filter(v => !isNaN(v));
  
  if (values.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
  
  const sorted = values.sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: sum / values.length,
    median: sorted[Math.floor(sorted.length / 2)]
  };
}; 