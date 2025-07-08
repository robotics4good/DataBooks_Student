// dataSyncService.js - Service for syncing journal and user action data to Firebase
import { getCurrentSanDiegoTime } from '../utils/timeUtils';
import { db, ref, push, set } from '../firebase';
import { timeService } from '../utils/timeUtils';

class DataSyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false; // Default to OFF
    this.lastSyncTime = null;
  }

  /**
   * Start the automatic sync process (every minute)
   */
  startSync() {
    if (this.isRunning) {
      console.log('Data sync already running');
      return;
    }
    this.isRunning = true;
    console.log('Starting data sync service (every minute)');
    // Initial sync (append)
    this.performSync();
    // Set up interval for every minute (append)
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 60000); // 60 seconds = 1 minute
  }

  /**
   * Toggle the sync service on/off
   */
  toggleSync() {
    if (this.isRunning) {
      this.stopSync();
      console.log("🛑 Real-time streaming disabled - no data will be sent to Firebase");
      return false; // Return false to indicate it's now off
    } else {
      this.startSync();
      console.log("🟢 Real-time streaming enabled - data will be sent to Firebase every minute");
      return true; // Return true to indicate it's now on
    }
  }

  /**
   * Stop the automatic sync process
   */
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Data sync service stopped');
  }

  /**
   * Perform a manual sync (append)
   */
  async performManualSync() {
    console.log('Performing manual data sync to Firebase');
    return await this.performSync();
  }

  /**
   * Get the current sync status
   */
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      nextSyncIn: this.getNextSyncTime()
    };
  }

  /**
   * Get time until next sync
   */
  getNextSyncTime() {
    if (!this.isRunning || !this.lastSyncTime) {
      return null;
    }
    
    const lastSync = new Date(this.lastSyncTime);
    const nextSync = new Date(lastSync.getTime() + 60000); // Add 1 minute
    const now = new Date();
    const diffMs = nextSync.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 'Due now';
    }
    
    const diffSeconds = Math.ceil(diffMs / 1000);
    return `${diffSeconds}s`;
  }

  /**
   * Perform the actual sync operation (append)
   */
  async performSync() {
    try {
      // Get current timestamp
      const syncTimestamp = timeService.getCurrentTime();
      // Get all data to sync
      const userActions = this.getUserActions();
      const journalData = this.getJournalData();
      const sessionId = this.getSessionId();
      // Sync user actions (hybrid: latest + append)
      await this.syncUserActionsToFirebase(sessionId, userActions, syncTimestamp);
      // Sync journal entries (hybrid: latest + append)
      await this.syncJournalEntriesToFirebase(sessionId, journalData, syncTimestamp);
      // Update last sync time
      this.lastSyncTime = syncTimestamp;
      console.log('Data sync to Firebase completed successfully:', {
        timestamp: syncTimestamp,
        userActionsCount: userActions.length,
        journalEntriesCount: Object.keys(journalData.answers || {}).length,
        sessionId
      });
      return { success: true, timestamp: syncTimestamp, sessionId };
    } catch (error) {
      console.error('Data sync to Firebase failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync user actions to Firebase (hybrid: overwrite latest and append to history)
   */
  async syncUserActionsToFirebase(sessionId, userActions, syncTimestamp) {
    try {
      const userActionsLatestRef = ref(db, `userActions/${sessionId}/latest`);
      await set(userActionsLatestRef, {
        actions: userActions,
        lastUpdated: syncTimestamp
      });
      // Append to history
      const userActionsHistoryRef = ref(db, `userActions/${sessionId}/history`);
      await push(userActionsHistoryRef, {
        actions: userActions,
        timestamp: syncTimestamp
      });
    } catch (error) {
      console.error('Failed to sync user actions to Firebase:', error);
      throw error;
    }
  }

  /**
   * Sync journal entries to Firebase (hybrid: overwrite latest and append to history)
   */
  async syncJournalEntriesToFirebase(sessionId, journalData, syncTimestamp) {
    try {
      const journalEntriesLatestRef = ref(db, `journalEntries/${sessionId}/latest`);
      await set(journalEntriesLatestRef, {
        answers: journalData.answers,
        lastUpdated: syncTimestamp
      });
      // Append to history
      const journalEntriesHistoryRef = ref(db, `journalEntries/${sessionId}/history`);
      await push(journalEntriesHistoryRef, {
        answers: journalData.answers,
        timestamp: syncTimestamp
      });
    } catch (error) {
      console.error('Failed to sync journal entries to Firebase:', error);
      throw error;
    }
  }

  /**
   * Gather all data that needs to be synced
   */
  async gatherAllData(syncTimestamp) {
    // Get user actions from localStorage or context
    const userActions = this.getUserActions();
    
    // Get journal data from localStorage or context
    const journalData = this.getJournalData();
    
    // Get ESP data summary
    const espDataSummary = this.getESPDataSummary();
    
    // Get current session info
    const sessionInfo = this.getSessionInfo();

    return {
      syncTimestamp,
      sessionInfo,
      userActions,
      journalData,
      espDataSummary,
      metadata: {
        totalUserActions: userActions.length,
        totalJournalEntries: Object.keys(journalData.answers || {}).length,
        espDataCount: espDataSummary.totalPackets || 0,
        syncVersion: '1.0'
      }
    };
  }

  /**
   * Get user actions from localStorage or context
   */
  getUserActions() {
    try {
      // Try to get from localStorage first
      const stored = localStorage.getItem('userActions');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Fallback: return empty array
      return [];
    } catch (error) {
      console.warn('Failed to get user actions:', error);
      return [];
    }
  }

  /**
   * Get journal data from localStorage or context
   */
  getJournalData() {
    try {
      // Try to get from localStorage first
      const stored = localStorage.getItem('journalAnswers');
      if (stored) {
        return {
          answers: JSON.parse(stored),
          timestamp: timeService.getCurrentTime().toISOString()
        };
      }
      
      // Fallback: return empty object
      return { answers: {}, timestamp: timeService.getCurrentTime().toISOString() };
    } catch (error) {
      console.warn('Failed to get journal data:', error);
      return { answers: {}, timestamp: timeService.getCurrentTime().toISOString() };
    }
  }

  /**
   * Get ESP data summary
   */
  getESPDataSummary() {
    try {
      // Try to get from localStorage
      const stored = localStorage.getItem('espDataSummary');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Fallback: return basic summary
      return {
        totalPackets: 0,
        uniqueStudents: 0,
        lastUpdate: timeService.getCurrentTime().toISOString()
      };
    } catch (error) {
      console.warn('Failed to get ESP data summary:', error);
      return {
        totalPackets: 0,
        uniqueStudents: 0,
        lastUpdate: timeService.getCurrentTime().toISOString()
      };
    }
  }

  /**
   * Get current session information
   */
  getSessionInfo() {
    return {
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      currentGame: this.getCurrentGame(),
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`
      },
      timestamp: timeService.getCurrentTime().toISOString()
    };
  }

  /**
   * Get or generate session ID
   */
  getSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Get user ID
   */
  getUserId() {
    return localStorage.getItem('selectedPlayer') || 'S1';
  }

  /**
   * Get current game
   */
  getCurrentGame() {
    const path = window.location.pathname;
    if (path.includes('alien-invasion')) return 'alien-invasion';
    if (path.includes('whisper-web')) return 'whisper-web';
    if (path.includes('logistics-league')) return 'logistics-league';
    if (path.includes('pollination-party')) return 'pollination-party';
    if (path.includes('rush-hour-rebels')) return 'rush-hour-rebels';
    if (path.includes('control-panel')) return 'control-panel';
    return 'landing';
  }

  /**
   * Send data to Firebase
   */
  async sendToFirebase(data) {
    try {
      // Create a new entry in the syncData path
      const syncDataRef = ref(db, 'syncData');
      const newSyncRef = push(syncDataRef);
      
      // Set the data with the generated key
      await set(newSyncRef, {
        ...data,
        firebaseKey: newSyncRef.key,
        uploadedAt: timeService.getCurrentTime().toISOString()
      });
      
      return newSyncRef.key;
    } catch (error) {
      console.error('Failed to send data to Firebase:', error);
      throw error;
    }
  }

  /**
   * Update ESP data summary in localStorage
   */
  updateESPDataSummary(summary) {
    try {
      localStorage.setItem('espDataSummary', JSON.stringify({
        ...summary,
        lastUpdate: timeService.getCurrentTime().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to update ESP data summary:', error);
    }
  }

  /**
   * Update user actions in localStorage
   */
  updateUserActions(actions) {
    try {
      localStorage.setItem('userActions', JSON.stringify(actions));
    } catch (error) {
      console.warn('Failed to update user actions:', error);
    }
  }

  /**
   * Update journal data in localStorage
   */
  updateJournalData(answers) {
    try {
      localStorage.setItem('journalAnswers', JSON.stringify(answers));
    } catch (error) {
      console.warn('Failed to update journal data:', error);
    }
  }
}

// Create singleton instance
const dataSyncService = new DataSyncService();

export default dataSyncService; 