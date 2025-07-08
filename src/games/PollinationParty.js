// src/games/PollinationParty.js - Updated to use real ESP data
import React, { useState, useEffect } from 'react';
import { useESPData } from "../hooks/useESPData";
import { useUserLog } from "../UserLog";
import PlotComponent from "../plots/PlotComponent";
import LinePlot from '../plots/LinePlot';
import ScatterPlot from '../plots/ScatterPlot';
import PiePlot from '../plots/PiePlot';
import BarPlot from '../plots/BarPlot';
import HistogramPlot from '../plots/HistogramPlot';
import { timeService } from '../utils/timeUtils';

const PollinationParty = () => {
  // Generate unique session ID for this game instance
  const sessionId = `pollination_party_${timeService.getCurrentTime().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Game state
  const [gameState, setGameState] = useState('waiting');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [flowers, setFlowers] = useState([]);
  const [bees, setBees] = useState([]);
  const [pollen, setPollen] = useState([]);
  
  // Control ESP data access
  const { 
    espData, 
    loading, 
    error, 
    getPlotData 
  } = useESPData(sessionId);

  // Game loop
  useEffect(() => {
    if (gameState === 'playing') {
      const gameTimer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('gameOver');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(gameTimer);
    }
  }, [gameState]);

  // Generate flowers and bees based on ESP data
  useEffect(() => {
    if (gameState === 'playing' && espData.length > 0) {
      const newFlowers = espData.slice(-6).map((dataPoint, index) => ({
        id: `flower_${index}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        nectar: (dataPoint.interaction || 0) / 100,
        type: dataPoint.interactionType || 'standard',
        pollinated: false
      }));
      setFlowers(newFlowers);

      const newBees = espData.slice(-3).map((dataPoint, index) => ({
        id: `bee_${index}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        speed: (dataPoint.interaction || 0) / 100,
        carryingPollen: false
      }));
      setBees(newBees);
    }
  }, [espData, gameState]);

  // Move bees and handle pollination
  useEffect(() => {
    if (gameState === 'playing') {
      const beeTimer = setInterval(() => {
        setBees(prevBees => prevBees.map(bee => {
          // Move bee towards nearest flower
          const nearestFlower = flowers.find(f => !f.pollinated);
          if (nearestFlower) {
            const dx = nearestFlower.x - bee.x;
            const dy = nearestFlower.y - bee.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5) {
              // Pollinate flower
              setFlowers(prev => prev.map(f => 
                f.id === nearestFlower.id ? { ...f, pollinated: true } : f
              ));
              setScore(prev => prev + 10);
              return { ...bee, carryingPollen: true };
            } else {
              // Move towards flower
              const speed = bee.speed * 2;
              return {
                ...bee,
                x: bee.x + (dx / distance) * speed,
                y: bee.y + (dy / distance) * speed
              };
            }
          }
          return bee;
        }));
      }, 100);

      return () => clearInterval(beeTimer);
    }
  }, [gameState, flowers]);

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setFlowers([]);
    setBees([]);
    setPollen([]);
  };

  // Reset game
  const resetGame = () => {
    setGameState('waiting');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setFlowers([]);
    setBees([]);
    setPollen([]);
  };



  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f0f8ff',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Game Header */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#2c3e50', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2>Pollination Party - Real ESP Data</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>Score: {score}</span>
          <span>Level: {level}</span>
          <span>Time: {timeLeft}s</span>
        </div>
      </div>

      {/* Game Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        gap: '10px',
        padding: '10px'
      }}>
        {/* Game Area */}
        <div style={{ 
          flex: '1',
          position: 'relative',
          backgroundColor: '#e8f4f8',
          border: '2px solid #3498db',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          {gameState === 'waiting' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              zIndex: 10
            }}>
              <h3>Pollination Party</h3>
              <p>Watch bees pollinate flowers based on ESP data!</p>
              <p>ESP data controls flower and bee generation</p>
              <button 
                onClick={startGame}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Start Game
              </button>
            </div>
          )}

          {gameState === 'gameOver' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              zIndex: 10,
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '20px',
              borderRadius: '10px'
            }}>
              <h3>Game Over!</h3>
              <p>Final Score: {score}</p>
              <p>Flowers Pollinated: {flowers.filter(f => f.pollinated).length}</p>
              <button 
                onClick={resetGame}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Play Again
              </button>
            </div>
          )}

          {/* Flowers */}
          {gameState === 'playing' && flowers.map(flower => (
            <div
              key={flower.id}
              style={{
                position: 'absolute',
                left: `${flower.x}%`,
                top: `${flower.y}%`,
                width: `${20 + flower.nectar * 30}px`,
                height: `${20 + flower.nectar * 30}px`,
                backgroundColor: flower.pollinated ? '#27ae60' : 
                               flower.type === 'standard' ? '#f39c12' : '#9b59b6',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                border: flower.pollinated ? '3px solid #229954' : '2px solid #e67e22',
                transition: 'all 0.3s ease'
              }}
            />
          ))}

          {/* Bees */}
          {gameState === 'playing' && bees.map(bee => (
            <div
              key={bee.id}
              style={{
                position: 'absolute',
                left: `${bee.x}%`,
                top: `${bee.y}%`,
                width: '15px',
                height: '15px',
                backgroundColor: bee.carryingPollen ? '#f1c40f' : '#f39c12',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
                border: '2px solid #e67e22',
                animation: bee.carryingPollen ? 'buzz 0.5s infinite' : 'none'
              }}
            />
          ))}

          {/* ESP Data Status */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px'
          }}>
            <div>ESP Data: {loading ? 'Loading...' : espData.length} points</div>
            <div>Session: {sessionId.slice(-8)}</div>
          </div>
        </div>

        {/* Plots Panel */}
        <div style={{ 
          width: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Line Plot */}
          <div style={{ 
            height: '200px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            padding: '10px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>ESP Interactions Over Time</h4>
            <LinePlot data={espData} sessionId={sessionId} />
          </div>

          {/* Scatter Plot */}
          <div style={{ 
            height: '200px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            padding: '10px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Interaction vs Engagement</h4>
            <ScatterPlot data={espData} sessionId={sessionId} />
          </div>

          {/* Bar Plot */}
          <div style={{ 
            height: '200px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            padding: '10px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Interactions by Time</h4>
            <BarPlot data={espData} sessionId={sessionId} />
          </div>

          {/* Pie Plot */}
          <div style={{ 
            height: '200px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            padding: '10px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Interaction Types</h4>
            <PiePlot data={espData} sessionId={sessionId} />
          </div>

          {/* Histogram Plot */}
          <div style={{ 
            height: '200px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            padding: '10px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Interaction Distribution</h4>
            <HistogramPlot data={espData} sessionId={sessionId} />
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes buzz {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default PollinationParty;