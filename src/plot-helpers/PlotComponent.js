// PlotComponent.js - Streamlined version for Line, Scatter, and Histogram plots
import React, { useEffect, useState, useMemo } from 'react';
import styles from './PlotComponent.module.css';
import { usePlotState } from './usePlotState';
import { playerNames, sectorIds } from './plotConfigs';
import PlotControls from './PlotControls';
import LinePlot from '../plots/LinePlot';
import ScatterPlot from '../plots/ScatterPlot';
import HistogramPlot from '../plots/HistogramPlot';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const PLOT_COMPONENTS = {
  line: LinePlot,
  scatter: ScatterPlot,
  histogram: HistogramPlot,
};

/**
 * Check if current plot needs meeting data
 */
function needsMeetingData(plotType, xVars, yVars) {
  if (plotType !== 'line') return false;
  
  const xVar = xVars?.[0];
  const yVar = yVars?.[0];
  
  return xVar === 'Meetings Held' || yVar === 'Meetings Held';
}

/**
 * Validate that we have data to render
 */
function hasValidData(data) {
  return Array.isArray(data) && data.length > 0;
}

/**
 * Check if variables are properly selected
 */
function hasValidVariables(plotType, xVars, yVars) {
  if (plotType === 'histogram') {
    // Histogram only needs X variable
    return xVars && xVars.length > 0 && xVars[0];
  }
  
  // Line and Scatter need both X and Y, and they must be different
  return xVars && yVars && xVars[0] && yVars[0] && xVars[0] !== yVars[0];
}

// ============================================================================
// MEETING DATA HOOK
// ============================================================================

/**
 * Fetch meeting logs from Firebase when needed
 */
