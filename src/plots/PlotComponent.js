// PlotComponent.js
import React, { useEffect, useState } from 'react';
import styles from './PlotComponent.module.css';
import { usePlotState } from './usePlotState';
import { applyFilters } from './plotUtils';
import PlotControls from './PlotControls';
import { useMeetingLogs } from '../hooks/useMeetingLogs';

// ============================================================================
// PLOT TYPE CONFIGURATION
// ============================================================================

/**
 * Define how each plot type handles data
 */
const PLOT_TYPE_CONFIG = {
  line: {
    usesRawData: true,           // Uses raw ESP data array
    needsMeetingData: true,      // May need meeting logs
    validateData: (data) => Array.isArray(data) && data.length > 0
  },
  scatter: {
    usesRawData: true,           // Uses raw ESP data array
    needsMeetingData: false,     // Doesn't need meeting logs
    validateData: (data) => Array.isArray(data) && data.length > 0
  },
  bar: {
    usesRawData: false,          // Uses filtered/transformed data
    needsMeetingData: false,
    validateData: (data) => Array.isArray(data) && data.some(series => 
      Array.isArray(series.data) && series.data.length > 0
    )
  },
  histogram: {
    usesRawData: true,           // Uses raw ESP data array
    needsMeetingData: false,
    validateData: (data) => Array.isArray(data) && data.length > 0
  },
  pie: {
    usesRawData: true,           // Uses raw ESP data array
    needsMeetingData: false,
    validateData: (data) => Array.isArray(data) && data.length > 0
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if the current plot configuration needs meeting data
 */
function needsMeetingData(plotType, xVars, yVars) {
  if (!PLOT_TYPE_CONFIG[plotType]?.needsMeetingData) return false;
  
  const xVar = xVars?.[0];
  const yVar = yVars?.[0];
  
  return xVar === 'Meetings Held' || yVar === 'Meetings Held' ||
         xVar === 'Time' || yVar === 'Time';
}

/**
 * Determine which data to pass to the plot renderer
 */
function getPlotData(plotType, rawData, filteredData) {
  const config = PLOT_TYPE_CONFIG[plotType];
  
  if (!config) {
    console.warn(`[PlotComponent] Unknown plot type: ${plotType}`);
    return rawData;
  }
  
  return config.usesRawData ? rawData : filteredData;
}

/**
 * Validate that we have data to render
 */
function validatePlotData(plotType, rawData, filteredData) {
  const config = PLOT_TYPE_CONFIG[plotType];
  
  if (!config) {
    console.warn(`[PlotComponent] Unknown plot type: ${plotType}`);
    return false;
  }
  
  const dataToCheck = config.usesRawData ? rawData : filteredData;
  return config.validateData(dataToCheck);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PlotComponent = ({ 
  plotLabel, 
  theme, 
  data, 
  logAction, 
  rawData, 
  allInfectedCadets, 
  allHealthyCadets, 
  allInfectedSectors, 
  allHealthySectors 
}) => {
  // Use custom hook for state management
  const {
    plotType,
    xVars,
    yVars,
    cadetFilter,
    sectorFilter,
    allowedMatrix,
    variables,
    PlotRenderer,
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
  } = usePlotState(plotLabel, logAction, data);

  // State for session and meeting data
  const [sessionId, setSessionId] = useState(null);
  
  // Fetch sessionId when needed for meeting-based plots
  useEffect(() => {
    const shouldFetchSession = needsMeetingData(plotType, xVars, yVars);
    
    if (!shouldFetchSession) {
      setSessionId(null);
      return;
    }
    
    const fetchSessionId = async () => {
      try {
        const { get, ref, db } = await import('../firebase');
        const sessionIdSnap = await get(ref(db, 'activeSessionId'));
        const sessionIdVal = sessionIdSnap.exists() ? sessionIdSnap.val() : null;
        setSessionId(sessionIdVal);
        console.log('[PlotComponent] Fetched sessionId:', sessionIdVal);
      } catch (err) {
        console.error('[PlotComponent] Error fetching sessionId:', err);
        setSessionId(null);
      }
    };
    
    fetchSessionId();
  }, [plotType, xVars, yVars]);

  // Fetch meeting logs when needed
  const shouldUseMeetingLogs = needsMeetingData(plotType, xVars, yVars);
  const { meetingEnds, loading: meetingLogsLoading, error: meetingLogsError } = 
    useMeetingLogs(shouldUseMeetingLogs ? sessionId : null);

  // Filter data for plots that need it (bar charts, etc.)
  const filteredData = applyFilters(data, cadetFilter, sectorFilter);

  // Determine which data to use
  const plotData = getPlotData(plotType, data, filteredData);
  const hasValidData = validatePlotData(plotType, data, filteredData);

  // Diagnostic logging
  console.log('[PlotComponent] Render state:', {
    plotType,
    xVars,
    yVars,
    hasValidData,
    rawDataLen: data?.length,
    filteredDataLen: filteredData?.length,
    plotDataLen: plotData?.length,
    meetingEndsLen: meetingEnds?.length,
    meetingLogsLoading,
    needsMeetingData: shouldUseMeetingLogs
  });

  // Check if variables are properly selected
  const hasValidVariables = xVars && yVars && xVars[0] && yVars[0] && xVars[0] !== yVars[0];

  // ============================================================================
  // RENDERING LOGIC
  // ============================================================================

  // Show loading state if waiting for meeting data
  if (shouldUseMeetingLogs && meetingLogsLoading) {
    return (
      <div className={styles.plotContainer}>
        <div className={styles.plotRenderer}>
          <div style={{
            height: '100%',
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            color: '#666',
            background: '#f8f3ea',
            borderRadius: 8,
            border: '1.5px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
          }}>
            Loading meeting data...
          </div>
        </div>
        <PlotControls
          plotType={plotType}
          variables={variables}
          xVars={xVars}
          yVars={yVars}
          personFilter={cadetFilter}
          sectorFilter={sectorFilter}
          allowedMatrix={allowedMatrix}
          plotLabel={plotLabel}
          onPlotTypeChange={handlePlotTypeChange}
          onXVariableToggle={handleXVariableToggle}
          onYVariableToggle={handleYVariableToggle}
          onHistogramXVariableToggle={handleHistogramXVariableToggle}
          onPieVariableSelect={handlePieVariableSelect}
          onPersonFilterToggle={handleCadetFilterToggle}
          onSectorFilterToggle={handleSectorFilterToggle}
          onSelectAllDevices={onSelectAllCadets}
          onDeselectAllDevices={onDeselectAllCadets}
          onSelectAllSectors={onSelectAllSectors}
          onDeselectAllSectors={onDeselectAllSectors}
          rawData={data}
          allInfectedCadets={allInfectedCadets}
          allHealthyCadets={allHealthyCadets}
          allInfectedSectors={allInfectedSectors}
          allHealthySectors={allHealthySectors}
        />
      </div>
    );
  }

  // Show error state if meeting data failed to load
  if (shouldUseMeetingLogs && meetingLogsError) {
    return (
      <div className={styles.plotContainer}>
        <div className={styles.plotRenderer}>
          <div style={{
            height: '100%',
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '1.1rem',
            color: '#c00',
            background: '#f8f3ea',
            borderRadius: 8,
            border: '1.5px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div>Error loading meeting data</div>
            <div style={{ fontSize: '0.9rem', color: '#999' }}>
              {meetingLogsError.message || 'Unknown error'}
            </div>
          </div>
        </div>
        <PlotControls
          plotType={plotType}
          variables={variables}
          xVars={xVars}
          yVars={yVars}
          personFilter={cadetFilter}
          sectorFilter={sectorFilter}
          allowedMatrix={allowedMatrix}
          plotLabel={plotLabel}
          onPlotTypeChange={handlePlotTypeChange}
          onXVariableToggle={handleXVariableToggle}
          onYVariableToggle={handleYVariableToggle}
          onHistogramXVariableToggle={handleHistogramXVariableToggle}
          onPieVariableSelect={handlePieVariableSelect}
          onPersonFilterToggle={handleCadetFilterToggle}
          onSectorFilterToggle={handleSectorFilterToggle}
          onSelectAllDevices={onSelectAllCadets}
          onDeselectAllDevices={onDeselectAllCadets}
          onSelectAllSectors={onSelectAllSectors}
          onDeselectAllSectors={onDeselectAllSectors}
          rawData={data}
          allInfectedCadets={allInfectedCadets}
          allHealthyCadets={allHealthyCadets}
          allInfectedSectors={allInfectedSectors}
          allHealthySectors={allHealthySectors}
        />
      </div>
    );
  }

  return (
    <div className={styles.plotContainer}>
      <div className={styles.plotRenderer}>
        {!hasValidVariables ? (
          // No variables selected
          <div style={{
            height: '100%',
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            color: '#666',
            background: '#f8f3ea',
            borderRadius: 8,
            border: '1.5px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
          }}>
            Please select variables to display a plot
          </div>
        ) : !hasValidData ? (
          // No data available
          <div style={{
            height: '100%',
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            color: '#666',
            background: '#f8f3ea',
            borderRadius: 8,
            border: '1.5px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
          }}>
            No data to display currently
          </div>
        ) : (
          // Render the plot
          <PlotRenderer 
            data={plotData}
            xVar={xVars[0]}
            yVar={yVars[0]}
            selectedVariable={xVars[0]} // For pie charts
            theme={theme}
            sessionId={sessionId}
            meetingEndsSanDiego={meetingEnds}
            personFilter={cadetFilter}
            sectorFilter={sectorFilter}
            rawData={rawData}
            allInfectedCadets={allInfectedCadets}
            allHealthyCadets={allHealthyCadets}
            allInfectedSectors={allInfectedSectors}
            allHealthySectors={allHealthySectors}
            logAction={logAction}
          />
        )}
      </div>
      
      {/* Plot controls always below */}
      <PlotControls
        plotType={plotType}
        variables={variables}
        xVars={xVars}
        yVars={yVars}
        personFilter={cadetFilter}
        sectorFilter={sectorFilter}
        allowedMatrix={allowedMatrix}
        plotLabel={plotLabel}
        onPlotTypeChange={handlePlotTypeChange}
        onXVariableToggle={handleXVariableToggle}
        onYVariableToggle={handleYVariableToggle}
        onHistogramXVariableToggle={handleHistogramXVariableToggle}
        onPieVariableSelect={handlePieVariableSelect}
        onPersonFilterToggle={handleCadetFilterToggle}
        onSectorFilterToggle={handleSectorFilterToggle}
        onSelectAllDevices={onSelectAllCadets}
        onDeselectAllDevices={onDeselectAllCadets}
        onSelectAllSectors={onSelectAllSectors}
        onDeselectAllSectors={onDeselectAllSectors}
        rawData={data}
        allInfectedCadets={allInfectedCadets}
        allHealthyCadets={allHealthyCadets}
        allInfectedSectors={allInfectedSectors}
        allHealthySectors={allHealthySectors}
      />
    </div>
  );
};

export default PlotComponent;