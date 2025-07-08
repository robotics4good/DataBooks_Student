import React from 'react';
import styles from './PlotComponent.module.css';
import { usePlotState } from './usePlotState';
import { filterData } from './plotUtils';
import PlotControls from './PlotControls';

const PlotComponent = ({ plotLabel, theme, data, logAction }) => {
  // Use custom hook for state management
  const {
    plotType,
    xVars,
    yVars,
    personFilter,
    allowedMatrix,
    variables,
    PlotRenderer,
    handlePlotTypeChange,
    handleXVariableToggle,
    handleYVariableToggle,
    handleHistogramXVariableToggle,
    handlePieVariableSelect,
    handlePersonFilterToggle,
    onSelectAllDevices,
    onDeselectAllDevices,
  } = usePlotState(plotLabel, logAction);

  // Filter data for the selected variables and person filter
  const filteredData = filterData(data, xVars, yVars, personFilter);

  return (
    <div className={styles.plotContainer}>
      {/* Render the actual plot */}
      <div className={styles.plotRenderer}>
        {plotType === 'pie' ? (
          <PlotRenderer theme={theme} logAction={logAction} />
        ) : (
          <PlotRenderer data={data} filteredData={filteredData} theme={theme} />
        )}
      </div>

      {/* Render plot controls */}
      <PlotControls
        plotType={plotType}
        variables={variables}
        xVars={xVars}
        yVars={yVars}
        personFilter={personFilter}
        allowedMatrix={allowedMatrix}
        plotLabel={plotLabel}
        onPlotTypeChange={handlePlotTypeChange}
        onXVariableToggle={handleXVariableToggle}
        onYVariableToggle={handleYVariableToggle}
        onHistogramXVariableToggle={handleHistogramXVariableToggle}
        onPieVariableSelect={handlePieVariableSelect}
        onPersonFilterToggle={handlePersonFilterToggle}
        onSelectAllDevices={onSelectAllDevices}
        onDeselectAllDevices={onDeselectAllDevices}
      />
    </div>
  );
};

export default PlotComponent; 