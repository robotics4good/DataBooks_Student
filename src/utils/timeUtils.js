// timeUtils.js - Utility functions for NIST time API and San Diego timezone handling

import { toZonedTime, format as formatTz } from 'date-fns-tz';

/**
 * Fetch current time from NIST time servers
 * Uses the official NIST time API
 */
export async function getNistTime() {
  try {
    // Try multiple NIST time servers for redundancy
    const nistServers = [
      'https://time.nist.gov/api/v1/time',
      'https://worldtimeapi.org/api/timezone/America/Los_Angeles'
    ];

    for (const server of nistServers) {
      try {
        const response = await fetch(server, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Handle different API response formats
        if (data.utc_datetime) {
          // worldtimeapi.org format
          return data.utc_datetime;
        } else if (data.datetime) {
          // NIST API format
          return data.datetime;
        } else if (data.utc) {
          // Alternative NIST format
          return data.utc;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${server}:`, error.message);
        continue;
      }
    }
    
    // If all NIST servers fail, fallback to local time
    throw new Error('All NIST servers failed');
  } catch (error) {
    console.warn('NIST time fetch failed, using local time:', error.message);
    // Always return San Diego time as ISO string with offset, never UTC
    return formatTz(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'America/Los_Angeles' });
  }
}

/**
 * Get timezone offset information for San Diego
 * @returns {Object} - Timezone information
 */
export function getSanDiegoTimezoneInfo() {
  const now = toZonedTime(new Date(), 'America/Los_Angeles');
  const sanDiegoTime = toZonedTime(new Date(), "America/Los_Angeles");
  
  const utcTime = toZonedTime(new Date(), "UTC");
  
  const offsetMs = sanDiegoTime.getTime() - utcTime.getTime();
  const offsetHours = offsetMs / (1000 * 60 * 60);
  
  return {
    timezone: "America/Los_Angeles",
    offset: offsetHours,
    offsetString: offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`,
    abbreviation: offsetHours === -8 ? "PST" : "PDT", // Pacific Standard Time or Pacific Daylight Time
    isDST: offsetHours === -7 // PDT is -7, PST is -8
  };
}

/**
 * Check if San Diego is currently in Daylight Saving Time
 * @returns {boolean} - True if DST is active
 */
export function isSanDiegoDST() {
  const tzInfo = getSanDiegoTimezoneInfo();
  return tzInfo.isDST;
}

// --- TimeService Singleton for 15-min NIST/US Pacific time caching ---
class TimeService {
  constructor() {
    this.sanDiegoAnchor = null; // Date object in San Diego time
    this.lastSync = null; // Date object (system time at last sync)
    this.syncInterval = null;
    this.isSyncing = false;
    this.listeners = [];
    this.start();
  }

  async fetchNistTime() {
    this.isSyncing = true;
    try {
      const nistTimeStr = await getNistTime(); // UTC string
      // Convert to San Diego time immediately and store as Date
      const utcDate = new Date(nistTimeStr);
      this.sanDiegoAnchor = toZonedTime(utcDate, 'America/Los_Angeles');
      this.lastSync = new Date();
      this.notifyListeners();
    } catch (err) {
      // fallback: use local time in San Diego zone
      this.sanDiegoAnchor = toZonedTime(new Date(), 'America/Los_Angeles');
      this.lastSync = new Date();
      this.notifyListeners();
    } finally {
      this.isSyncing = false;
    }
  }

  start() {
    this.fetchNistTime();
    if (this.syncInterval) clearInterval(this.syncInterval);
    // 10 minutes = 600,000 ms
    this.syncInterval = setInterval(() => this.fetchNistTime(), 600000);
  }

  getSanDiegoTime() {
    if (!this.sanDiegoAnchor || !this.lastSync) return toZonedTime(new Date(), 'America/Los_Angeles');
    const now = new Date();
    const elapsed = now.getTime() - this.lastSync.getTime();
    return new Date(this.sanDiegoAnchor.getTime() + elapsed);
  }

  // Optional: allow components to listen for time updates
  subscribe(listener) {
    this.listeners.push(listener);
  }
  unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  notifyListeners() {
    this.listeners.forEach(l => l(this.getSanDiegoTime()));
  }
}

export const timeService = new TimeService();

// Centralized function to get current NIST-anchored San Diego time as Luxon DateTime
export function getSanDiegoTime() {
  return timeService.getSanDiegoTime();
}

// Utility to get NIST-anchored San Diego time as ISO string with offset
export function getSanDiegoIsoString() {
  // Format as ISO string with offset, e.g. 2024-06-01T05:00:00-07:00
  return formatTz(getSanDiegoTime(), "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'America/Los_Angeles' });
} 

// Optionally, provide a time-only formatter for plots
export function getSanDiegoTimeOnlyString(date) {
  return formatTz(date, 'HH:mm:ss', { timeZone: 'America/Los_Angeles' });
} 