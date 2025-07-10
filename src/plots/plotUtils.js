// plotUtils.js - Utility functions for plot component logic

/**
 * Check if a variable is allowed for Y given X
 * @param {Object} allowedMatrix - The allowed variable combinations matrix
 * @param {string} x - The X variable
 * @param {string} y - The Y variable
 * @returns {boolean} - Whether the combination is allowed
 */
export function isYAllowed(allowedMatrix, x, y) {
  if (!allowedMatrix || !x || !y) return true;
  return allowedMatrix[x] && allowedMatrix[x][y];
}

/**
 * Check if a variable is allowed for X given Y
 * @param {Object} allowedMatrix - The allowed variable combinations matrix
 * @param {string} y - The Y variable
 * @param {string} x - The X variable
 * @returns {boolean} - Whether the combination is allowed
 */
export function isXAllowed(allowedMatrix, y, x) {
  if (!allowedMatrix || !x || !y) return true;
  return allowedMatrix[x] && allowedMatrix[x][y];
}

/**
 * Initialize variable filters for a given set of variables
 * @param {Array} variables - Array of variable names
 * @returns {Object} - Object with all variables set to false
 */
export function initializeVariableFilters(variables) {
  if (!variables) return {};
  return variables.reduce((acc, v) => ({ ...acc, [v]: false }), {});
}

/**
 * Initialize cadet filter for all player names
 * @param {Array} playerNames - Array of player names
 * @returns {Object} - Object with all players set to false
 */
export function initializeCadetFilter(playerNames) {
  return playerNames.reduce((acc, name) => ({ ...acc, [name]: false }), {});
}

/**
 * Filter data based on selected variables and cadet/sector filter
 * @param {Array} data - Raw data array
 * @param {Array} xVars - Selected X variables
 * @param {Array} yVars - Selected Y variables
 * @param {Object} cadetFilter - Cadet and sector filter object (keys: device IDs, values: boolean)
 * @returns {Array} - Array of series objects for plotting
 */
export function filterData(data, xVars, yVars, cadetFilter) {
  if (!Array.isArray(data)) return [];
  // Get all selected device IDs (cadets and/or sectors)
  const selectedIds = cadetFilter
    ? Object.entries(cadetFilter).filter(([id, selected]) => selected).map(([id]) => id)
    : [];
  // If no filters are selected, use all device_ids present in data
  const filtered = selectedIds.length > 0
    ? data.filter(record => selectedIds.includes(record.device_id))
    : data;

  // If no x/y vars selected, return empty array (prevents empty plot)
  if (!xVars || !yVars || xVars.length === 0 || yVars.length === 0) return [];

  // Mapping from UI variable names to data field names
  const variableFieldMap = {
    "Time": "localTime", // Use localTime (Date object in San Diego time)
    "Meetings Held": "meetings_held",
    "Infected Cadets": "infected_cadets",
    "Infected Sectors": "infected_sectors",
    "Healthy Cadets": "healthy_cadets",
    "Healthy Sectors": "healthy_sectors"
  };

  // Group by device_id
  const grouped = {};
  for (const record of filtered) {
    const id = record.device_id;
    if (!grouped[id]) grouped[id] = [];
    // For each yVar, create a point for each xVar/yVar combo
    for (const yVar of yVars) {
      for (const xVar of xVars) {
        const xField = variableFieldMap[xVar];
        const yField = variableFieldMap[yVar];
        if (xField == null || yField == null) continue;
        if (record[xField] == null || record[yField] == null) continue;
        grouped[id].push({ x: record[xField], y: record[yField] });
      }
    }
  }
  // Convert to series array
  return Object.entries(grouped).map(([id, points]) => ({
    label: id,
    data: points
  }));
}

/**
 * Handle variable selection/deselection
 * @param {Array} currentVars - Current selected variables
 * @param {string} variable - Variable to toggle
 * @param {boolean} isSelected - Whether to add or remove
 * @returns {Array} - Updated variables array
 */
export function toggleVariable(currentVars, variable, isSelected) {
  if (isSelected) {
    return [...currentVars, variable];
  } else {
    return currentVars.filter(v => v !== variable);
  }
}

/**
 * Log plot action with label
 * @param {Function} logAction - Logging function
 * @param {string} plotLabel - Label for the plot
 * @param {string} action - Action description
 */
export function logPlotAction(logAction, plotLabel, action) {
  if (logAction) {
    logAction(`${plotLabel} ${action}`);
  }
} 