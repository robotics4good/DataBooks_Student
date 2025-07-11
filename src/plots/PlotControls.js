// PlotControls.js - Component for plot control UI
import React from 'react';
import styles from './PlotComponent.module.css';
import { plotConfigs, sectorIds, playerNames } from './plotConfigs';
import { getVariableValue, applyFilters, calculateStats, getUniqueValues, initializePersonFilter, initializeSectorFilter, transformData } from './plotUtils';
import { logAction } from '../services/userActionLogger';

// Add isXAllowed and isYAllowed utility functions
const isXAllowed = (xVar, allowedMatrix) => allowedMatrix && allowedMatrix[xVar];
const isYAllowed = (xVar, yVar, allowedMatrix) => allowedMatrix && allowedMatrix[xVar] && allowedMatrix[xVar][yVar] === true;

// Helper: check if a variable has any valid pairings
function hasValidPair(allowedMatrix, varName, isX, variables) {
  if (!allowedMatrix || !variables) return true;
  if (isX) {
    // For X, check if there is any Y (not itself) where allowedMatrix[X][Y] is true
    return variables.some(y => y !== varName && allowedMatrix[varName] && allowedMatrix[varName][y]);
  } else {
    // For Y, check if there is any X (not itself) where allowedMatrix[x][varName] is true
    return variables.some(x => x !== varName && allowedMatrix[x] && allowedMatrix[x][varName]);
  }
}

const PlotControls = ({
  plotType,
  variables,
  xVars,
  yVars,
  personFilter,
  sectorFilter,
  allowedMatrix,
  plotLabel,
  onPlotTypeChange,
  onXVariableToggle,
  onYVariableToggle,
  onHistogramXVariableToggle,
  onPieVariableSelect,
  onPersonFilterToggle,
  onSectorFilterToggle,
  onSelectAllDevices,
  onDeselectAllDevices,
  onSelectAllSectors,
  onDeselectAllSectors,
  rawData,
  allInfectedCadets,
  allHealthyCadets,
  allInfectedSectors,
  allHealthySectors
}) => {
  // Use comprehensive variables from plotConfigs
  const effectiveVariables = variables || Object.keys(plotConfigs.espVariables);
  
  // Use persistent sets for filter options
  const presentCadetIds = React.useMemo(() => Array.from(new Set(
    (rawData || [])
      .map(d => d.device_id)
      .filter(id => !sectorIds.includes(id))
  )), [rawData]);

  // Fix: Only show sector IDs that are present in the data
  const presentSectorIds = React.useMemo(() => Array.from(new Set(
    (rawData || [])
      .map(d => d.device_id)
      .filter(id => sectorIds.includes(id))
  )), [rawData]);
  
  // For Infected Cadets, only show cadets in allInfectedCadets
  const infectedCadetIds = React.useMemo(() => {
    if (!xVars.concat(yVars).includes('Infected Cadets')) return presentCadetIds;
    return Array.from(allInfectedCadets || []);
  }, [allInfectedCadets, presentCadetIds, xVars, yVars]);
  
  // For Healthy Cadets, only show cadets in allHealthyCadets
  const healthyCadetIds = React.useMemo(() => {
    if (!xVars.concat(yVars).includes('Healthy Cadets')) return presentCadetIds;
    return Array.from(allHealthyCadets || []);
  }, [allHealthyCadets, presentCadetIds, xVars, yVars]);
  
  // For Infected Sectors, only show sectors in allInfectedSectors
  const infectedSectorIds = React.useMemo(() => {
    if (!xVars.concat(yVars).includes('Infected Sectors')) return presentSectorIds;
    return Array.from(allInfectedSectors || []);
  }, [allInfectedSectors, presentSectorIds, xVars, yVars]);
  
  // For Healthy Sectors, only show sectors in allHealthySectors
  const healthySectorIds = React.useMemo(() => {
    if (!xVars.concat(yVars).includes('Healthy Sectors')) return presentSectorIds;
    return Array.from(allHealthySectors || []);
  }, [allHealthySectors, presentSectorIds, xVars, yVars]);
  
  // Use filtered cadet IDs for filter
  let filteredCadetIds = presentCadetIds;
  if (xVars.concat(yVars).includes('Infected Cadets')) filteredCadetIds = infectedCadetIds;
  else if (xVars.concat(yVars).includes('Healthy Cadets')) filteredCadetIds = healthyCadetIds;

  // Compute latest infection status for each sector from rawData
  const latestSectorStatus = React.useMemo(() => {
    const status = {};
    if (rawData && Array.isArray(rawData)) {
      const sectorRecords = rawData.filter(d => sectorIds.includes(d.device_id));
      sectorIds.forEach(id => {
        const records = sectorRecords.filter(r => r.device_id === id);
        if (records.length > 0) {
          const latest = records.reduce((a, b) => (a.localTime > b.localTime ? a : b));
          status[id] = latest.infection_status;
        }
      });
    }
    return status;
  }, [rawData]);

  // Use filtered sector IDs for filter (mirror cadet logic)
  let filteredSectorIds = presentSectorIds;
  if (xVars.concat(yVars).includes('Infected Sectors')) filteredSectorIds = infectedSectorIds;
  else if (xVars.concat(yVars).includes('Healthy Sectors')) filteredSectorIds = healthySectorIds;
  
  // Always show all present cadet and sector IDs for filters, regardless of variable selection
  const standardizedCadetIds = presentCadetIds;
  const standardizedSectorIds = presentSectorIds;

  // Show cadet filter only if relevant variable is selected
  const cadetRelevantVars = ["Infected Cadets", "Healthy Cadets"];
  const showCadetFilter = xVars.concat(yVars).some(v => cadetRelevantVars.includes(v));

  // Show sector filter only if relevant variable is selected
  const sectorRelevantVars = ["Infected Sectors", "Healthy Sectors"];
  const showSectorFilter = xVars.concat(yVars).some(v => sectorRelevantVars.includes(v));

  // Ensure all available cadet and sector filter options are selected by default
  React.useEffect(() => {
    if (showCadetFilter && standardizedCadetIds.length > 0) {
      onSelectAllDevices();
    }
    if (showSectorFilter && standardizedSectorIds.length > 0) {
      onSelectAllSectors();
    }
  }, [showCadetFilter, standardizedCadetIds.join(','), showSectorFilter, standardizedSectorIds.join(',')]);

  return (
    <div className={styles.controlsContainer}>
      <div className={styles.optionsArea}>
        <div style={{ fontWeight: 500, fontSize: '1rem', marginBottom: '0.08rem', alignSelf: 'center', color: 'var(--text-dark)', textAlign: 'center', letterSpacing: '0.01em' }}>
          Plot Options
        </div>
        
        {/* Plot type selector */}
        <div className={styles.plotTypeSelector}>
          <select
            value={plotType}
            onChange={(e) => {
              logAction({ type: 'plot_interaction', action: 'type_changed', details: { plotLabel, newType: e.target.value } });
              onPlotTypeChange(e.target.value);
            }}
            className={styles.plotTypeSelect}
          >
            <option value="line">Line Plot</option>
            <option value="scatter">Scatter Plot</option>
            <option value="bar">Bar Plot</option>
            <option value="histogram">Histogram Plot</option>
            <option value="pie">Pie Plot</option>
          </select>
        </div>

        {/* Variable options (X/Y) */}
        {plotType !== 'pie' && plotType !== 'histogram' && (
          <>
            <div className={styles.variableOptionsLabel}>Variable Options:</div>
            <div className={styles.variableOptionsContainer}>
              <div className={styles.variableColumn}>
                <div className={styles.variableColumnLabel}>X:</div>
                {effectiveVariables && effectiveVariables.map(v => {
                  const noValidY = !hasValidPair(allowedMatrix, v, true, effectiveVariables);
                  const disabled = (yVars.length > 0 && !isXAllowed(v, allowedMatrix)) || noValidY;
                  return (
                    <label 
                      key={v} 
                      className={`${styles.variableLabel} ${(disabled) ? styles.disabled : ''}`}
                      title={v}
                    >
                      <input
                        type="checkbox"
                        checked={xVars.includes(v)}
                        disabled={disabled}
                        onChange={() => {
                          logAction({ type: 'plot_interaction', action: 'x_variable_toggled', details: { plotLabel, variable: v, selected: !xVars.includes(v) } });
                          onXVariableToggle(v);
                        }}
                        className={styles.variableCheckbox}
                      />
                      {v}
                    </label>
                  );
                })}
              </div>
              <div className={styles.variableColumn}>
                <div className={styles.variableColumnLabel}>Y:</div>
                {effectiveVariables && effectiveVariables.map(v => {
                  const noValidX = !hasValidPair(allowedMatrix, v, false, effectiveVariables);
                  const disabled = (xVars.length > 0 && !isYAllowed(xVars[0], v, allowedMatrix)) || noValidX;
                  return (
                    <label 
                      key={v} 
                      className={`${styles.variableLabel} ${(disabled) ? styles.disabled : ''}`}
                      title={v}
                    >
                      <input
                        type="checkbox"
                        checked={yVars.includes(v)}
                        disabled={disabled}
                        onChange={() => {
                          logAction({ type: 'plot_interaction', action: 'y_variable_toggled', details: { plotLabel, variable: v, selected: !yVars.includes(v) } });
                          onYVariableToggle(v);
                        }}
                        className={styles.variableCheckbox}
                      />
                      {v}
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Histogram variable selector */}
        {plotType === 'histogram' && (
          <>
            <div className={styles.variableOptionsLabel}>Histogram Variable:</div>
            <div className={styles.variableOptionsContainer}>
              {effectiveVariables && effectiveVariables.map(v => (
                <label 
                  key={v} 
                  className={styles.variableLabel}
                  title={v}
                >
                  <input
                    type="checkbox"
                    checked={xVars.includes(v)}
                    onChange={() => {
                      logAction({ type: 'plot_interaction', action: 'histogram_variable_toggled', details: { plotLabel, variable: v, selected: !xVars.includes(v) } });
                      onHistogramXVariableToggle(v);
                    }}
                    className={styles.variableCheckbox}
                  />
                  {v}
                </label>
              ))}
            </div>
          </>
        )}

        {/* Pie chart variable selector */}
        {plotType === 'pie' && (
          <>
            <div className={styles.variableOptionsLabel}>Pie Chart Variable:</div>
            <div className={styles.variableOptionsContainer}>
              {effectiveVariables && effectiveVariables.map(v => (
                <label 
                  key={v} 
                  className={styles.variableLabel}
                  title={v}
                >
                  <input
                    type="radio"
                    name="pieVariable"
                    checked={xVars.includes(v)}
                    onChange={() => {
                      logAction({ type: 'plot_interaction', action: 'pie_variable_selected', details: { plotLabel, variable: v } });
                      onPieVariableSelect(v);
                    }}
                    className={styles.variableCheckbox}
                  />
                  {v}
                </label>
              ))}
            </div>
          </>
        )}

        {/* Person filter */}
        {showCadetFilter && (
          <>
            <div className={styles.filterLabel}>Cadet Filter:</div>
            <div className={styles.filterContainer}>
              <div className={styles.filterButtons}>
                <button
                  onClick={() => {
                    logAction({ type: 'plot_interaction', action: 'select_all_cadets', details: { plotLabel } });
                    onSelectAllDevices();
                  }}
                  className={styles.filterButton}
                  type="button"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    logAction({ type: 'plot_interaction', action: 'deselect_all_cadets', details: { plotLabel } });
                    onDeselectAllDevices();
                  }}
                  className={styles.filterButton}
                  type="button"
                >
                  Deselect All
                </button>
              </div>
              {standardizedCadetIds.map(name => (
                <label key={name} className={styles.filterLabel}>
                  <input
                    type="checkbox"
                    checked={personFilter[name] || false}
                    onChange={() => {
                      logAction({ type: 'plot_interaction', action: 'person_filter_toggled', details: { plotLabel, person: name, selected: !personFilter[name] } });
                      onPersonFilterToggle(name);
                    }}
                    className={styles.filterCheckbox}
                  />
                  {name}
                </label>
              ))}
            </div>
          </>
        )}

        {/* Sector filter */}
        {showSectorFilter && (
          <>
            <div className={styles.filterLabel}>Sector Filter:</div>
            <div className={styles.filterContainer}>
              <div className={styles.filterButtons}>
                <button
                  onClick={() => {
                    logAction({ type: 'plot_interaction', action: 'select_all_sectors', details: { plotLabel } });
                    onSelectAllSectors();
                  }}
                  className={styles.filterButton}
                  type="button"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    logAction({ type: 'plot_interaction', action: 'deselect_all_sectors', details: { plotLabel } });
                    onDeselectAllSectors();
                  }}
                  className={styles.filterButton}
                  type="button"
                >
                  Deselect All
                </button>
              </div>
              {standardizedSectorIds.map(name => (
                <label key={name} className={styles.filterLabel}>
                  <input
                    type="checkbox"
                    checked={sectorFilter[name] || false}
                    onChange={() => {
                      logAction({ type: 'plot_interaction', action: 'sector_filter_toggled', details: { plotLabel, sector: name, selected: !sectorFilter[name] } });
                      onSectorFilterToggle(name);
                    }}
                    className={styles.filterCheckbox}
                  />
                  {name}
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlotControls;