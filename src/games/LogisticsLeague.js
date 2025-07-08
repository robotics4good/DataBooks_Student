import React, { useState, useEffect } from 'react';
import { useESPData } from '../hooks/useESPData';
import LinePlot from '../plots/LinePlot';
import ScatterPlot from '../plots/ScatterPlot';
import PiePlot from '../plots/PiePlot';
import BarPlot from '../plots/BarPlot';
import HistogramPlot from '../plots/HistogramPlot';
import { timeService } from '../utils/timeUtils';

const LogisticsLeague = () => {
  // Generate unique session ID for this game instance
  const sessionId = `logistics_league_${timeService.getCurrentTime().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Game state
  const [gameState, setGameState] = useState('waiting');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [warehouses, setWarehouses] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [packages, setPackages] = useState([]);
  
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

  // Generate warehouses and trucks based on ESP data
  useEffect(() => {
    if (gameState === 'playing' && espData.length > 0) {
      const newWarehouses = espData.slice(-4).map((dataPoint, index) => ({
        id: `warehouse_${index}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        capacity: (dataPoint.interaction || 0) / 100,
        type: dataPoint.interactionType || 'standard',
        packages: []
      }));
      setWarehouses(newWarehouses);

      const newTrucks = espData.slice(-3).map((dataPoint, index) => ({
        id: `truck_${index}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        speed: (dataPoint.interaction || 0) / 100,
        carrying: false,
        target: null
      }));
      setTrucks(newTrucks);
    }
  }, [espData, gameState]);

  // Move trucks and handle logistics
  useEffect(() => {
    if (gameState === 'playing') {
      const truckTimer = setInterval(() => {
        setTrucks(prevTrucks => prevTrucks.map(truck => {
          if (truck.target) {
            const target = warehouses.find(w => w.id === truck.target);
            if (target) {
              const dx = target.x - truck.x;
              const dy = target.y - truck.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 5) {
                // Reached target
                if (truck.carrying) {
                  // Deliver package
                  setScore(prev => prev + 10);
                  return { ...truck, carrying: false, target: null };
                } else {
                  // Pick up package
                  return { ...truck, carrying: true, target: null };
                }
              } else {
                // Move towards target
                const speed = truck.speed * 2;
                return {
                  ...truck,
                  x: truck.x + (dx / distance) * speed,
                  y: truck.y + (dy / distance) * speed
                };
              }
            }
          } else {
            // Find new target
            const availableWarehouse = warehouses.find(w => w.packages.length > 0);
            if (availableWarehouse) {
              return { ...truck, target: availableWarehouse.id };
            }
          }
          return truck;
        }));
      }, 100);

      return () => clearInterval(truckTimer);
    }
  }, [gameState, warehouses]);

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setWarehouses([]);
    setTrucks([]);
    setPackages([]);
  };

  // Reset game
  const resetGame = () => {
    setGameState('waiting');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setWarehouses([]);
    setTrucks([]);
    setPackages([]);
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
        <h2>Logistics League - Real ESP Data</h2>
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
              <h3>Logistics League</h3>
              <p>Watch trucks deliver packages based on ESP data!</p>
              <p>ESP data controls warehouse and truck generation</p>
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
              <p>Deliveries Made: {Math.floor(score / 10)}</p>
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

          {/* Warehouses */}
          {gameState === 'playing' && warehouses.map(warehouse => (
            <div
              key={warehouse.id}
              style={{
                position: 'absolute',
                left: `${warehouse.x}%`,
                top: `${warehouse.y}%`,
                width: `${30 + warehouse.capacity * 40}px`,
                height: `${30 + warehouse.capacity * 40}px`,
                backgroundColor: warehouse.type === 'standard' ? '#34495e' : '#8e44ad',
                borderRadius: '5px',
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                border: '3px solid #2c3e50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              W
            </div>
          ))}

          {/* Trucks */}
          {gameState === 'playing' && trucks.map(truck => (
            <div
              key={truck.id}
              style={{
                position: 'absolute',
                left: `${truck.x}%`,
                top: `${truck.y}%`,
                width: '20px',
                height: '15px',
                backgroundColor: truck.carrying ? '#e74c3c' : '#3498db',
                borderRadius: '3px',
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
                border: '2px solid #2980b9',
                animation: truck.carrying ? 'deliver 1s infinite' : 'none'
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
        @keyframes deliver {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LogisticsLeague;