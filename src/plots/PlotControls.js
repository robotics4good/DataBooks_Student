// PlotControls.js - Component for plot control UI
import React from 'react';
import styles from './PlotComponent.module.css';
import { playerNames } from './plotConfigs';
import { isYAllowed, isXAllowed } from './plotUtils';

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
  allowedMatrix,
  plotLabel,
  onPlotTypeChange,
  onXVariableToggle,
  onYVariableToggle,
  onHistogramXVariableToggle,
  onPieVariableSelect,
  onPersonFilterToggle,
  onSelectAllDevices,
  onDeselectAllDevices,
}) => {
  // Ensure personFilter is always defined
  const safePersonFilter = personFilter || playerNames.reduce((acc, name) => ({ ...acc, [name]: false }), {});

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
            onChange={(e) => onPlotTypeChange(e.target.value)}
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
                        onChange={() => onXVariableToggle(v)}
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
                        onChange={() => onYVariableToggle(v)}
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
                    onChange={() => onHistogramXVariableToggle(v)}
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
                    onChange={() => onPieVariableSelect(v)}
                    className={styles.variableRadio}
                  />
                  {v}
                </label>
              ))}
            </div>
          </>
        )}

        {/* Device filter (always at the bottom of options) */}
        <div className={styles.deviceFilterContainer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div className={styles.deviceFilterLabel}>Cadet Filter:</div>
            <button type="button" onClick={onSelectAllDevices} style={{ fontSize: '0.95rem', padding: '0.2rem 0.7rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--cream-panel)', cursor: 'pointer' }}>Select All</button>
            <button type="button" onClick={onDeselectAllDevices} style={{ fontSize: '0.95rem', padding: '0.2rem 0.7rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'var(--cream-panel)', cursor: 'pointer' }}>Deselect All</button>
          </div>
          <div className={styles.deviceFilterOptions}>
            {playerNames.map(name => (
              <label key={name} className={styles.deviceFilterOption}>
                <input
                  type="checkbox"
                  checked={!!safePersonFilter[name]}
                  onChange={() => onPersonFilterToggle(name)}
                  className={styles.deviceFilterCheckbox}
                />
                {name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlotControls; 