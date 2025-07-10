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
  onSelectAllSectors, // new
  onDeselectAllSectors, // new
  rawData // <-- add rawData prop to get current ESP data
}) => {
  // Dynamically determine present cadet IDs from ESP data (all unique device_ids)
  const presentCadetIds = Array.from(new Set(
    (rawData || [])
      .map(d => d.device_id)
  ));
  const presentSectorIds = Array.from(new Set(
    (rawData || [])
      .map(d => d.device_id)
      .filter(id => sectorIds.includes(id))
  ));
  // Ensure personFilter is always defined
  const safePersonFilter = personFilter || presentCadetIds.reduce((acc, name) => ({ ...acc, [name]: false }), {});
  // Ensure sectorFilter is always defined
  const safeSectorFilter = sectorFilter || presentSectorIds.reduce((acc, name) => ({ ...acc, [name]: false }), {});
  // Show cadet filter only if relevant variable is selected
  const cadetRelevantVars = ["Infected Cadets", "Healthy Cadets"];
  const showCadetFilter = xVars.concat(yVars).some(v => cadetRelevantVars.includes(v));
  // Show sector filter only if relevant variable is selected
  const sectorRelevantVars = ["Infected Sectors", "Healthy Sectors"];
  const showSectorFilter = xVars.concat(yVars).some(v => sectorRelevantVars.includes(v));

  // Device filter is removed per user requirements

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
                {variables && variables.map(v => {
                  const noValidY = !hasValidPair(allowedMatrix, v, true, variables);
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
                {variables && variables.map(v => {
                  const noValidX = !hasValidPair(allowedMatrix, v, false, variables);
                  const disabled = (xVars.length > 0 && !isYAllowed(allowedMatrix, xVars[0], v)) || noValidX;
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
              {presentCadetIds.length === 0 ? (
                <div className={styles.deviceFilterEmpty}>
                  No devices detected
                </div>
              ) : (
                presentCadetIds.map(name => (
                  <label key={name} className={styles.deviceFilterOption}>
                    <input
                      type="checkbox"
                      checked={!!safePersonFilter[name]}
                      onChange={() => {
                        logAction({ type: 'plot_interaction', action: 'cadet_filter_toggled', details: { plotLabel, cadet: name, selected: !safePersonFilter[name] } });
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
              {presentSectorIds.length === 0 ? (
                <div className={styles.deviceFilterEmpty}>
                  No sectors detected
                </div>
              ) : (
                presentSectorIds.map(name => (
                  <label key={name} className={styles.deviceFilterOption}>
                    <input
                      type="checkbox"
                      checked={!!safeSectorFilter[name]}
                      onChange={() => {
                        logAction({ type: 'plot_interaction', action: 'sector_filter_toggled', details: { plotLabel, sector: name, selected: !safeSectorFilter[name] } });
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