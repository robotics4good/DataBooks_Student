// ControlPanel.js - Comprehensive server data control panel
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ESPDataPlot from './plots/ESPDataPlot';
import { useESPData } from './hooks/useESPData';
// Removed useUserLog import - Control Panel actions should not be logged
import { db, ref, get, set, remove, onValue } from './firebase';
import { formatSanDiegoTime, formatSanDiegoTimeOnly, getSanDiegoTimezoneInfo, timeService } from './utils/timeUtils';
import dataSyncService from './services/dataSyncService';
import { JOURNAL_QUESTIONS } from './components/JournalQuestions';

const cardStyle = {
  background: '#fff',
  borderRadius: '14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  padding: '28px 32px',
  marginBottom: '28px',
  maxWidth: '100%',
};
const badge = (color, text) => (
  <span style={{
    display: 'inline-block',
    background: color,
    color: '#fff',
    borderRadius: 8,
    padding: '4px 14px',
    fontWeight: 700,
    fontSize: 15,
    marginLeft: 12,
    marginRight: 0,
    letterSpacing: 0.5,
  }}>{text}</span>
);

const SanDiegoClock = () => {
  const [now, setNow] = useState(() => timeService.getCurrentTime());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(timeService.getCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return <b style={{ fontWeight: 700 }}>{formatSanDiegoTime(now)}</b>;
};

const ControlPanel = () => {
  const navigate = useNavigate();
  
  const { 
    espData, 
    getPlotData, 
    getAvailableVariables,
    totalPackets,
    uniqueStudents,
    timeRange 
  } = useESPData();

  const [serverData, setServerData] = useState({});
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [timezoneInfo, setTimezoneInfo] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [serverStatus, setServerStatus] = useState('connected');
  const [latestPacketsState, setLatestPacketsState] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastUpdatedESP, setLastUpdatedESP] = useState(null);
  const [lastUpdatedWebsite, setLastUpdatedWebsite] = useState(null);
  const [espDataState, setESPDataState] = useState({});
  const [websiteDataState, setWebsiteDataState] = useState({});
  const [journalDataState, setJournalDataState] = useState({});
  const [espLoading, setESPLoading] = useState(false);
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [journalLoading, setJournalLoading] = useState(false);
  const [espError, setESPError] = useState(null);
  const [websiteError, setWebsiteError] = useState(null);
  const [journalError, setJournalError] = useState(null);
  const [espLastRefreshed, setESPLastRefreshed] = useState(null);
  const [websiteLastRefreshed, setWebsiteLastRefreshed] = useState(null);
  const [journalLastRefreshed, setJournalLastRefreshed] = useState(null);
  const [showFullLog, setShowFullLog] = useState(false);
  const [selectedLogSession, setSelectedLogSession] = useState(null);
  const logRefs = useRef({});
  const logScrollTops = useRef({});

  // Session management state
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [sessionLoading, setSessionLoading] = useState(false);

  // Manual refresh function for server data
  const refreshServerData = async () => {
    setServerLoading(true);
    setServerError(null);
    
    try {
      const serverDataRef = ref(db, '/');
      const snapshot = await get(serverDataRef);
      const data = snapshot.val();
      setServerData(data || {});
      
      // Update latest packets for real-time monitoring
      if (data?.devicePackets) {
        const packets = Object.values(data.devicePackets)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10);
        setLatestPacketsState(packets);
      }

      // Fetch NIST time
      try {
        const resp = await fetch('http://worldtimeapi.org/api/timezone/America/Los_Angeles');
        const nistData = await resp.json();
        if (nistData && nistData.datetime) {
          setLastUpdated(new Date(nistData.datetime));
        } else {
          setLastUpdated(new Date()); // fallback
        }
      } catch {
        setLastUpdated(new Date()); // fallback
      }
    } catch (err) {
      console.error("Error fetching server data:", err);
      setServerError(err.message);
    } finally {
      setServerLoading(false);
    }
  };

  const refreshESPData = async () => {
    setESPLoading(true);
    setESPError(null);
    try {
      const devicePacketsRef = ref(db, 'devicePackets');
      const snapshot = await get(devicePacketsRef);
      setESPDataState({ devicePackets: snapshot.val() || {} });
      setESPLastRefreshed(timeService.getCurrentTime());
    } catch (err) {
      setESPError(err.message);
    } finally {
      setESPLoading(false);
    }
  };

  const refreshWebsiteData = async () => {
    setWebsiteLoading(true);
    setWebsiteError(null);
    try {
      const userActionsRef = ref(db, 'userActions');
      const userActionsSnap = await get(userActionsRef);
      setWebsiteDataState({ userActions: userActionsSnap.val() || {} });
      setWebsiteLastRefreshed(timeService.getCurrentTime());
    } catch (err) {
      setWebsiteError(err.message);
    } finally {
      setWebsiteLoading(false);
    }
  };

  const refreshJournalData = async () => {
    setJournalLoading(true);
    setJournalError(null);
    try {
      const journalEntriesRef = ref(db, 'journalEntries');
      const journalEntriesSnap = await get(journalEntriesRef);
      setJournalDataState({ journalEntries: journalEntriesSnap.val() || {} });
      setJournalLastRefreshed(timeService.getCurrentTime());
    } catch (err) {
      setJournalError(err.message);
    } finally {
      setJournalLoading(false);
    }
  };

  // Get timezone information
  useEffect(() => {
    setTimezoneInfo(getSanDiegoTimezoneInfo());
  }, []);

  // Firebase is always connected when the app loads
  useEffect(() => {
    setServerStatus('connected');
  }, []);

  // Get sync status
  useEffect(() => {
    const updateSyncStatus = () => {
      setSyncStatus(dataSyncService.getSyncStatus());
    };
    
    updateSyncStatus();
    
    // Update sync status every 2 seconds for real-time countdown
    const interval = setInterval(updateSyncStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Effect to handle scroll position for all logs
  useEffect(() => {
    if (!showFullLog) return;
    Object.entries(logRefs.current).forEach(([sessionId, ref]) => {
      if (ref && ref.scrollHeight > ref.clientHeight) {
        // If user was at bottom before update, keep at bottom
        const isAtBottom = ref.scrollTop + ref.clientHeight >= ref.scrollHeight - 5;
        if (isAtBottom) {
          ref.scrollTop = ref.scrollHeight;
        }
        // Otherwise, do not change scroll position
      }
    });
  }, [websiteDataState, showFullLog]);

  // Save scroll position BEFORE update (useLayoutEffect runs before DOM paint)
  useLayoutEffect(() => {
    if (!showFullLog) return;
    Object.entries(logRefs.current).forEach(([sessionId, ref]) => {
      if (ref) {
        logScrollTops.current[sessionId] = ref.scrollTop;
      }
    });
  }, [showFullLog, websiteDataState]);

  // Restore scroll position AFTER update
  useEffect(() => {
    if (!showFullLog) return;
    Object.entries(logRefs.current).forEach(([sessionId, ref]) => {
      if (ref && typeof logScrollTops.current[sessionId] === 'number') {
        ref.scrollTop = logScrollTops.current[sessionId];
      }
    });
  }, [showFullLog, websiteDataState]);

  // Fetch current session ID from Firebase on mount
  useEffect(() => {
    const sessionRef = ref(db, 'activeSessionId');
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      setCurrentSessionId(snapshot.val() || "");
    });
    return () => unsubscribe();
  }, []);

  // Start a new session and write to Firebase
  const handleStartSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const now = timeService.getCurrentTime();
      const hour = now.getHours();
      const sessionId = hour < 11 ? 'period1' : 'period2';
      await set(ref(db, 'activeSessionId'), sessionId);
      await set(ref(db, `sessions/${sessionId}/meta`), {
        startedAt: now.toISOString(),
        createdBy: 'teacher',
      });
    } catch (err) {
      // Optionally log error
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const handleBackToGames = () => {
    navigate('/');
  };

  const handleManualSync = async () => {
    try {
      const result = await dataSyncService.performManualSync();
      if (result.success) {
        console.log('Manual sync completed successfully');
      } else {
        console.error('Manual sync failed:', result.error);
      }
    } catch (error) {
      console.error('Manual sync error:', error);
    }
  };

  const handleToggleSync = () => {
    const isNowOn = dataSyncService.toggleSync();
    setSyncStatus(dataSyncService.getSyncStatus());
  };

  const renderESPDataTree = (data, level = 0) => {
    if (!data || typeof data !== 'object') {
      return <span style={{ color: '#666' }}>{JSON.stringify(data)}</span>;
    }

    const getColorForKey = (key) => {
      if (key.includes('ESP_')) return '#dc3545';
      if (key.includes('TEST_')) return '#fd7e14';
      return '#007bff';
    };

    return (
      <div style={{ marginLeft: level * 20 }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '8px' }}>
            <span style={{ 
              fontWeight: 'bold', 
              color: getColorForKey(key),
              cursor: 'pointer'
            }}>
              {key}:
            </span>
            {typeof value === 'object' ? (
              <renderESPDataTree data={value} level={level + 1} />
            ) : (
              <span style={{ color: '#666', marginLeft: '8px' }}>{JSON.stringify(value)}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderWebsiteDataTree = (data, level = 0) => {
    if (!data || typeof data !== 'object') {
      return <span style={{ color: '#666' }}>{JSON.stringify(data)}</span>;
    }

    const getColorForKey = (key) => {
      if (key.includes('session')) return '#28a745';
      if (key.includes('user')) return '#17a2b8';
      return '#6f42c1';
    };

    return (
      <div style={{ marginLeft: level * 20 }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '8px' }}>
            <span style={{ 
              fontWeight: 'bold', 
              color: getColorForKey(key),
              cursor: 'pointer'
            }}>
              {key}:
            </span>
            {typeof value === 'object' ? (
              <renderWebsiteDataTree data={value} level={level + 1} />
            ) : (
              <span style={{ color: '#666', marginLeft: '8px' }}>{JSON.stringify(value)}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ESP statistics from useESPData hook
  const uniqueDevices = uniqueStudents;
  const totalInteractions = espData.reduce((sum, p) => sum + (parseInt(p.beaconArray) || 0), 0);
  const totalButtonPresses = espData.reduce((sum, p) => sum + (parseInt(p.buttonA) || 0) + (parseInt(p.buttonB) || 0), 0);

  // Website data stats
  const websiteData = websiteDataState.sessions || {};
  const sessionCount = Object.keys(websiteData).length;
  const userActionsCount = (() => {
    let count = 0;
    Object.values(websiteData).forEach(session => {
      Object.values(session).forEach(entry => {
        if (entry.userActions) count += entry.userActions.length;
      });
    });
    return count;
  })();
  const journalEntriesCount = (() => {
    let count = 0;
    Object.values(websiteData).forEach(session => {
      Object.values(session).forEach(entry => {
        if (entry.journal && entry.journal.answers) count += Object.keys(entry.journal.answers).length;
      });
    });
    return count;
  })();

  // Device activity (latest 5 packets)
  const recentPackets = espData
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  // Real-time data (latest X packets)
  const latestPackets = espData
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  // Firebase status
  const firebaseStatus = serverStatus === 'connected' ? (
    <span style={{ color: '#28a745', fontWeight: 600 }}>Firebase Connected</span>
  ) : (
    <span style={{ color: '#dc3545', fontWeight: 600 }}>Firebase Disconnected</span>
  );

  // Logging/streaming status
  const loggingActive = syncStatus?.isRunning;

  // Top bar: Control Panel title and back button only
  const TopBar = () => (
    <div style={{ 
      background: 'linear-gradient(90deg, #6a82fb 0%, #a084ee 100%)',
      borderRadius: '0 0 18px 18px',
      padding: '32px 40px 24px 40px',
      marginBottom: 32,
      color: '#fff',
      boxShadow: '0 2px 12px rgba(80,80,180,0.10)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      minHeight: 80,
    }}>
      <button onClick={handleBackToGames} style={{ background: '#7c8cf8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>&larr; Back to Games</button>
      <h1 style={{ margin: 0, fontSize: 38, fontWeight: 800, letterSpacing: 1, textShadow: '0 2px 8px rgba(0,0,0,0.10)', color: '#fffbe8' }}>Control Panel</h1>
      <div style={{ width: 180 }} /> {/* Spacer for symmetry */}
    </div>
  );

  // Header/status card: all status/info badges and time
  const HeaderSection = () => (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        {serverStatus === 'connected' ? badge('#43d675', 'Firebase Connected') : badge('#dc3545', 'Firebase Disconnected')}
        {badge('#e74c3c', `Logging ${loggingActive ? 'ON' : 'OFF'}`)}
        <span style={{ fontSize: 18, fontWeight: 500, color: '#222' }}>San Diego Time (PDT): <SanDiegoClock /></span>
        <span style={{ color: '#007bff', fontWeight: 600, fontSize: 17 }}>Real-Time Streaming</span>
      </div>
      <div style={{ color: '#666', fontSize: '0.95rem', marginBottom: 0 }}>
        {serverStatus === 'connected' ? (
          loggingActive ? (
            <>One-minute logging is <b>ENABLED</b>. User actions and journal entries are being sent to the server and Firebase in real time.</>
          ) : (
            <>Firebase is connected. Click <b>START</b> to enable one-minute logging to server and Firebase.</>
          )
        ) : (
          <>Firebase connection failed. Check your internet connection and Firebase configuration.</>
        )}
      </div>
    </div>
  );

  // Streaming controls card
  const StreamingControls = () => (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#222', marginBottom: 2 }}>Real-Time Streaming</div>
          <div style={{ fontSize: 15, color: '#666', fontStyle: 'italic' }}>{loggingActive ? 'Data is being sent to server and Firebase.' : 'No data being sent to server or Firebase'}</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={handleToggleSync} style={{ background: loggingActive ? '#e74c3c' : '#43d675', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 800, fontSize: 20, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>{loggingActive ? 'STOP' : 'START'}</button>
          <button onClick={handleManualSync} style={{ background: '#7c8cf8', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>Manual Sync</button>
        </div>
      </div>
      <div style={{ background: '#fffbe6', borderRadius: 8, padding: '16px 18px', margin: '18px 0 10px 0', border: '1px solid #ffe58f', color: '#8d6a00', fontWeight: 600, fontSize: 17 }}>
        <b>Streaming {loggingActive ? 'Enabled' : 'Disabled'}:</b> {loggingActive ? 'User actions and journal entries are being sent to the server and Firebase in real time.' : 'No data is being sent to the server or Firebase. User actions and journal entries are only stored locally in your browser. Click the START button to enable one-minute logging to server and immediate Firebase logging.'}
      </div>
      <div style={{ fontWeight: 700, color: '#4a5cff', fontSize: 18, marginTop: 8 }}>
        Status: <span style={{ color: '#222' }}>{loggingActive ? 'All Logging Enabled' : 'All Logging Disabled'}</span>
        <span style={{ marginLeft: 32, color: '#4a5cff' }}>Server:</span>
      </div>
    </div>
  );

  // ESP Device Testing Panel
  const ESPTestingPanel = () => (
    <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 12 }}>
        {firebaseStatus}
        <span style={{ color: '#333', fontWeight: 600 }}>ESP Statistics</span>
        <span style={{ fontWeight: 700, color: '#1976d2' }}>{totalPackets}</span> Total Packets
        <span style={{ fontWeight: 700, color: '#2e7d32' }}>{uniqueDevices}</span> Active Devices
        <span style={{ fontWeight: 700, color: '#7b1fa2' }}>{totalInteractions}</span> Interactions
        <span style={{ fontWeight: 700, color: '#ff9800' }}>{totalButtonPresses}</span> Button Presses
      </div>
      
      {espError && (
        <div style={{ background: '#ffe6e6', color: '#d32f2f', padding: '8px 12px', borderRadius: 4, marginBottom: 12, fontSize: '0.9rem' }}>
          <strong>Error loading ESP data:</strong> {espError}
        </div>
      )}
      
      <div style={{ marginBottom: 12 }}>
        <span style={{ color: '#333', fontWeight: 600 }}>Device Activity</span>
        <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 4, minHeight: 40, marginTop: 6 }}>
          {espLoading ? (
            <span style={{ color: '#888' }}>Loading ESP data...</span>
          ) : recentPackets.length === 0 ? (
            <span style={{ color: '#888' }}>No ESP data found in Firebase. ESP devices may not be connected or no data has been sent yet.</span>
          ) : (
            recentPackets.map((packet, idx) => (
              <div key={idx} style={{ marginBottom: 6, fontSize: '0.95rem' }}>
                <b>{packet.id || packet.deviceId || 'Unknown'}</b> @ {packet.timestamp ? formatSanDiegoTime(new Date(packet.timestamp)) : 'N/A'} | 
                Status: {packet.status?.toFixed(2) || 'N/A'} | 
                A: {packet.buttonA || 0}, B: {packet.buttonB || 0} | 
                Beacon: {packet.beaconArray || 0}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div>
        <span style={{ color: '#333', fontWeight: 600 }}>Real-Time Data</span>
        <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 4, minHeight: 40, marginTop: 6 }}>
          {espLoading ? (
            <span style={{ color: '#888' }}>Loading ESP data...</span>
          ) : latestPackets.length === 0 ? (
            <span style={{ color: '#888' }}>No ESP packets found in Firebase. Check if ESP devices are connected and sending data.</span>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Latest {latestPackets.length} packets</div>
              {latestPackets.map((packet, idx) => (
                <div key={idx} style={{ fontSize: '0.95rem', marginBottom: 4 }}>
                  <b>{packet.id || packet.deviceId || 'Unknown'}</b> @ {packet.timestamp ? formatSanDiegoTime(new Date(packet.timestamp)) : 'N/A'} | 
                  Status: {packet.status?.toFixed(2) || 'N/A'} | 
                  A: {packet.buttonA || 0}, B: {packet.buttonB || 0} | 
                  Beacon: {packet.beaconArray || 0}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ESP Data Section: show all ESP packets as raw JSON
  const ESPDataSection = () => {
    const devicePackets = espDataState.devicePackets || {};
    const now = timeService.getCurrentTime();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    // Filter packets from the past hour
    const filteredPackets = Object.entries(devicePackets)
      .filter(([_, packet]) => {
        const ts = packet.timestamp ? new Date(packet.timestamp) : null;
        return ts && ts >= oneHourAgo && ts <= now;
      });
    return (
      <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: '#333' }}>ESP Data (Past Hour)</h2>
          <button onClick={refreshESPData} style={{ background: '#2a6ebb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }} disabled={espLoading}>{espLoading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Last refreshed: {espLastRefreshed ? formatSanDiegoTime(espLastRefreshed) : 'Never'}</div>
        {espError && <div style={{ color: '#b00', marginBottom: 8 }}>{espError}</div>}
        {filteredPackets.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No ESP data from the past hour. Click refresh to load.</div>
        ) : (
          filteredPackets.map(([packetId, packet]) => (
            <div key={packetId} style={{ background: '#f8f9fa', borderRadius: 6, padding: 12, marginBottom: 12, fontFamily: 'monospace', fontSize: 13 }}>
              <b>Packet ID:</b> {packetId}
              <pre style={{ margin: 0 }}>{JSON.stringify(packet, null, 2)}</pre>
              </div>
          ))
        )}
      </div>
    );
  };

  // Website Data Section: show all userActions as raw JSON
  const WebsiteDataSection = () => {
    const userActions = websiteDataState.userActions || {};
    const now = timeService.getCurrentTime();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    // Flatten and filter user actions from the past hour
    const filteredActions = Object.entries(userActions)
      .flatMap(([sessionId, actions]) =>
        (Array.isArray(actions) ? actions : Object.values(actions)).map(action => ({ ...action, sessionId }))
      )
      .filter(action => {
        const ts = action.timestamp ? new Date(action.timestamp) : null;
        return ts && ts >= oneHourAgo && ts <= now;
      });
    return (
      <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: '#333' }}>Website Data (Past Hour)</h2>
          <button onClick={refreshWebsiteData} style={{ background: '#2a6ebb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }} disabled={websiteLoading}>{websiteLoading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Last refreshed: {websiteLastRefreshed ? formatSanDiegoTime(websiteLastRefreshed) : 'Never'}</div>
        {websiteError && <div style={{ color: '#b00', marginBottom: 8 }}>{websiteError}</div>}
        {filteredActions.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No Website data from the past hour. Click refresh to load.</div>
        ) : (
          filteredActions.map((action, idx) => (
            <div key={idx} style={{ background: '#f8f9fa', borderRadius: 6, padding: 12, marginBottom: 12, fontFamily: 'monospace', fontSize: 13 }}>
              <b>Session:</b> {action.sessionId}
              <pre style={{ margin: 0 }}>{JSON.stringify(action, null, 2)}</pre>
            </div>
          ))
        )}
      </div>
    );
  };

  // Journal Data Section: show all journalEntries as raw JSON
  const JournalDataSection = () => {
    const journalEntries = journalDataState.journalEntries || {};
    const now = timeService.getCurrentTime();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    // Flatten and filter journal entries from the past hour
    const filteredEntries = Object.entries(journalEntries)
      .flatMap(([sessionId, entries]) =>
        (Array.isArray(entries) ? entries : Object.values(entries)).map(entry => ({ ...entry, sessionId }))
      )
      .filter(entry => {
        const ts = entry.timestamp ? new Date(entry.timestamp) : null;
        return ts && ts >= oneHourAgo && ts <= now;
      });
    return (
      <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: '#333' }}>Journal Data (Past Hour)</h2>
          <button onClick={refreshJournalData} style={{ background: '#2a6ebb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }} disabled={journalLoading}>{journalLoading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Last refreshed: {journalLastRefreshed ? formatSanDiegoTime(journalLastRefreshed) : 'Never'}</div>
        {journalError && <div style={{ color: '#b00', marginBottom: 8 }}>{journalError}</div>}
        {filteredEntries.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No Journal data from the past hour. Click refresh to load.</div>
        ) : (
          filteredEntries.map((entry, idx) => (
            <div key={idx} style={{ background: '#f8f9fa', borderRadius: 6, padding: 12, marginBottom: 12, fontFamily: 'monospace', fontSize: 13 }}>
              <b>Session:</b> {entry.sessionId}
              <pre style={{ margin: 0 }}>{JSON.stringify(entry, null, 2)}</pre>
          </div>
          ))
        )}
      </div>
    );
  };

  // Session Management UI
  const SessionManager = () => (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 24, margin: '24px 0', display: 'flex', alignItems: 'center', gap: 24 }}>
      <div>
        <b>Current Session:</b> {currentSessionId ? <span style={{ color: '#2a6ebb' }}>{currentSessionId}</span> : <span style={{ color: '#888' }}>No session active</span>}
      </div>
      <button
        onClick={handleStartSession}
        style={{ background: '#2a6ebb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
        disabled={sessionLoading}
      >
        {sessionLoading ? 'Starting...' : 'Start New Session'}
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <TopBar />
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
        <SessionManager />
        <HeaderSection />
        <StreamingControls />
        <ESPTestingPanel />
        <ESPDataSection />
        <WebsiteDataSection />
        <JournalDataSection />
      </div>
    </div>
  );
};

export default ControlPanel; 