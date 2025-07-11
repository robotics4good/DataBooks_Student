// =============================
// PRODUCTION-LOCKED: DO NOT MODIFY
// The logic for passing ESP data and meeting log data to the plot for Time vs Meetings Held is stable and correct as of 2024-07-11.
// Any changes must be explicitly reviewed and approved.
// =============================
import React from 'react';
import styles from './PlotComponent.module.css';
import { usePlotState } from './usePlotState';
import { applyFilters, getVariableValue, calculateStats, getUniqueValues, initializePersonFilter, initializeSectorFilter, transformData } from './plotUtils';
import PlotControls from './PlotControls';
import { useMeetingLogs } from '../hooks/useMeetingLogs';
import { useEffect, useState } from 'react';

const PlotComponent = ({ plotLabel, theme, data, logAction, rawData, allInfectedCadets, allHealthyCadets, allInfectedSectors, allHealthySectors }) => {
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

  // State for MeetingLogs plot data
  const [sessionId, setSessionId] = useState(null);
  
  // Fetch sessionId from Firebase when needed
  useEffect(() => {
    const shouldShowMeetingsPlot =
      plotType === 'line' &&
      xVars && yVars &&
      ((xVars[0] === 'Meetings Held' && yVars[0] === 'Time') ||
       (xVars[0] === 'Time' && yVars[0] === 'Meetings Held'));
    if (!shouldShowMeetingsPlot) {
      setSessionId(null);
      return;
    }
    const fetchSessionId = async () => {
      try {
        const { get, ref, db } = await import('../firebase');
        const sessionIdSnap = await get(ref(db, 'activeSessionId'));
        const sessionIdVal = sessionIdSnap.exists() ? sessionIdSnap.val() : null;
        setSessionId(sessionIdVal);
      } catch (err) {
        setSessionId(null);
      }
    };
    fetchSessionId();
  }, [plotType, xVars, yVars]);

  // Use the new meeting log hook
  const { meetingEnds, loading: meetingLogsLoading, error: meetingLogsError } = useMeetingLogs(sessionId);

  // Filter data for the selected variables and person/sector filter
  const filteredData = applyFilters(data, xVars, yVars, cadetFilter, sectorFilter);

  // Diagnostic logs for audit
  console.log('PLOT AUDIT:', {
    plotType,
    xVars,
    yVars,
    filteredData,
    data,
    cadetFilter,
    sectorFilter,
    rawData
  });

  // Professional, robust empty data check
  let hasData = false;
  if (plotType === 'line') {
    // For line plots, check if data is a non-empty array of objects with x and y
    hasData = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'x' in data[0] && 'y' in data[0];
  } else {
    // For other plots, use the existing logic
    hasData = Array.isArray(filteredData) && filteredData.some(series => Array.isArray(series.data) && series.data.length > 0);
  }

  // Decide which data to pass to PlotRenderer
  let plotDataToUse = data; // Always use raw ESP data for meeting log plots

  return (
    <div className={styles.plotContainer}>
      {/* Always reserve space for the plot or the no-data message */}
      <div className={styles.plotRenderer}>
        {/* Only use meetingEnds for the two production-locked plots */}
        {xVars && yVars && xVars[0] && yVars[0] && xVars[0] !== yVars[0] ? (
          plotType === 'line' && (
            (xVars[0] === 'Meetings Held' && yVars[0] === 'Time') ||
            (xVars[0] === 'Time' && yVars[0] === 'Meetings Held')
          ) && meetingEnds && meetingEnds.length > 0 ? (
            <PlotRenderer 
              data={plotDataToUse} 
              xVar={xVars[0]} 
              yVar={yVars[0]} 
              theme={theme} 
              sessionId={sessionId} 
              meetingEndsSanDiego={meetingEnds} 
            />
          ) : plotType === 'line' ? (
            <>
              {console.log('[PlotComponent] Rendering LinePlot', { plotType, xVars, yVars, data })}
              <PlotRenderer 
                data={data} 
                xVar={xVars[0]} 
                yVar={yVars[0]} 
                theme={theme} 
                personFilter={cadetFilter} 
                sectorFilter={sectorFilter}
                sessionId={sessionId}
                meetingEndsSanDiego={meetingEnds}
                rawData={rawData}
                allInfectedCadets={allInfectedCadets}
                allHealthyCadets={allHealthyCadets}
                allInfectedSectors={allInfectedSectors}
                allHealthySectors={allHealthySectors}
              />
            </>
          ) : hasData ? (
            plotType === 'pie' ? (
              <PlotRenderer 
                data={data} 
                selectedVariable={xVars[0]} 
                theme={theme} 
                logAction={logAction} 
                sessionId={sessionId}
                personFilter={cadetFilter}
                sectorFilter={sectorFilter}
                rawData={rawData}
                allInfectedCadets={allInfectedCadets}
                allHealthyCadets={allHealthyCadets}
                allInfectedSectors={allInfectedSectors}
                allHealthySectors={allHealthySectors}
              />
            ) : plotType === 'scatter' ? (
              <PlotRenderer 
                data={data} 
                xVar={xVars[0]} 
                yVar={yVars[0]} 
                theme={theme} 
                personFilter={cadetFilter} 
                sectorFilter={sectorFilter}
                sessionId={sessionId}
                meetingEndsSanDiego={meetingEnds}
                rawData={rawData}
                allInfectedCadets={allInfectedCadets}
                allHealthyCadets={allHealthyCadets}
                allInfectedSectors={allInfectedSectors}
                allHealthySectors={allHealthySectors}
              />
            ) : plotType === 'histogram' ? (
              <PlotRenderer 
                data={data} 
                xVar={xVars[0]} 
                theme={theme}
                sessionId={sessionId}
                personFilter={cadetFilter}
                sectorFilter={sectorFilter}
                rawData={rawData}
                allInfectedCadets={allInfectedCadets}
                allHealthyCadets={allHealthyCadets}
                allInfectedSectors={allInfectedSectors}
                allHealthySectors={allHealthySectors}
              />
            ) : (
              <PlotRenderer 
                data={filteredData} 
                xVar={xVars[0]}
                yVar={yVars[0]}
                theme={theme}
                sessionId={sessionId}
                personFilter={cadetFilter}
                sectorFilter={sectorFilter}
                rawData={rawData}
                allInfectedCadets={allInfectedCadets}
                allHealthyCadets={allHealthyCadets}
                allInfectedSectors={allInfectedSectors}
                allHealthySectors={allHealthySectors}
              />
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
          )
        ) : null}
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