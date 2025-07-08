// src/games/AlienInvasion.js - Updated to use real ESP data

// IMPORTS & DEPENDENCIES
import React, { useState, useEffect } from 'react';
import { useESPData } from "../hooks/useESPData";
import { useUserLog } from "../UserLog";
import PlotComponent from "../plots/PlotComponent";
import { timeService } from '../utils/timeUtils';

// @param {string} sessionId - Unique identifier for this game session (passed from parent)
const AlienInvasion = () => {
  const { logAction } = useUserLog();
  const { espData, loading, error, getPlotData } = useESPData();
  
  // Game state
  const [gameState, setGameState] = useState('waiting');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [alienShips, setAlienShips] = useState([]);
  const [playerPosition, setPlayerPosition] = useState({ x: 50, y: 50 });
  
  // Game timer
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('gameOver');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  // Generate alien ships from ESP data
  useEffect(() => {
    if (gameState === 'playing' && espData.length > 0) {
      const newShips = espData.slice(-5).map((data, index) => ({
        id: `alien_${timeService.getCurrentTime().getTime()}_${index}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        intensity: data.status || 0,
        type: data.beaconArray === 1 ? 'interactive' : 'standard'
      }));
      setAlienShips(newShips);
    }
  }, [espData, gameState]);

  // Handle player movement
  const handleKeyPress = (e) => {
    if (gameState !== 'playing') return;
    
    const speed = 5;
    setPlayerPosition(prev => {
      let newPos = { ...prev };
      
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
          newPos.y = Math.max(10, prev.y - speed);
          break;
        case 'ArrowDown':
        case 's':
          newPos.y = Math.min(90, prev.y + speed);
          break;
        case 'ArrowLeft':
        case 'a':
          newPos.x = Math.max(10, prev.x - speed);
          break;
        case 'ArrowRight':
        case 'd':
          newPos.x = Math.min(90, prev.x + speed);
          break;
        default:
          return prev;
      }
      
      // Check for alien ship destruction
      const nearbyShip = alienShips.find(ship => 
        Math.sqrt((newPos.x - ship.x) ** 2 + (newPos.y - ship.y) ** 2) < 15
      );
      
      if (nearbyShip) {
        setScore(prev => prev + Math.floor(nearbyShip.intensity * 100));
        setAlienShips(prev => prev.filter(ship => ship.id !== nearbyShip.id));
      }
      
      return newPos;
    });
  };

  // Game controls
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(60);
    setPlayerPosition({ x: 50, y: 50 });
    setAlienShips([]);
    logAction('Started Alien Invasion game');
  };

  const resetGame = () => {
    setGameState('waiting');
    setScore(0);
    setTimeLeft(60);
    setPlayerPosition({ x: 50, y: 50 });
    setAlienShips([]);
    logAction('Reset Alien Invasion game');
  };

  // Keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, alienShips]);

  // Loading state
  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.2rem"
      }}>
          Loading Alien Invasion data...
      </div>
    );
  }

  // Error state
  if (error) {
  return (
    <div style={{
        padding: 32,
        color: '#b00',
        textAlign: 'center'
      }}>
        Error loading ESP data: {error}
      </div>
    );
  }

  // No data state
  if (!espData.length) {
  return (
    <div style={{ 
        padding: 32,
        color: '#666',
        textAlign: 'center'
      }}>
        No ESP data available. Please start a new game session.
      </div>
    );
  }

  // Game UI components
  const GameControls = () => (
      <div style={{ 
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: 15,
      borderRadius: 10
    }}>
      <div>Score: {score}</div>
      <div>Time: {timeLeft}s</div>
      <div>Level: {Math.floor(score / 1000) + 1}</div>
    </div>
  );

  const GameButtons = () => (
        <div style={{ 
      position: 'absolute',
      top: 20,
      right: 20,
      zIndex: 10,
      display: 'flex',
      gap: 10
        }}>
          {gameState === 'waiting' && (
        <button 
                onClick={startGame}
                style={{
                  padding: '10px 20px',
            background: '#4CAF50',
                  color: 'white',
                  border: 'none',
            borderRadius: 5,
                  cursor: 'pointer'
                }}
              >
                Start Game
        </button>
          )}

          {gameState === 'gameOver' && (
        <button 
                onClick={resetGame}
                style={{
                  padding: '10px 20px',
            background: '#2196F3',
                  color: 'white',
                  border: 'none',
            borderRadius: 5,
                  cursor: 'pointer'
                }}
              >
                Play Again
        </button>
      )}
            </div>
  );

  const GameArea = () => (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '400px',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      border: '2px solid #333',
      borderRadius: 10,
      overflow: 'hidden'
    }}>
          {/* Player */}
      <div
        style={{
              position: 'absolute',
              left: `${playerPosition.x}%`,
              top: `${playerPosition.y}%`,
          width: 20,
          height: 20,
          background: '#FFD700',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px #FFD700'
        }}
      />
      
      {/* Alien ships */}
      {alienShips.map(ship => (
        <div
          key={ship.id}
              style={{
                position: 'absolute',
            left: `${ship.x}%`,
            top: `${ship.y}%`,
            width: 15,
            height: 15,
            background: ship.type === 'interactive' ? '#FF4444' : '#FF8800',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${ship.intensity * 5}px ${ship.type === 'interactive' ? '#FF4444' : '#FF8800'}`
              }}
            />
          ))}
    </div>
  );

  const GameOverScreen = () => (
          <div style={{
            position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: 30,
      borderRadius: 10,
      textAlign: 'center',
      zIndex: 20
    }}>
      <h2>Game Over!</h2>
      <p>Final Score: {score}</p>
      <p>Level Reached: {Math.floor(score / 1000) + 1}</p>
          </div>
  );

  return (
        <div style={{ 
      padding: 20,
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      <GameControls />
      <GameButtons />
      
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: 'white', textAlign: 'center', marginBottom: 20 }}>
          Alien Invasion
        </h1>
        <p style={{ color: 'white', textAlign: 'center', marginBottom: 20 }}>
          Use arrow keys or WASD to move. Destroy alien ships to score points!
        </p>
          </div>

      <GameArea />
      
      {gameState === 'gameOver' && <GameOverScreen />}

      <div style={{ marginTop: 20 }}>
        <PlotComponent
          data={getPlotData('line')}
          plotType="line"
          title="ESP Data Over Time"
          onAction={(action) => logAction(`AlienInvasion plot: ${action}`)}
        />
      </div>
    </div>
  );
};

