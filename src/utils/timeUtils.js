// timeUtils.js - Utility functions for local device time only

/**
 * Get the current local device time as a Date object
 */
export function getLocalTime() {
  return new Date();
}

/**
 * Get the current local device time as an ISO string (with local offset)
 */
export function getLocalIsoString() {
  const date = new Date();
  // toISOString() returns UTC, so format manually for local offset
  const pad = n => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  // Get timezone offset in ±HH:MM
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const offsetHH = pad(Math.floor(absOffset / 60));
  const offsetMM = pad(absOffset % 60);
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${sign}${offsetHH}:${offsetMM}`;
}

/**
 * Get only the local time as HH:mm:ss
 */
export function getLocalTimeOnlyString(date = new Date()) {
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Format a date as a local string (e.g., for UI display)
 */
export function formatLocalTime(date = new Date(), opts = {}) {
  return date.toLocaleString(undefined, opts);
} 