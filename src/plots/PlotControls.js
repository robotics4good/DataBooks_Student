// PlotControls.js - Component for plot control UI
import React from 'react';
import styles from './PlotComponent.module.css';
import { playerNames } from './plotConfigs';
import { isYAllowed, isXAllowed } from './plotUtils';
import { logAction } from '../services/userActionLogger';
const sectorIds = ["T1","T2","T3","T4","T5","T6"];

// Helper: check if a variable has any valid pairings
function hasValidPair(allowedMatrix, varName, isX, variables) {
  if (!allowedMatrix || !variables) return true;
  if (isX) {
    // For X, check if there is any Y (not itself) where allowedMatrix[X][Y] is true
    return variables.some(y => y !== varName && allowedMatrix[varName] && allowedMatrix[varName][y]);
  } else {
    // For Y, check if there is any X (not itself) where allowedMatrix[X][varName] is true
    return variables.some(x => x !== varName && allowedMatrix[x] && allowedMatrix[x][varName]);
  }
}

const PlotControls = ({
  plotType,
  variables,
  xVars,
  yVars,
  personFilter,
  sectorFilter, // new
  allowedMatrix,
  plotLabel,
  onPlotTypeChange,
  onXVariableToggle,
  onYVariableToggle,
  onHistogramXVariableToggle,
  onPieVariableSelect,
  onPersonFilterToggle,
  onSectorFilterToggle, // new
  onSelectAllDevices,
  onDeselectAllDevices,
  onSelectAllSectors,
  onDeselectAllSectors,
  rawData, // <-- add rawData prop to get current ESP data
  allInfectedCadets,
  allHealthyCadets,
  allInfectedSectors,
  allHealthySectors
}) => {
  // Force variables to always include all valid line plot variables if plotType is 'line'
  let effectiveVariables = variables;
  if (plotType === 'line') {
    effectiveVariables = [
      'Time',
      'Meetings Held',
      'Infected Sectors',
      'Infected Cadets',
      'Healthy Sectors',
      'Healthy Cadets'
    ];
  }
  // Use persistent sets for filter options
  // Only show cadet device IDs in the cadet filter (exclude sector IDs)
  const presentCadetIds = React.useMemo(() => Array.from(new Set(
    (rawData || [])
      .map(d => d.device_id)
      .filter(id => !sectorIds.includes(id))
  )), [rawData]);
  const presentSectorIds = React.useMemo(() => sectorIds.slice(), []);
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

  // Compute latest infection status for each sector from rawData (always use latest record per sector)
  const latestSectorStatus = React.useMemo(() => {
    const status = {};
    if (rawData && Array.isArray(rawData)) {
      // Only consider sector records
      const sectorRecords = rawData.filter(d => sectorIds.includes(d.device_id));
      // For each sector, find the latest record (by localTime)
      sectorIds.forEach(id => {
        const records = sectorRecords.filter(r => r.device_id === id);
        if (records.length > 0) {
          // Find the record with the max localTime
          const latest = records.reduce((a, b) => (a.localTime > b.localTime ? a : b));
          status[id] = latest.infection_status;
        }
      });
    }
    return status;
  }, [rawData]);

  // Dynamically filter sector IDs for filter options based on current status
  let filteredSectorIds = presentSectorIds;
  if (xVars.concat(yVars).includes('Infected Sectors')) {
    filteredSectorIds = presentSectorIds.filter(id => latestSectorStatus[id] === 1);
  } else if (xVars.concat(yVars).includes('Healthy Sectors')) {
    filteredSectorIds = presentSectorIds.filter(id => latestSectorStatus[id] === 0);
  }
  // Ensure sectorFilter is always defined and only includes present IDs
  const safeSectorFilter = React.useMemo(() => {
    const base = sectorFilter || {};
    const filtered = {};
    filteredSectorIds.forEach(name => { filtered[name] = base[name] || false; });
    return filtered;
  }, [sectorFilter, filteredSectorIds]);
  // Show cadet filter only if relevant variable is selected
  const cadetRelevantVars = ["Infected Cadets", "Healthy Cadets"];
  const showCadetFilter = xVars.concat(yVars).some(v => cadetRelevantVars.includes(v));
  // Show sector filter only if relevant variable is selected
  const sectorRelevantVars = ["Infected Sectors", "Healthy Sectors"];
  const showSectorFilter = xVars.concat(yVars).some(v => sectorRelevantVars.includes(v));

  // Device filter is removed per user requirements

  // Ensure all available cadet and sector filter options are selected by default
  React.useEffect(() => {
    if (showCadetFilter && filteredCadetIds.length > 0) {
      onSelectAllDevices();
    }
    if (showSectorFilter && filteredSectorIds.length > 0) {
      onSelectAllSectors();
    }
    // Only run when the available options change
    // eslint-disable-next-line
  }, [showCadetFilter, filteredCadetIds.join(','), showSectorFilter, filteredSectorIds.join(',')]);

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
                  const disabled = (yVars.length > 0 && !isXAllowed(allowedMatrix, yVars[0], v)) || noValidY;
                  return (
                    <label 
                      key={v} 
                      className={`${styles.variableLabel} ${(disabled) ? styles.disabled : ''}`}
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
                  let disabled = false;
                  if (xVars.length > 0) {
                    disabled = !isYAllowed(allowedMatrix, xVars[0], v);
                  } else {
                    disabled = !hasValidPair(allowedMatrix, v, false, effectiveVariables);
                  }
                  return (
                    <label 
                      key={v} 
                      className={`${styles.variableLabel} ${(disabled) ? styles.disabled : ''}`}
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

        {/* Histogram special case */}
        {plotType === 'histogram' && (
          <>
            <div className={styles.variableOptionsLabel}>Variable Options:</div>
            <div className={styles.variableOptionsContainer}>
              {variables.map(v => (
                <label 
                  key={v} 
                  className={`${styles.variableLabel} ${yVars.length > 0 && !isXAllowed(allowedMatrix, yVars[0], v) ? styles.disabled : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={xVars.includes(v)}
                    disabled={yVars.length > 0 && !isXAllowed(allowedMatrix, yVars[0], v)}
                    onChange={() => {
                      logAction({ type: 'plot_interaction', action: 'histogram_x_variable_toggled', details: { plotLabel, variable: v, selected: !xVars.includes(v) } });
                      onHistogramXVariableToggle(v);
                    }}
                    className={styles.variableCheckbox}
                  />
                  {v}
                </label>
              ))}
            </div>
            <div className={styles.histogramYLabel}>Y: Frequency</div>
          </>
        )}

        {/* Pie special case */}
        {plotType === 'pie' && (
          <>
            <div className={styles.variableOptionsLabel}>Variable Options:</div>
            <div className={styles.variableOptionsContainer}>
              {['Infected Sectors', 'Infected Cadets'].map(v => (
                <label key={v} className={styles.variableLabel}>
                  <input
                    type="radio"
                    name={`pie-var-${plotLabel}`}
                    checked={xVars.includes(v)}
                    onChange={() => {
                      logAction({ type: 'plot_interaction', action: 'pie_variable_selected', details: { plotLabel, variable: v } });
                      onPieVariableSelect(v);
                    }}
                    className={styles.variableRadio}
                  />
                  {v}
                </label>
              ))}
            </div>
          </>
        )}

        {/* Device filter (always at the bottom of options) */}
        {showCadetFilter && (
          <div className={styles.deviceFilterContainer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div className={styles.deviceFilterLabel}>Cadet Filter:</div>
              <button type="button" onClick={() => { logAction({ type: 'plot_interaction', action: 'cadet_filter_select_all', details: { plotLabel } }); onSelectAllDevices(); }} style={{ fontSize: '0.95rem', padding: '0.2rem 0.7rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--cream-panel)', cursor: 'pointer' }}>Select All</button>
              <button type="button" onClick={() => { logAction({ type: 'plot_interaction', action: 'cadet_filter_deselect_all', details: { plotLabel } }); onDeselectAllDevices(); }} style={{ fontSize: '0.95rem', padding: '0.2rem 0.7rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--cream-panel)', cursor: 'pointer' }}>Deselect All</button>
            </div>
            <div className={styles.deviceFilterOptions}>
              {filteredCadetIds.length === 0 ? (
                <div className={styles.deviceFilterEmpty}>
                  No devices detected
                </div>
              ) : (
                filteredCadetIds.map(name => (
                  <label key={name} className={styles.deviceFilterOption}>
                    <input
                      type="checkbox"
                      checked={!!personFilter[name]}
                      onChange={() => {
                        logAction({ type: 'plot_interaction', action: 'cadet_filter_toggled', details: { plotLabel, cadet: name, selected: !personFilter[name] } });
                        onPersonFilterToggle(name);
                      }}
                      className={styles.deviceFilterCheckbox}
                    />
                    {name}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
        {showSectorFilter && (
          <div className={styles.deviceFilterContainer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div className={styles.deviceFilterLabel}>Sector Filter:</div>
              <button type="button" onClick={() => { logAction({ type: 'plot_interaction', action: 'sector_filter_select_all', details: { plotLabel } }); onSelectAllSectors(); }} style={{ fontSize: '0.95rem', padding: '0.2rem 0.7rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--cream-panel)', cursor: 'pointer' }}>Select All</button>
              <button type="button" onClick={() => { logAction({ type: 'plot_interaction', action: 'sector_filter_deselect_all', details: { plotLabel } }); onDeselectAllSectors(); }} style={{ fontSize: '0.95rem', padding: '0.2rem 0.7rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--cream-panel)', cursor: 'pointer' }}>Deselect All</button>
            </div>
            <div className={styles.deviceFilterOptions}>
              {filteredSectorIds.length === 0 ? (
                <div className={styles.deviceFilterEmpty}>
                  No sectors detected
                </div>
              ) : (
                filteredSectorIds.map(name => (
                  <label key={name} className={styles.deviceFilterOption}>
                    <input
                      type="checkbox"
                      checked={!!sectorFilter[name]}
                      onChange={() => {
                        logAction({ type: 'plot_interaction', action: 'sector_filter_toggled', details: { plotLabel, sector: name, selected: !sectorFilter[name] } });
                        onSectorFilterToggle(name);
                      }}
                      className={styles.deviceFilterCheckbox}
                    />
                    {name}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlotControls;