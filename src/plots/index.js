// index.js - Main exports for the plots module

// Main component
export { default as PlotComponent } from './PlotComponent';

// Configuration and constants
export { plotConfigs, playerNames } from './plotConfigs';

// Utility functions
export { 
  isYAllowed, 
  isXAllowed, 
  initializeVariableFilters, 
  initializePersonFilter, 
  filterData, 
  toggleVariable, 
  logPlotAction 
} from './plotUtils';

// Custom hook
export { usePlotState } from './usePlotState';

// Individual plot components (for direct access if needed)
export { default as LinePlot } from './LinePlot';
export { default as ScatterPlot } from './ScatterPlot';
export { default as BarPlot } from './BarPlot';
export { default as HistogramPlot } from './HistogramPlot';
export { default as PiePlot } from './PiePlot';
export { default as AreaPlot } from './AreaPlot';
export { default as HeatmapPlot } from './HeatmapPlot';
export { default as NetworkPlot } from './NetworkPlot';

// ESP Data specific components
export { default as ESPDataPlot } from './ESPDataPlot'; 