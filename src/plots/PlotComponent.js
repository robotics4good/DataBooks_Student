import React from 'react';
import styles from './PlotComponent.module.css';
import { usePlotState } from './usePlotState';
import { filterData } from './plotUtils';
import PlotControls from './PlotControls';
import { fetchMeetingLogTimestamps } from '../hooks/useESPData';
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
  const [meetingsPlotData, setMeetingsPlotData] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Fetch sessionId from Firebase when needed
  useEffect(() => {
    const shouldShowMeetingsPlot =
      plotType === 'line' &&
      xVars && yVars &&
      xVars[0] === 'Meetings Held' &&
      yVars[0] === 'Time';
    if (!shouldShowMeetingsPlot) {
      setSessionId(null);
      setMeetingsPlotData(null); // Only clear when switching away
      return;
    }
    const fetchSessionId = async () => {
      try {
        const { get, ref, db } = await import('../firebase');
        const sessionIdSnap = await get(ref(db, 'activeSessionId'));
        const sessionIdVal = sessionIdSnap.exists() ? sessionIdSnap.val() : null;
        console.log('[PlotComponent] Got sessionId from Firebase:', sessionIdVal);
        setSessionId(sessionIdVal);
      } catch (err) {
        console.error('[PlotComponent] Error fetching sessionId:', err);
        setSessionId(null);
      }
    };
    fetchSessionId();
  }, [plotType, xVars, yVars]);

  // Fetch and transform MeetingLogs if needed
  useEffect(() => {
    const shouldShowMeetingsPlot =
      plotType === 'line' &&
      xVars && yVars &&
      xVars[0] === 'Meetings Held' &&
      yVars[0] === 'Time';
    if (!shouldShowMeetingsPlot || !sessionId) {
      // Only clear if switching away, not during fetch
      if (!shouldShowMeetingsPlot) setMeetingsPlotData(null);
      return;
    }
    const fetchData = async () => {
      try {
        console.log('[PlotComponent] Fetching MeetingLogs for sessionId:', sessionId);
        const timestamps = await fetchMeetingLogTimestamps(sessionId);
        console.log('[PlotComponent] MeetingLog timestamps:', timestamps);
        if (!timestamps || timestamps.length === 0) {
          setMeetingsPlotData([]);
          console.log('[PlotComponent] No MeetingLogs found.');
          return;
        }
        const t0 = timestamps[0];
        const points = timestamps.map((date, idx) => ({
          x: idx + 1,
          y: Math.round((date - t0) / 60000),
        }));
        console.log('[PlotComponent] Computed meeting points:', points);
        setMeetingsPlotData(points);
      } catch (err) {
        setMeetingsPlotData([]);
        console.error('[PlotComponent] Error fetching MeetingLogs:', err);
      }
    };
    fetchData();
  }, [plotType, xVars, yVars, sessionId]);

  // Filter data for the selected variables and person/sector filter
  const filteredData = filterData(data, xVars, yVars, cadetFilter, sectorFilter);

  // Professional, robust empty data check
  const hasData = Array.isArray(filteredData) && filteredData.some(series => Array.isArray(series.data) && series.data.length > 0);

  // Decide which data to pass to PlotRenderer
  let plotDataToUse = data;
  if (meetingsPlotData) {
    plotDataToUse = [{ id: 'Elapsed Minutes', data: meetingsPlotData.map(point => ({ x: point.x, y: Math.round(point.y) })) }];
  }

  // Failsafe: log the actual PlotRenderer being used
  // (Remove all console.log, etc.)

  return (
    <div className={styles.plotContainer}>
      {/* Always reserve space for the plot or the no-data message */}
      <div className={styles.plotRenderer}>
        {meetingsPlotData ? (
          meetingsPlotData.length > 0 ? (
            <PlotRenderer data={plotDataToUse} xVar={"Meetings Held"} yVar={"Time"} theme={theme} sessionId={sessionId} />
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
              No meeting data to display currently
            </div>
          )
        ) : hasData ? (
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