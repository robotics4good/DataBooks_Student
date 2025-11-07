// usePlotState.js - Custom hook for managing plot component state
import { useState, useEffect } from 'react';
import { playerNames, plotConfigs } from './plotConfigs';

const sectorIds = ["T1","T2","T3","T4","T5","T6"];

/**
 * Custom hook for managing plot component state
 * @param {string} plotLabel - Label for the plot (for logging)
 * @param {Function} logAction - Logging function
 * @returns {Object} - Plot state and state management functions
 */
export function usePlotState(plotLabel, logAction, data = []) {
  // Core plot state
  const [plotType, setPlotType] = useState('line');
  const [xVars, setXVars] = useState([]);
  const [yVars, setYVars] = useState([]);

  // Dynamically generate filter options from unique device_ids in the data
  const [cadetSectorFilter, setCadetSectorFilter] = useState({});

  useEffect(() => {
    // Exclude QR and CR from dynamic filter options
    const ids = Array.from(new Set((data || []).map(d => d.device_id))).filter(id => id !== 'QR' && id !== 'CR').sort();
    setCadetSectorFilter(prev => {
      // Only update if the set of IDs has changed
      const prevIds = Object.keys(prev).sort();
      const same = ids.length === prevIds.length && ids.every((id, i) => id === prevIds[i]);
      if (same) return prev;
      const updated = {};
      ids.forEach(id => { updated[id] = true; });
      return updated;
    });
  }, [data]);

  // Filter states
  // Exclude QR and CR from filter options
  const filteredPlayerNames = playerNames.filter(name => name !== 'QR' && name !== 'CR');
  const filteredSectorIds = sectorIds.filter(id => id !== 'QR' && id !== 'CR');
  const [cadetFilter, setCadetFilter] = useState(filteredPlayerNames.reduce((acc, name) => ({ ...acc, [name]: true }), {}));
  const [sectorFilter, setSectorFilter] = useState(() => {
    const obj = {};
    filteredSectorIds.forEach(id => { obj[id] = true; });
    return obj;
  });
  const [xVarFilter, setXVarFilter] = useState({});
  const [yVarFilter, setYVarFilter] = useState({});

  // Get config for current plot type
  const config = plotConfigs[plotType];
  const allowedMatrix = config.allowedMatrix;
  const variables = config.variables;
  const PlotRenderer = config.component;

  // Initialize filters when variables change
  useEffect(() => {
    if (variables) {
      setXVarFilter(variables);
      setYVarFilter(variables);
    }
  }, [variables]);

  // Plot type change handler
  const handlePlotTypeChange = (newPlotType) => {
    setPlotType(newPlotType);
    setXVars([]);
    setYVars([]);
    if (logAction) {
      logAction(`${plotLabel} type changed to: ${newPlotType}`);
    }
  };

  // X variable toggle handler (single-select)
  const handleXVariableToggle = (variable) => {
    const isSelected = xVars.includes(variable);
    const newXVars = isSelected ? [] : [variable];
    setXVars(newXVars);
    if (logAction) {
      logAction(`${plotLabel} x variable toggled: ${variable}`);
    }
  };

  // Y variable toggle handler (single-select)
  const handleYVariableToggle = (variable) => {
    const isSelected = yVars.includes(variable);
    const newYVars = isSelected ? [] : [variable];
    setYVars(newYVars);
    if (logAction) {
      logAction(`${plotLabel} y variable toggled: ${variable}`);
    }
  };

  // Histogram X variable toggle handler
  const handleHistogramXVariableToggle = (variable) => {
    const isSelected = xVars.includes(variable);
    const newXVars = isSelected
      ? xVars.filter(x => x !== variable)
      : [...xVars, variable];

    setXVars(newXVars);
    if (logAction) {
      logAction(`${plotLabel} histogram x variable toggled: ${variable}`);
    }
  };

  // Pie variable selection handler
  const handlePieVariableSelect = (variable) => {
    setXVars([variable]); // Pie plots only allow one variable
    if (logAction) {
      logAction(`${plotLabel} variable set to: ${variable}`);
    }
  };

  // Cadet filter toggle handler
  const handleCadetFilterToggle = (name) => {
    const newValue = !cadetFilter[name];
    setCadetFilter(prev => ({ ...prev, [name]: newValue }));
    if (logAction) {
      logAction(`${plotLabel} cadet filter toggled: ${name} ${newValue ? 'selected' : 'deselected'}`);
    }
  };

  // Cadet filter select all/deselect all handlers
  const onSelectAllCadets = () => {
    setCadetFilter(playerNames.reduce((acc, name) => ({ ...acc, [name]: true }), {}));
    if (logAction) {
      logAction(`${plotLabel} cadet filter: select all`);
    }
  };
  const onDeselectAllCadets = () => {
    setCadetFilter(playerNames.reduce((acc, name) => ({ ...acc, [name]: false }), {}));
    if (logAction) {
      logAction(`${plotLabel} cadet filter: deselect all`);
    }
  };

  // Sector filter toggle handler
  const handleSectorFilterToggle = (name) => {
    const newValue = !sectorFilter[name];
    setSectorFilter(prev => ({ ...prev, [name]: newValue }));
    if (logAction) {
      logAction(`${plotLabel} sector filter toggled: ${name} ${newValue ? 'selected' : 'deselected'}`);
    }
  };
  // Sector filter select all/deselect all handlers
  const onSelectAllSectors = () => {
    setSectorFilter(sectorIds.reduce((acc, name) => ({ ...acc, [name]: true }), {}));
    if (logAction) {
      logAction(`${plotLabel} sector filter: select all`);
    }
  };
  const onDeselectAllSectors = () => {
    setSectorFilter(sectorIds.reduce((acc, name) => ({ ...acc, [name]: false }), {}));
    if (logAction) {
      logAction(`${plotLabel} sector filter: deselect all`);
    }
  };

  return {
    // State
    plotType,
    xVars,
    yVars,
    cadetFilter,
    sectorFilter,
    xVarFilter,
    yVarFilter,

    // Config
    config,
    allowedMatrix,
    variables,
    PlotRenderer,

    // Handlers
    handlePlotTypeChange,
    handleXVariableToggle,
    handleYVariableToggle,
    handleHistogramXVariableToggle,
    handlePieVariableSelect,
    handleCadetFilterToggle,
    handleSectorFilterToggle,
    onSelectAllCadets,
    onDeselectAllCadets,
    onSelectAllSectors,
    onDeselectAllSectors,
  };
} 