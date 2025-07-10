import React from 'react';
import styles from './PlotComponent.module.css';
import { usePlotState } from './usePlotState';
import { filterData } from './plotUtils';
import PlotControls from './PlotControls';

const PlotComponent = ({ plotLabel, theme, data, logAction, rawData }) => {
  // DEBUG: Log data and rawData
  console.log('PlotComponent data:', data);
  console.log('PlotComponent rawData:', rawData);
  // Use custom hook for state management
  const {
    plotType,
    xVars,
    yVars,
    cadetFilter,
    allowedMatrix,
    variables,
    PlotRenderer,
    handlePlotTypeChange,
    handleXVariableToggle,
    handleYVariableToggle,
    handleHistogramXVariableToggle,
    handlePieVariableSelect,
    handleCadetFilterToggle,
    onSelectAllCadets,
    onDeselectAllCadets,
  } = usePlotState(plotLabel, logAction, data);

  // Filter data for the selected variables and person filter
  const filteredData = filterData(data, xVars, yVars, cadetFilter);
  // DEBUG: Log xVars, yVars, plotType, and filteredData
  console.log('[PlotComponent] xVars:', xVars, 'yVars:', yVars, 'plotType:', plotType);
  console.log('[PlotComponent] filteredData:', filteredData);

  // Professional, robust empty data check
  const hasData = Array.isArray(filteredData) && filteredData.some(series => Array.isArray(series.data) && series.data.length > 0);

  // Failsafe: log the actual PlotRenderer being used
  console.log('[PlotComponent] PlotRenderer:', PlotRenderer && PlotRenderer.name ? PlotRenderer.name : PlotRenderer);
  console.log('[PlotComponent] About to render PlotRenderer:', PlotRenderer, typeof PlotRenderer);

  return (
    <div className={styles.plotContainer}>
      {/* Always reserve space for the plot or the no-data message */}
      <div className={styles.plotRenderer}>
        {hasData ? (
          plotType === 'pie' ? (
            <PlotRenderer theme={theme} logAction={logAction} />
          ) : plotType === 'line' ? (
            <PlotRenderer data={data} xVar={xVars[0]} yVar={yVars[0]} theme={theme} />
          ) : (
            <PlotRenderer data={filteredData} theme={theme} />
          )
        ) : (
          <div style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: '1.1rem',
            color: '#666',
            background: '#f8f3ea',
            borderRadius: 8,
            border: '1.5px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
          }}>
            No data to display currently
          </div>
        )}
      </div>
      {/* Plot controls always below */}
      <PlotControls
        plotType={plotType}
        variables={variables}
        xVars={xVars}
        yVars={yVars}
        personFilter={cadetFilter}
        allowedMatrix={allowedMatrix}
        plotLabel={plotLabel}
        onPlotTypeChange={handlePlotTypeChange}
        onXVariableToggle={handleXVariableToggle}
        onYVariableToggle={handleYVariableToggle}
        onHistogramXVariableToggle={handleHistogramXVariableToggle}
        onPieVariableSelect={handlePieVariableSelect}
        onPersonFilterToggle={handleCadetFilterToggle}
        onSelectAllDevices={onSelectAllCadets}
        onDeselectAllDevices={onDeselectAllCadets}
        rawData={data}
      />
    </div>
  );
};

export default PlotComponent; 