export default AlienInvasion;

/*
ALIENINVASION COMPONENT DOCUMENTATION
=====================================

AlienInvasion is a real-time data monitoring game that simulates alien invasion
scenarios using live ESP (Embedded System Platform) data. The game dynamically
generates alien ships based on incoming sensor data, creating an engaging
educational experience that teaches data visualization and real-time monitoring.

KEY FEATURES:
- Real-time ESP data integration
- Dynamic alien ship generation
- Interactive player movement (WASD/Arrow keys)
- Multiple data visualization plots
- Score-based gameplay mechanics
- Responsive design for different screen sizes

DATA INTEGRATION:
- Uses useESPData hook for real-time data fetching
- Transforms ESP data into game mechanics
- Provides multiple plot types for data analysis
- Integrates with user logging system

GAMEPLAY MECHANICS:
- Player moves around to destroy alien ships
- Alien ships are generated based on ESP interaction data
- Score increases when alien ships are destroyed
- Time-based gameplay with countdown timer
- Multiple difficulty levels

VISUALIZATION COMPONENTS:
- Line Plot: Shows ESP interactions over time
- Scatter Plot: Displays data point distribution
- Bar Plot: Shows interactions by student
- Histogram Plot: Displays interaction distribution
- Pie Plot: Shows student participation breakdown

TECHNICAL DETAILS:
- Built with React hooks for state management
- Uses Firebase for real-time data synchronization
- Implements responsive design principles
- Integrates with the broader DataBooks ecosystem
*/