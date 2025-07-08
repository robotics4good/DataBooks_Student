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
 * Filter data based on selected variables and cadet filter
 * @param {Array} data - Raw data array
 * @param {Array} xVars - Selected X variables
 * @param {Array} yVars - Selected Y variables
 * @param {Object} cadetFilter - Cadet filter object
 * @returns {Array} - Filtered data
 */
export function filterData(data, xVars, yVars, cadetFilter) {
  // TODO: implement filtering based on xVars, yVars, cadetFilter
  return data;
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