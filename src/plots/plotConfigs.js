// plotConfigs.js - Configuration data for different plot types
import LinePlot from './LinePlot';
import ScatterPlot from './ScatterPlot';
import BarPlot from './BarPlot';
import HistogramPlot from './HistogramPlot';
import PiePlot from './PiePlot';

// Device IDs constant (formerly playerNames, now S1-S12 for cadet device IDs)
export const playerNames = [
  "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12"
];

// Modular config for each plot type
export const plotConfigs = {
  line: {
    label: 'Line Plot',
    allowedMatrix: {
      "Time": {
        "Time": false,
        "Meetings Held": true,
        "Infected Sectors": true,
        "Infected Cadets": true,
        "Healthy Sectors": true,
        "Healthy Cadets": true
      },
      "Meetings Held": {
        "Time": true,
        "Meetings Held": false,
        "Infected Sectors": true,
        "Infected Cadets": true,
        "Healthy Sectors": true,
        "Healthy Cadets": true
      },
      "Infected Sectors": {
        "Time": false,
        "Meetings Held": false,
        "Infected Sectors": false,
        "Infected Cadets": false,
        "Healthy Sectors": false,
        "Healthy Cadets": false
      },
      "Infected Cadets": {
        "Time": false,
        "Meetings Held": false,
        "Infected Sectors": false,
        "Infected Cadets": false,
        "Healthy Sectors": false,
        "Healthy Cadets": false
      },
      "Healthy Sectors": {
        "Time": false,
        "Meetings Held": false,
        "Infected Sectors": false,
        "Infected Cadets": false,
        "Healthy Sectors": false,
        "Healthy Cadets": false
      },
      "Healthy Cadets": {
        "Time": false,
        "Meetings Held": false,
        "Infected Sectors": false,
        "Infected Cadets": false,
        "Healthy Sectors": false,
        "Healthy Cadets": false
      }
    },
    variables: ["Time", "Meetings Held", "Infected Sectors", "Infected Cadets", "Healthy Sectors", "Healthy Cadets"],
    component: LinePlot,
  },
  scatter: {
    label: 'Scatter Plot',
    allowedMatrix: {
      "Time":              { "Time": false, "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": true, "Healthy Sectors": true, "Healthy Cadets": true },
      "Meetings Held":     { "Time": true,  "Meetings Held": false, "Infected Sectors": true,  "Infected Cadets": true, "Healthy Sectors": true, "Healthy Cadets": true },
      "Infected Sectors":  { "Time": true,  "Meetings Held": true,  "Infected Sectors": false, "Infected Cadets": true, "Healthy Sectors": false, "Healthy Cadets": true },
      "Infected Cadets":   { "Time": true,  "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": false, "Healthy Sectors": true, "Healthy Cadets": false },
      "Healthy Sectors":   { "Time": true,  "Meetings Held": true,  "Infected Sectors": false, "Infected Cadets": true, "Healthy Sectors": false, "Healthy Cadets": true },
      "Healthy Cadets":    { "Time": true,  "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": false, "Healthy Sectors": true, "Healthy Cadets": false },
    },
    variables: ["Time", "Meetings Held", "Infected Sectors", "Infected Cadets", "Healthy Sectors", "Healthy Cadets"],
    component: ScatterPlot,
  },
  bar: {
    label: 'Bar Plot',
    allowedMatrix: {
      "Time":              { "Time": false, "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": true, "Healthy Sectors": true, "Healthy Cadets": true },
      "Meetings Held":     { "Time": false, "Meetings Held": false, "Infected Sectors": true,  "Infected Cadets": true, "Healthy Sectors": true, "Healthy Cadets": true },
      "Infected Sectors":  { "Time": false, "Meetings Held": true,  "Infected Sectors": false, "Infected Cadets": true, "Healthy Sectors": false, "Healthy Cadets": true },
      "Infected Cadets":   { "Time": false, "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": false, "Healthy Sectors": true, "Healthy Cadets": false },
      "Healthy Sectors":   { "Time": false, "Meetings Held": true,  "Infected Sectors": false, "Infected Cadets": true, "Healthy Sectors": false, "Healthy Cadets": true },
      "Healthy Cadets":    { "Time": false, "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": false, "Healthy Sectors": true, "Healthy Cadets": false },
    },
    variables: ["Time", "Meetings Held", "Infected Sectors", "Infected Cadets", "Healthy Sectors", "Healthy Cadets"],
    component: BarPlot,
  },
  histogram: {
    label: 'Histogram Plot',
    allowedMatrix: {
      "Time":              { "Frequency": false },
      "Meetings Held":     { "Frequency": false },
      "Infected Sectors":  { "Frequency": true },
      "Infected Cadets":   { "Frequency": true },
    },
    variables: ["Infected Sectors", "Infected Cadets"],
    yVariable: "Frequency",
    component: HistogramPlot,
    notes: {
      "Infected Sectors": "Adapt to Infected Sector Status, each sector is numbered on the x-axis",
      "Infected Cadets": "Adapt to Infected Cadet Status, each cadet is numbered on the x-axis"
    }
  },
  pie: {
    label: 'Pie Plot',
    component: PiePlot,
    // No variables or allowedMatrix needed; PiePlot handles its own variable selection
  },
  // Add more plot types here as needed
}; 