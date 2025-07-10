import React from 'react';
import styles from './PlotComponent.module.css';
import { usePlotState } from './usePlotState';
import { filterData } from './plotUtils';
import PlotControls from './PlotControls';

const PlotComponent = ({ plotLabel, theme, data, logAction, rawData }) => {
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
  } = usePlotState(plotLabel, logAction);

  // Filter data for the selected variables and person filter
  const filteredData = filterData(data, xVars, yVars, cadetFilter);

  // Professional, robust empty data check
  const hasData = Array.isArray(filteredData) && filteredData.some(series => Array.isArray(series.data) && series.data.length > 0);

  return (
    <div className={styles.plotContainer}>
      {/* Always reserve space for the plot or the no-data message */}
      <div className={styles.plotRenderer}>
        {hasData ? (
          plotType === 'pie' ? (
            <PlotRenderer theme={theme} logAction={logAction} />
          ) : (
            <PlotRenderer data={data} filteredData={filteredData} theme={theme} />
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
        rawData={rawData}
      />
    </div>
  );
};

export default PlotComponent; 