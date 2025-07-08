import React, { useState, useRef, useLayoutEffect } from 'react';
import AlienInvasion from "./games/AlienInvasion";
import WhisperWeb from "./games/WhisperWeb";
import LogisticsLeague from "./games/LogisticsLeague";
import PollinationParty from "./games/PollinationParty";
import RushHourRebels from "./games/RushHourRebels";
import { useUserLog } from "./UserLog";
import PlotComponent from "./plots/PlotComponent";
import { useJournal } from "./JournalContext";
import { JournalQuestions } from "./components/JournalQuestions";
import TopBar from './components/TopBar';

const MIN_WIDTH_PERCENT = 30;
const MAX_WIDTH_PERCENT = 50;



const GameContent = ({ selectedGame }) => {
  switch (selectedGame) {
    case 'alien-invasion':
      return <AlienInvasion />;
    case 'whisper-web':
      return <WhisperWeb />;
    case 'logistics-league':
      return <LogisticsLeague />;
    case 'pollination-party':
      return <PollinationParty />;
    case 'rush-hour-rebels':
      return <RushHourRebels />;
    default:
      return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.2rem' }}>
        Select a game to begin
      </div>;
  }
};

// Style objects for SingleScreenLayout
const styles = {
  main: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    background: "var(--offwhite-bg)",
    marginTop: '56px',
  },
  tabHeader: {
    display: "flex",
    background: "var(--cream-panel)",
    borderBottom: "2px solid var(--panel-border)",
    height: 48,
    alignItems: 'flex-end',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
  },
  contentArea: {
    minHeight: '100vh',
    padding: 0,
    paddingBottom: 0
  },
  plotRow: {
    display: "flex",
    gap: "20px",
    paddingBottom: 0
  },
  plotContainer: {
    flex: 1,
    minWidth: 0,
    minHeight: '340px',
    padding: '20px',
    paddingBottom: 0,
    marginBottom: '2rem',
    boxSizing: 'border-box'
  },
  card: {
    background: "var(--cream-panel)",
    borderRadius: "8px",
    padding: "20px",
    border: "1px solid var(--panel-border)"
  },
  notification: {
    // Notification styles are handled by CSS class, but you can add fallback styles here if needed
  },
  settingsButton: (color) => ({
    padding: "10px 20px",
    background: color,
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  }),
  questionBox: {
    marginBottom: '1rem'
  },
  questionLabel: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold'
  },
  textarea: {
    width: "100%",
    minHeight: '50px',
    background: "var(--cream-panel)",
    color: "var(--text-dark)",
    border: "1px solid var(--panel-border)",
    borderRadius: "4px",
    padding: "0.5rem",
    resize: "none",
    boxSizing: 'border-box',
    margin: 0
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

const SingleScreenLayout = ({ selectedGame, handleBackToGames, playerNames, onToggleLayout, isDualScreen }) => {
  const { logAction } = useUserLog();
  const [activeTab, setActiveTab] = useState('dataplots');
  
  // Plot state tracking
  const [plot1Type, setPlot1Type] = useState('line');
  const [plot2Type, setPlot2Type] = useState('line');
  const [plot1XVariables, setPlot1XVariables] = useState([]);
  const [plot1YVariables, setPlot1YVariables] = useState([]);
  const [plot2XVariables, setPlot2XVariables] = useState([]);
  const [plot2YVariables, setPlot2YVariables] = useState([]);

  // State for each plot's X/Y for line plot
  const [plot1X, setPlot1X] = useState("");
  const [plot1Y, setPlot1Y] = useState("");
  const [plot2X, setPlot2X] = useState("");
  const [plot2Y, setPlot2Y] = useState("");

  // Plot types in the order and with the labels from the screenshot
  const plotTypes = [
    { value: 'line', label: 'Line Plot' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'bar', label: 'Bar Plot' },
    { value: 'histogram', label: 'Histogram Plot' },
    { value: 'pie', label: 'Pie Plot' },
    { value: 'sankey', label: 'Sankey Diagram' },
    { value: 'node', label: 'Node Proximity' }
  ];

  const xVariables = ["Time", "Distance", "Score", "Attempts"];
  const yVariables = ["Infections", "Vaccinations", "Population", "Efficiency"];



  // Person filter state (unique per plot, decorative for now)
  const [plot1PersonFilter, setPlot1PersonFilter] = useState(() => playerNames.reduce((acc, name) => ({ ...acc, [name]: false }), {}));
  const [plot2PersonFilter, setPlot2PersonFilter] = useState(() => playerNames.reduce((acc, name) => ({ ...acc, [name]: false }), {}));

  // Ensure filters are always in sync with playerNames
  React.useEffect(() => {
    setPlot1PersonFilter(prev => {
      const updated = { ...playerNames.reduce((acc, name) => ({ ...acc, [name]: false }), {}) };
      for (const name in prev) if (name in updated) updated[name] = prev[name];
      return updated;
    });
    setPlot2PersonFilter(prev => {
      const updated = { ...playerNames.reduce((acc, name) => ({ ...acc, [name]: false }), {}) };
      for (const name in prev) if (name in updated) updated[name] = prev[name];
      return updated;
    });
  }, [playerNames]);

  const handleTabClick = (tabName) => {
    if (activeTab === tabName) {
      return;
    }
    logAction(`Switched to ${tabName} tab`);
    setActiveTab(tabName);
  };

  const handlePlotTypeChange = (plotNumber, newType) => {
    logAction(`Plot ${plotNumber} type changed to ${newType}`);
    if (plotNumber === 1) {
      setPlot1Type(newType);
    } else {
      setPlot2Type(newType);
    }
  };

  const handleVariableChange = (plotNumber, axis, variable, checked) => {
    logAction(`Plot ${plotNumber} ${axis}-variable "${variable}" ${checked ? 'selected' : 'deselected'}`);
    
    if (plotNumber === 1) {
      if (axis === 'X') {
        const newVars = checked 
          ? [...plot1XVariables, variable]
          : plot1XVariables.filter(v => v !== variable);
        setPlot1XVariables(newVars);
      } else {
        const newVars = checked 
          ? [...plot1YVariables, variable]
          : plot1YVariables.filter(v => v !== variable);
        setPlot1YVariables(newVars);
      }
    } else {
      if (axis === 'X') {
        const newVars = checked 
          ? [...plot2XVariables, variable]
          : plot2XVariables.filter(v => v !== variable);
        setPlot2XVariables(newVars);
      } else {
        const newVars = checked 
          ? [...plot2YVariables, variable]
          : plot2YVariables.filter(v => v !== variable);
        setPlot2YVariables(newVars);
      }
    }
  };

  return (
    <div style={styles.main}>
      <TopBar
        gameName={getGameDisplayName(selectedGame)}
        cadetName={typeof window !== 'undefined' ? localStorage.getItem('selectedPlayer') : ''}
        onBack={handleBackToGames}
        onToggleView={onToggleLayout}
        toggleLabel={isDualScreen ? 'Go Single Screen' : 'Go Dual Screen'}
      />
      <div style={{
        marginTop: 0,
        display: "flex",
        flexDirection: "column"
      }}>
        <div className="tab-header single-tab-header" style={{
          display: 'flex',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          background: 'var(--offwhite-bg)',
          borderBottom: 'none',
          height: 48,
          width: '100%',
          margin: '18px 0 0 0',
          marginBottom: '12px',
          borderRadius: 0,
          boxShadow: 'none',
          position: 'relative',
          zIndex: 1,
        }}>
          <button
            className="tab-btn"
            onClick={() => setActiveTab('dataplots')}
            style={{
              background: 'none',
              color: 'var(--text-dark)',
              border: 'none',
              borderRadius: 0,
              fontSize: '1.15rem',
              fontWeight: activeTab === 'dataplots' ? 800 : 600,
              cursor: 'pointer',
              outline: 'none',
              position: 'relative',
              transition: 'color 0.2s',
              boxShadow: 'none',
              padding: 0,
              minWidth: '120px',
              width: '140px',
              textAlign: 'center',
              display: 'inline-block',
            }}
          >
            <span style={{
              display: 'inline-block',
              background: activeTab === 'dataplots' ? 'rgba(80, 200, 120, 0.13)' : 'none',
              borderRadius: 999,
              padding: '0.4em 1.5em',
              fontWeight: 800,
              color: activeTab === 'dataplots' ? 'var(--dark-green)' : 'inherit',
              fontSize: '1.1em',
              width: '100%',
              transform: activeTab === 'dataplots' ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.18s cubic-bezier(.4,1.3,.6,1)',
            }}>
              DataPlots
            </span>
          </button>
          <button
            className="tab-btn"
            onClick={() => setActiveTab('journal')}
            style={{
              background: 'none',
              color: 'var(--text-dark)',
              border: 'none',
              borderRadius: 0,
              fontSize: '1.15rem',
              fontWeight: activeTab === 'journal' ? 800 : 600,
              cursor: 'pointer',
              outline: 'none',
              position: 'relative',
              transition: 'color 0.2s',
              boxShadow: 'none',
              padding: 0,
              minWidth: '120px',
              width: '140px',
              textAlign: 'center',
              display: 'inline-block',
            }}
          >
            <span style={{
              display: 'inline-block',
              background: activeTab === 'journal' ? 'rgba(80, 200, 120, 0.13)' : 'none',
              borderRadius: 999,
              padding: '0.4em 1.5em',
              fontWeight: 800,
              color: activeTab === 'journal' ? 'var(--dark-green)' : 'inherit',
              fontSize: '1.1em',
              width: '100%',
              transform: activeTab === 'journal' ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.18s cubic-bezier(.4,1.3,.6,1)',
            }}>
              Journal
            </span>
          </button>
        </div>
        {activeTab === 'dataplots' && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={styles.plotRow}>
              {/* Left Plot */}
              <div style={styles.plotContainer}>
                <PlotComponent
                  plotLabel="DataPlots 1"
                  data={[]}
                  logAction={logAction}
                />
              </div>
              {/* Right Plot */}
              <div style={styles.plotContainer}>
                <PlotComponent
                  plotLabel="DataPlots 2"
                  data={[]}
                  logAction={logAction}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'journal' && (
          <React.Fragment>
            <div style={{ height: "100%", padding: "20px", overflow: "auto" }}>
              <div style={styles.card}>
                <JournalQuestions logAction={logAction} />
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

export default SingleScreenLayout; 