function useMeetingData(shouldFetch) {
  const [sessionId, setSessionId] = useState(null);
  const [meetingEnds, setMeetingEnds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shouldFetch) {
      setSessionId(null);
      setMeetingEnds([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { get, ref, db } = await import('../firebase');
        
        // Get active session ID
        const sessionIdSnap = await get(ref(db, 'activeSessionId'));
        const sessionIdVal = sessionIdSnap.exists() ? sessionIdSnap.val() : null;
        
        if (!sessionIdVal) {
          throw new Error('No active session found');
        }
        
        setSessionId(sessionIdVal);
        console.log('[PlotComponent] Session ID:', sessionIdVal);
        
        // Get meeting logs for this session
        const meetingLogsSnap = await get(ref(db, `meetingLogs/${sessionIdVal}`));
        
        if (!meetingLogsSnap.exists()) {
          console.warn('[PlotComponent] No meeting logs found for session:', sessionIdVal);
          setMeetingEnds([]);
          setLoading(false);
          return;
        }
        
        const meetingLogsData = meetingLogsSnap.val();
        
        // Extract meeting end times and convert to milliseconds
        const ends = Object.values(meetingLogsData)
          .map(log => {
            const time = log.endTime || log.timestamp;
            return time instanceof Date ? time.getTime() : new Date(time).getTime();
          })
          .filter(time => !isNaN(time))
          .sort((a, b) => a - b);
        
        console.log('[PlotComponent] Meeting ends loaded:', ends.length);
        setMeetingEnds(ends);
        
      } catch (err) {
        console.error('[PlotComponent] Error fetching meeting data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shouldFetch]);

  return { sessionId, meetingEnds, loading, error };
}

// ============================================================================
// DATA PREPROCESSING
// ============================================================================

/**
 * Clean and validate ESP data
 */
function preprocessESPData(rawData) {
  if (!Array.isArray(rawData)) {
    console.warn('[PlotComponent] Data is not an array:', typeof rawData);
    return [];
  }

  // Filter out QR/CR devices and ensure valid timestamps
  const cleaned = rawData
    .filter(d => d && d.device_id && d.device_id !== 'QR' && d.device_id !== 'CR')
    .map(d => ({
      ...d,
      timestamp: typeof d.timestamp === 'string' ? Date.parse(d.timestamp) : d.timestamp,
    }))
    .filter(d => !isNaN(d.timestamp) && d.timestamp > 0);

  console.log(`[PlotComponent] Preprocessed ${cleaned.length} records from ${rawData.length} raw records`);
  return cleaned;
}

/**
 * Get all infected/healthy cadets and sectors from current data
 */
function analyzeDeviceStatus(data) {
  const infectedCadets = new Set();
  const healthyCadets = new Set();
  const infectedSectors = new Set();
  const healthySectors = new Set();

  // Get latest status for each device
  const latestStatus = {};
  
  data.forEach(record => {
    const deviceId = record.device_id;
    if (!latestStatus[deviceId] || record.timestamp > latestStatus[deviceId].timestamp) {
      latestStatus[deviceId] = record;
    }
  });

  // Categorize devices
  Object.values(latestStatus).forEach(record => {
    const { device_id, infection_status } = record;
    const isInfected = infection_status === 1;
    const isHealthy = infection_status === 0 || infection_status === 0.5;
    
    if (playerNames.includes(device_id)) {
      if (isInfected) infectedCadets.add(device_id);
      if (isHealthy) healthyCadets.add(device_id);
    } else if (sectorIds.includes(device_id)) {
      if (isInfected) infectedSectors.add(device_id);
      if (isHealthy) healthySectors.add(device_id);
    }
  });

  return {
    allInfectedCadets: infectedCadets,
    allHealthyCadets: healthyCadets,
    allInfectedSectors: infectedSectors,
    allHealthySectors: healthySectors,
  };
}

// ============================================================================
// EMPTY STATE COMPONENTS
// ============================================================================

const EmptyState = ({ message, submessage }) => (
  <div style={{
    height: '100%',
    minHeight: 320,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '1.1rem',
    color: '#666',
    background: '#f8f3ea',
    borderRadius: 8,
    border: '1.5px solid #e0e0e0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    padding: '20px',
    textAlign: 'center'
  }}>
    <div>{message}</div>
    {submessage && (
      <div style={{ fontSize: '0.9rem', color: '#999' }}>
        {submessage}
      </div>
    )}
  </div>
);

const LoadingState = () => (
  <EmptyState message="Loading meeting data..." />
);

const ErrorState = ({ error }) => (
  <EmptyState 
    message="Error loading meeting data" 
    submessage={error?.message || 'Unknown error'}
  />
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PlotComponent = ({ 
  plotLabel = 'Plot',
  theme = 'light',
  data = [],
  logAction = console.log,
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
    //cadetFilter,
    //sectorFilter,
    allowedMatrix,
    variables,
    PlotRenderer,
    handlePlotTypeChange,
    handleXVariableToggle,
    handleYVariableToggle,
    handleHistogramXVariableToggle,
    handlePieVariableSelect,
    //handleCadetFilterToggle,
    //handleSectorFilterToggle,
    onSelectAllCadets,
    onDeselectAllCadets,
    onSelectAllSectors,
    onDeselectAllSectors,
  } = usePlotState(plotLabel, logAction, data);

  // Preprocess data
  const processedData = useMemo(() => preprocessESPData(data), [data]);
  
  // Analyze device status
  const deviceStatus = useMemo(() => 
    analyzeDeviceStatus(processedData), 
    [processedData]
  );

  // Determine if we need meeting data
  const shouldFetchMeetingData = needsMeetingData(plotType, xVars, yVars);
  
  // Fetch meeting data if needed
  const { 
    sessionId, 
    meetingEnds, 
    loading: meetingLoading, 
    error: meetingError 
  } = useMeetingData(shouldFetchMeetingData);

  // Get the correct plot component
  const PlotComponent = PLOT_COMPONENTS[plotType] || LinePlot;

  // Validation checks
  const validVariables = hasValidVariables(plotType, xVars, yVars);
  const validData = hasValidData(processedData);

  // Diagnostic logging
  useEffect(() => {
    console.log('[PlotComponent] Render state:', {
      plotType,
      xVars,
      yVars,
      validVariables,
      validData,
      dataLength: processedData.length,
      meetingEndsLength: meetingEnds.length,
      shouldFetchMeetingData,
      meetingLoading
    });
  }, [plotType, xVars, yVars, validVariables, validData, processedData.length, meetingEnds.length, shouldFetchMeetingData, meetingLoading]);

  // ============================================================================
  // RENDER LOGIC
  // ============================================================================

  // Show loading state if waiting for meeting data
  if (shouldFetchMeetingData && meetingLoading) {
    return (
      <div className={styles.plotContainer}>
        <div className={styles.plotRenderer}>
          <LoadingState />
        </div>
        <PlotControls
          plotType={plotType}
          variables={variables}
          xVars={xVars}
          yVars={yVars}
          //personFilter={cadetFilter}
          //sectorFilter={sectorFilter}
          allowedMatrix={allowedMatrix}
          plotLabel={plotLabel}
          onPlotTypeChange={handlePlotTypeChange}
          onXVariableToggle={handleXVariableToggle}
          onYVariableToggle={handleYVariableToggle}
          onHistogramXVariableToggle={handleHistogramXVariableToggle}
          onPieVariableSelect={handlePieVariableSelect}
          //onPersonFilterToggle={handleCadetFilterToggle}
          //onSectorFilterToggle={handleSectorFilterToggle}
          onSelectAllDevices={onSelectAllCadets}
          onDeselectAllDevices={onDeselectAllCadets}
          onSelectAllSectors={onSelectAllSectors}
          onDeselectAllSectors={onDeselectAllSectors}
          rawData={processedData}
          allInfectedCadets={deviceStatus.allInfectedCadets}
          allHealthyCadets={deviceStatus.allHealthyCadets}
          allInfectedSectors={deviceStatus.allInfectedSectors}
          allHealthySectors={deviceStatus.allHealthySectors}
        />
      </div>
    );
  }

  // Show error state if meeting data failed to load
  if (shouldFetchMeetingData && meetingError) {
    return (
      <div className={styles.plotContainer}>
        <div className={styles.plotRenderer}>
          <ErrorState error={meetingError} />
        </div>
        <PlotControls
          plotType={plotType}
          variables={variables}
          xVars={xVars}
          yVars={yVars}
          //personFilter={cadetFilter}
          //sectorFilter={sectorFilter}
          allowedMatrix={allowedMatrix}
          plotLabel={plotLabel}
          onPlotTypeChange={handlePlotTypeChange}
          onXVariableToggle={handleXVariableToggle}
          onYVariableToggle={handleYVariableToggle}
          onHistogramXVariableToggle={handleHistogramXVariableToggle}
          onPieVariableSelect={handlePieVariableSelect}
          //onPersonFilterToggle={handleCadetFilterToggle}
          //onSectorFilterToggle={handleSectorFilterToggle}
          onSelectAllDevices={onSelectAllCadets}
          onDeselectAllDevices={onDeselectAllCadets}
          onSelectAllSectors={onSelectAllSectors}
          onDeselectAllSectors={onDeselectAllSectors}
          rawData={processedData}
          allInfectedCadets={deviceStatus.allInfectedCadets}
          allHealthyCadets={deviceStatus.allHealthyCadets}
          allInfectedSectors={deviceStatus.allInfectedSectors}
          allHealthySectors={deviceStatus.allHealthySectors}
        />
      </div>
    );
  }

  // Determine what to render in the plot area
  let plotContent;

  if (!validVariables) {
    // No variables selected
    plotContent = (
      <EmptyState 
        message="Please select variables to display a plot"
        submessage={plotType === 'histogram' ? 'Select an X variable above' : 'Select X and Y variables above (they must be different)'}
      />
    );
  } else if (!validData) {
    // No data available
    plotContent = (
      <EmptyState message="No data to display currently" />
    );
  } else if (shouldFetchMeetingData && (!meetingEnds || meetingEnds.length === 0)) {
    // Needs meeting data but none available
    plotContent = (
      <EmptyState 
        message="No meeting data available" 
        submessage="Meeting logs are required for this plot. Ensure the session has meeting logs."
      />
    );
  } else {
    // Render the plot
    plotContent = (
      <PlotComponent
        data={processedData}
        xVar={xVars[0]}
        yVar={yVars[0]}
        selectedVariable={xVars[0]} // For pie charts (not used here but kept for consistency)
        theme={theme}
        sessionId={sessionId}
        meetingEndsSanDiego={meetingEnds}
        //personFilter={cadetFilter}
        //sectorFilter={sectorFilter}
        rawData={processedData}
        allInfectedCadets={deviceStatus.allInfectedCadets}
        allHealthyCadets={deviceStatus.allHealthyCadets}
        allInfectedSectors={deviceStatus.allInfectedSectors}
        allHealthySectors={deviceStatus.allHealthySectors}
        logAction={logAction}
      />
    );
  }

  return (
    <div className={styles.plotContainer}>
      <div className={styles.plotRenderer}>
        {plotContent}
      </div>
      
      <PlotControls
        plotType={plotType}
        variables={variables}
        xVars={xVars}
        yVars={yVars}
        //personFilter={cadetFilter}
        //sectorFilter={sectorFilter}
        allowedMatrix={allowedMatrix}
        plotLabel={plotLabel}
        onPlotTypeChange={handlePlotTypeChange}
        onXVariableToggle={handleXVariableToggle}
        onYVariableToggle={handleYVariableToggle}
        onHistogramXVariableToggle={handleHistogramXVariableToggle}
        onPieVariableSelect={handlePieVariableSelect}
        //onPersonFilterToggle={handleCadetFilterToggle}
        //onSectorFilterToggle={handleSectorFilterToggle}
        onSelectAllDevices={onSelectAllCadets}
        onDeselectAllDevices={onDeselectAllCadets}
        onSelectAllSectors={onSelectAllSectors}
        onDeselectAllSectors={onDeselectAllSectors}
        rawData={processedData}
        allInfectedCadets={deviceStatus.allInfectedCadets}
        allHealthyCadets={deviceStatus.allHealthyCadets}
        allInfectedSectors={deviceStatus.allInfectedSectors}
        allHealthySectors={deviceStatus.allHealthySectors}
      />
    </div>
  );
};

export default PlotComponent;