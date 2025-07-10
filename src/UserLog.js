import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, ref, push, set, get } from "./firebase";
import { getLocalIsoString } from './utils/timeUtils';
import { logAction as batchedLogAction } from "./services/userActionLogger";

const UserLogContext = createContext();

export const useUserLog = () => {
  const context = useContext(UserLogContext);
  if (!context) {
    throw new Error('useUserLog must be used within a UserLogProvider');
  }
  return context;
};

export const UserLogProvider = ({ children }) => {
  const [userActions, setUserActions] = useState([]);
  const [loggingEnabled, setLoggingEnabled] = useState(false);

  // Get the selected player from localStorage, fallback to 'S1' if not set
  const userId = localStorage.getItem('selectedPlayer') || 'S1';

  // Load user actions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userActions');
      if (stored) {
        const actions = JSON.parse(stored);
        setUserActions(actions);
      }
    } catch (error) {
      console.warn('Failed to load user actions from localStorage:', error);
    }
  }, []);

  // Data sync service is OFF by default - user must manually enable
  useEffect(() => {
    // Don't start sync automatically - let user control it
    
    // Cleanup on unmount
    return () => {};
  }, []);

  // Helper to get sessionId from Firebase (activeSessionId)
  const getSessionId = async () => {
    const sessionIdRef = ref(db, 'activeSessionId');
    const snapshot = await get(sessionIdRef);
    return snapshot.exists() ? snapshot.val() : null;
  };

  // Remove the local logAction and use batchedLogAction for all logging
  // Make logAction async to use local device time
  const logAction = async (type, details) => {
    if (!loggingEnabled) return;
    const timestamp = getLocalIsoString();
    const cleanDetails = details ?? "";
    const action = {
      id: userId,
      timestamp,
      type,
      details: cleanDetails
    };
    setUserActions(prev => {
      const newActions = [...prev, action];
      return newActions;
    });
    // Log to sessions/{sessionId}/UserLogs/{userId}/{timestamp}
    const sessionId = await getSessionId();
    if (!sessionId) {
      console.warn('No sessionId available, not logging to Firebase');
      return;
    }
    const sanitizedTimestamp = timestamp.replace(/[^a-zA-Z0-9_-]/g, '_');
    const logPath = `sessions/${sessionId}/UserLogs/${userId}/${sanitizedTimestamp}`;
    await set(ref(db, logPath), action);
  };

  const startLogging = () => setLoggingEnabled(true);

  return (
    <UserLogContext.Provider value={{ 
      userActions, 
      logAction: batchedLogAction, 
      startLogging
    }}>
      {children}
    </UserLogContext.Provider>
  );
}; 