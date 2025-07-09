import { db, ref, set, get } from '../firebase';

// Sanitize for Firebase keys
function sanitize(str) {
  return (str || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Get userId (codename) from localStorage
function getUserId() {
  try {
    return sanitize(localStorage.getItem('selectedPlayer'));
  } catch {
    return '';
  }
}

// Get sessionId from localStorage
function getSessionId() {
  try {
    return sanitize(localStorage.getItem('activeSessionId'));
  } catch {
    return '';
  }
}

// Fetch and cache sessionId from Firebase on first load
async function initSessionId() {
  try {
    const sessionIdRef = ref(db, 'activeSessionId');
    const snapshot = await get(sessionIdRef);
    if (snapshot.exists()) {
      localStorage.setItem('activeSessionId', snapshot.val());
    }
  } catch {}
}

// Log batching
let logBuffer = [];
let flushTimeout = null;
const FLUSH_INTERVAL = 10000; // 10 seconds
const MAX_BATCH = 10;

function flushLogs() {
  if (!logBuffer.length) return;
  const sessionId = getSessionId();
  const userId = getUserId();
  if (!sessionId || !userId) {
    logBuffer = [];
    return;
  }
  const logsToSend = logBuffer.slice();
  logBuffer = [];
  logsToSend.forEach(log => {
    try {
      const ts = sanitize(log.timestamp);
      const path = `sessions/${sessionId}/UserLogs/${userId}/${ts}`;
      set(ref(db, path), log).catch(() => {});
    } catch {}
  });
}

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushLogs();
  }, FLUSH_INTERVAL);
}

function logAction({ type, action, details }) {
  try {
    // Only allow specified types
    if (!['journal_entry', 'plot_interaction', 'navigation'].includes(type)) return;
    // Only allow specified journal actions
    if (type === 'journal_entry' && !['click_on', 'click_off', 'submit'].includes(action)) return;
    // Only allow specified plot actions
    if (type === 'plot_interaction' && ![
      'type_changed', 'x_variable_toggled', 'y_variable_toggled', 'histogram_x_variable_toggled',
      'pie_variable_selected', 'cadet_filter_toggled', 'cadet_filter_select_all', 'cadet_filter_deselect_all'
    ].includes(action)) return;
    // Only allow specified navigation actions
    if (type === 'navigation' && ![
      'tab_change', 'meeting_start', 'meeting_end', 'toggle_screen'
    ].includes(action)) return;
    const userId = getUserId();
    const sessionId = getSessionId();
    if (!userId || !sessionId) return;
    const timestamp = new Date().toISOString();
    const log = {
      type,
      action,
      timestamp,
      details: details || {}
    };
    logBuffer.push(log);
    if (logBuffer.length >= MAX_BATCH) {
      flushLogs();
      if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
      }
    } else {
      scheduleFlush();
    }
  } catch {}
}

// Flush on page unload
function flushOnUnload() {
  try { flushLogs(); } catch {}
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushOnUnload);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnUnload();
  });
  // Initialize sessionId on app load
  initSessionId();
}

export { logAction }; 