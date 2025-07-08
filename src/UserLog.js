import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, ref, push } from "./firebase";
import dataSyncService from "./services/dataSyncService";
import { timeService } from './utils/timeUtils';

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
    console.log('Data sync service ready - streaming is OFF by default');
    
    // Cleanup on unmount
    return () => {
      dataSyncService.stopSync();
    };
  }, []);

  // Make logAction async to await the NIST time
  const logAction = async (type, details) => {
    if (!loggingEnabled) return;
    const timestamp = timeService.getCurrentTime().toISOString();
    const cleanDetails = details ?? "";
    const action = {
      id: userId,
      timestamp,
      type,
      details: cleanDetails
    };
    setUserActions(prev => {
      const newActions = [...prev, action];
      dataSyncService.updateUserActions(newActions);
      return newActions;
    });
    if (dataSyncService.getSyncStatus().isRunning) {
      const userActivityRef = ref(db, `userActivity`);
      push(userActivityRef, action);
      console.log("🔥 Logged locally & sent to Firebase:", action);
    } else {
      console.log("📝 Logged locally only (streaming disabled):", action);
    }
  };

  const startLogging = () => setLoggingEnabled(true);

  // Add manual sync function
  const performManualSync = () => {
    return dataSyncService.performManualSync();
  };

  // Get sync status
  const getSyncStatus = () => {
    return dataSyncService.getSyncStatus();
  };

  return (
    <UserLogContext.Provider value={{ 
      userActions, 
      logAction, 
      performManualSync,
      getSyncStatus,
      startLogging
    }}>
      {children}
    </UserLogContext.Provider>
  );
}; 