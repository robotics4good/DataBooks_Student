import React, { useState, useLayoutEffect } from 'react';
import AlienInvasion from "./games/AlienInvasion";
import WhisperWeb from "./games/WhisperWeb";
import LogisticsLeague from "./games/LogisticsLeague";
import PollinationParty from "./games/PollinationParty";
import RushHourRebels from "./games/RushHourRebels";
import PlotComponent from "./plots/PlotComponent";
import { useUserLog } from "./UserLog";
import { useJournal } from "./JournalContext";
import { JournalQuestions } from "./components/JournalQuestions";
import TopBar from './components/TopBar';

const MIN_WIDTH_PERCENT = 30;
const MAX_WIDTH_PERCENT = 50;

const styles = {
  main: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--cream-panel)',
    marginTop: '56px',
  },
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
    boxShadow: '0 2px 8px rgba(34,34,34,0.04)'
  },
  dualPanel: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    minWidth: 0
  },
  leftPanel: (leftWidth) => ({
    flex: `0 0 ${leftWidth}%`,
    minWidth: 0,
    background: 'var(--cream-panel)',
    padding: '24px 18px 24px 24px',
    boxSizing: 'border-box',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    maxHeight: 'calc(100vh - 56px)',
    overflow: 'auto',
    marginBottom: 0,
  }),
  rightPanel: {
    flex: 1,
    minWidth: 0,
    background: 'var(--cream-panel)',
    padding: '24px 24px 24px 24px',
    boxSizing: 'border-box',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '340px',
    maxHeight: 'calc(100vh - 56px)',
    overflow: 'auto',
    marginBottom: 0,
  },
  resizer: (isDragging) => ({
    width: '6px',
    cursor: 'col-resize',
    background: isDragging ? 'var(--accent-blue)' : 'rgba(42, 110, 187, 0.35)',
    position: 'relative',
    zIndex: 2,
    userSelect: 'none',
    transition: 'background 0.2s',
  }),
  resizerHandle: {
    position: 'absolute',
    left: '-4px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '14px',
    height: '48px',
    background: 'var(--accent-color)',
    borderRadius: '6px',
    opacity: 0.5
  }
};

const RightPanelContent = ({ selectedGame, theme, sessionId = "1234567890" }) => {
  switch (selectedGame) {
    case 'alien-invasion':
      return <AlienInvasion sessionId={sessionId} />;
    case 'whisper-web':
      return <WhisperWeb sessionId={sessionId} />;
    case 'logistics-league':
      return <LogisticsLeague sessionId={sessionId} />;
    case 'pollination-party':
      return <PollinationParty sessionId={sessionId} />;
    case 'rush-hour-rebels':
      return <RushHourRebels sessionId={sessionId} />;
    default:
      return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.2rem' }}>
        Select a game to begin
      </div>;
  }
};

// Helper to get display name for header
const getGameDisplayName = (selectedGame) => {
  if (!selectedGame) return "";
  if (typeof selectedGame === "string") {
    return selectedGame.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  if (selectedGame.name) return selectedGame.name;
  if (selectedGame.key) {
    return selectedGame.key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return String(selectedGame);
};

const GameLayout = ({ selectedGame, handleBackToGames, onToggleLayout, playerNames, isDualScreen }) => {
  const { logAction } = useUserLog();
  const [leftWidth, setLeftWidth] = useState(38);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newLeftWidth = (e.clientX / window.innerWidth) * 100;
    const clampedWidth = Math.max(MIN_WIDTH_PERCENT, Math.min(newLeftWidth, MAX_WIDTH_PERCENT));
    setLeftWidth(clampedWidth);
  };

  useLayoutEffect(() => {
    if (!isDragging) return;
    const mouseMoveHandler = (e) => handleMouseMove(e);
    const mouseUpHandler = () => handleMouseUp();
    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
    return () => {
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
    };
  }, [isDragging]);

  return (
    <div style={styles.main}>
      <TopBar
        gameName={getGameDisplayName(selectedGame)}
        cadetName={typeof window !== 'undefined' ? localStorage.getItem('selectedPlayer') : ''}
        onBack={handleBackToGames}
        onToggleView={onToggleLayout}
        toggleLabel={isDualScreen ? 'Go Single Screen' : 'Go Dual Screen'}
      />
      {/* Dual Panel Layout */}
      <div style={styles.dualPanel}>
        {/* Left: Journal */}
        <div style={styles.leftPanel(leftWidth)}>
          <JournalQuestions logAction={logAction} />
        </div>
        {/* Resizer */}
        <div
          style={styles.resizer(isDragging)}
          onMouseDown={handleMouseDown}
        >
          <div style={styles.resizerHandle} />
        </div>
        {/* Right: DataPlots (only one plot) */}
        <div style={styles.rightPanel}>
          <PlotComponent plotLabel="DataPlots" data={[]} logAction={logAction} />
        </div>
      </div>
    </div>
  );
};

export default GameLayout; 