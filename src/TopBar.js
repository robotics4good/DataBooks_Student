import React from 'react';

const TopBar = ({ title, onBack, onToggleLayout, toggleLabel, children }) => (
  <div style={{
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
    boxShadow: '0 2px 8px rgba(34,34,34,0.04)'
  }}>
    <button
      onClick={onBack}
      style={{
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
      }}
    >
      <span style={{fontSize: '1.1em', marginRight: '0.3em'}}>&larr;</span> Back to Games
    </button>
    <div style={{ flex: 1, textAlign: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0.02em', textShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      {title}
      {children}
    </div>
    <button
      onClick={onToggleLayout}
      style={{
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
        width: '160px',
        justifyContent: 'center',
      }}
    >
      {toggleLabel}
    </button>
  </div>
);

export default TopBar; 