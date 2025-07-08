import React from 'react';

const BUTTON_WIDTH = 200;
const DUAL_LABEL = 'Go Dual Screen';
const SINGLE_LABEL = 'Go Single Screen';

function padLabel(label) {
  // Pad the shorter label with non-breaking spaces to match the longer one
  const maxLen = Math.max(DUAL_LABEL.length, SINGLE_LABEL.length);
  const pad = (str) => str + '\u00A0'.repeat(maxLen - str.length);
  return pad(label);
}

const styles = {
  topBar: {
    width: '100%',
    margin: 0,
    borderRadius: 0,
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 32px',
    height: '56px',
    background: 'linear-gradient(90deg, #6a7fd6 0%, #7b5ed7 100%)',
    borderBottom: 'none',
    boxShadow: '0 2px 8px rgba(34,34,34,0.04)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  centerText: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    color: 'white',
    fontWeight: 700,
    fontSize: '1.25rem',
    letterSpacing: '0.02em',
    textShadow: '0 1px 4px rgba(0,0,0,0.08)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none', // allow clicks to pass through
    zIndex: 1,
  },
  button: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontWeight: 'bold',
    borderRadius: '10px',
    padding: '0.5em 1.2em',
    fontSize: '1rem',
    border: 'none',
    boxShadow: '0 1px 4px rgba(80,200,120,0.08)',
    transition: 'background 0.2s',
    cursor: 'pointer',
    marginRight: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5em',
    width: `${BUTTON_WIDTH}px`,
    minWidth: `${BUTTON_WIDTH}px`,
    maxWidth: `${BUTTON_WIDTH}px`,
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    zIndex: 2,
  },
  toggleButton: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontWeight: 'bold',
    borderRadius: '10px',
    padding: '0.5em 1.2em',
    fontSize: '1rem',
    border: 'none',
    boxShadow: '0 1px 4px rgba(80,200,120,0.08)',
    transition: 'background 0.2s',
    cursor: 'pointer',
    marginLeft: '16px',
    display: 'flex',
    alignItems: 'center',
    width: `${BUTTON_WIDTH}px`,
    minWidth: `${BUTTON_WIDTH}px`,
    maxWidth: `${BUTTON_WIDTH}px`,
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    zIndex: 2,
  },
  toggleLabel: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
};

const TopBar = ({ gameName, cadetName, onBack, onToggleView, toggleLabel }) => (
  <div style={styles.topBar}>
    <button onClick={onBack} style={styles.button}>
      <span style={{fontSize: '1.1em', marginRight: '0.3em'}}>&larr;</span> Back to Games
    </button>
    <div style={styles.centerText}>
      {gameName}{cadetName ? ` - ${cadetName}` : ''}
    </div>
    <button onClick={onToggleView} style={styles.toggleButton}>
      <span style={styles.toggleLabel}>{toggleLabel}</span>
    </button>
  </div>
);

export default TopBar; 