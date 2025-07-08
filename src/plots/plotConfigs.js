// plotConfigs.js - Configuration data for different plot types
import LinePlot from './LinePlot';
import ScatterPlot from './ScatterPlot';
import BarPlot from './BarPlot';
import HistogramPlot from './HistogramPlot';
import PiePlot from './PiePlot';

// Player names constant
export const playerNames = [
  "Atlas", "Blaze", "Comet", "Echo", "Falcon", "Gem", "Harbor", "Indigo", "Jade", "Knight", "Luna", "Maverick", "Nova", "Orion", "Phoenix", "Quasar", "Rune", "Stellar", "Vega"
];

// Modular config for each plot type
export const plotConfigs = {
  line: {
    label: 'Line Plot',
    allowedMatrix: {
      "Time": {
        "Time": false,
        "Tasks Completed": true,
        "Meetings Held": true,
        "Infected Sectors": true,
        "Infected Cadets": true
      },
      "Tasks Completed": {
        "Time": true,
        "Tasks Completed": false,
        "Meetings Held": false,
        "Infected Sectors": true,
        "Infected Cadets": true
      },
      "Meetings Held": {
        "Time": true,
        "Tasks Completed": true,
        "Meetings Held": false,
        "Infected Sectors": true,
        "Infected Cadets": true
      },
      "Infected Sectors": {
        "Time": false,
        "Tasks Completed": false,
        "Meetings Held": false,
        "Infected Sectors": false,
        "Infected Cadets": false
      },
      "Infected Cadets": {
        "Time": false,
        "Tasks Completed": false,
        "Meetings Held": false,
        "Infected Sectors": false,
        "Infected Cadets": false
      }
    },
    variables: ["Time", "Tasks Completed", "Meetings Held", "Infected Sectors", "Infected Cadets"],
    component: LinePlot,
  },
  scatter: {
    label: 'Scatter Plot',
    allowedMatrix: {
      "Time":              { "Time": false, "Tasks Completed": true,  "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": true },
      "Tasks Completed":   { "Time": true,  "Tasks Completed": false, "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": true },
      "Meetings Held":     { "Time": true,  "Tasks Completed": true,  "Meetings Held": false, "Infected Sectors": true,  "Infected Cadets": true },
      "Infected Sectors":  { "Time": true,  "Tasks Completed": true,  "Meetings Held": true,  "Infected Sectors": false, "Infected Cadets": true },
      "Infected Cadets":   { "Time": true,  "Tasks Completed": true,  "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": false },
    },
    variables: ["Time", "Tasks Completed", "Meetings Held", "Infected Sectors", "Infected Cadets"],
    component: ScatterPlot,
  },
  bar: {
    label: 'Bar Plot',
    allowedMatrix: {
      "Time":              { "Time": false, "Tasks Completed": true,  "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": true },
      "Tasks Completed":   { "Time": false, "Tasks Completed": false, "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": true },
      "Meetings Held":     { "Time": false, "Tasks Completed": true,  "Meetings Held": false, "Infected Sectors": true,  "Infected Cadets": true },
      "Infected Sectors":  { "Time": false, "Tasks Completed": true,  "Meetings Held": true,  "Infected Sectors": false, "Infected Cadets": true },
      "Infected Cadets":   { "Time": false, "Tasks Completed": true,  "Meetings Held": true,  "Infected Sectors": true,  "Infected Cadets": false },
    },
    variables: ["Time", "Tasks Completed", "Meetings Held", "Infected Sectors", "Infected Cadets"],
    component: BarPlot,
  },
  histogram: {
    label: 'Histogram Plot',
    allowedMatrix: {
      "Time":              { "Frequency": false },
      "Tasks Completed":   { "Frequency": false },
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