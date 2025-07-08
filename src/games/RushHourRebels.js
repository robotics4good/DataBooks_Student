import React, { useState, useEffect } from 'react';
import { useESPData } from '../hooks/useESPData';
import LinePlot from '../plots/LinePlot';
import ScatterPlot from '../plots/ScatterPlot';
import PiePlot from '../plots/PiePlot';
import BarPlot from '../plots/BarPlot';
import HistogramPlot from '../plots/HistogramPlot';
import { timeService } from '../utils/timeUtils';

const RushHourRebels = () => {
  // Generate unique session ID for this game instance
  const sessionId = `rush_hour_rebels_${timeService.getCurrentTime().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Game state
  const [gameState, setGameState] = useState('waiting');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [vehicles, setVehicles] = useState([]);
  const [trafficLights, setTrafficLights] = useState([]);
  const [congestion, setCongestion] = useState(0);
  
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

  // Generate vehicles and traffic lights based on ESP data
  useEffect(() => {
    if (gameState === 'playing' && espData.length > 0) {
      const newVehicles = espData.slice(-6).map((dataPoint, index) => ({
        id: `vehicle_${index}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        speed: (dataPoint.interaction || 0) / 100,
        type: dataPoint.interactionType || 'car',
        direction: Math.random() > 0.5 ? 'horizontal' : 'vertical'
      }));
      setVehicles(newVehicles);

      const newTrafficLights = espData.slice(-4).map((dataPoint, index) => ({
        id: `light_${index}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        state: Math.random() > 0.5 ? 'green' : 'red',
        intensity: (dataPoint.interaction || 0) / 100
      }));
      setTrafficLights(newTrafficLights);
    }
  }, [espData, gameState]);

  // Move vehicles and handle traffic
  useEffect(() => {
    if (gameState === 'playing') {
      const vehicleTimer = setInterval(() => {
        setVehicles(prevVehicles => prevVehicles.map(vehicle => {
          const speed = vehicle.speed * 3;
          let newX = vehicle.x;
          let newY = vehicle.y;
          
          if (vehicle.direction === 'horizontal') {
            newX += speed;
            if (newX > 90) newX = 10;
          } else {
            newY += speed;
            if (newY > 90) newY = 10;
          }
          
          // Check for traffic light interaction
          const nearbyLight = trafficLights.find(light => 
            Math.sqrt((newX - light.x) ** 2 + (newY - light.y) ** 2) < 10
          );
          
          if (nearbyLight && nearbyLight.state === 'red') {
            // Stop at red light
            return vehicle;
          }
          
          return { ...vehicle, x: newX, y: newY };
        }));
        
        // Update congestion level
        const activeVehicles = vehicles.filter(v => v.speed > 0.1).length;
        setCongestion(Math.min(100, activeVehicles * 15));
        setScore(prev => prev + Math.floor(activeVehicles * 0.1));
      }, 100);

      return () => clearInterval(vehicleTimer);
    }
  }, [gameState, trafficLights, vehicles]);

  // Toggle traffic lights
  useEffect(() => {
    if (gameState === 'playing') {
      const lightTimer = setInterval(() => {
        setTrafficLights(prev => prev.map(light => ({
          ...light,
          state: light.state === 'green' ? 'red' : 'green'
        })));
      }, 3000);

      return () => clearInterval(lightTimer);
    }
  }, [gameState]);

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setVehicles([]);
    setTrafficLights([]);
    setCongestion(0);
  };

  // Reset game
  const resetGame = () => {
    setGameState('waiting');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setVehicles([]);
    setTrafficLights([]);
    setCongestion(0);
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
        <h2>Rush Hour Rebels - Real ESP Data</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>Score: {score}</span>
          <span>Level: {level}</span>
          <span>Time: {timeLeft}s</span>
          <span>Congestion: {Math.round(congestion)}%</span>
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
              <h3>Rush Hour Rebels</h3>
              <p>Watch traffic flow based on ESP data!</p>
              <p>ESP data controls vehicle and traffic light generation</p>
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
              <p>Max Congestion: {Math.round(congestion)}%</p>
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

          {/* Traffic Lights */}
          {gameState === 'playing' && trafficLights.map(light => (
            <div
              key={light.id}
              style={{
                position: 'absolute',
                left: `${light.x}%`,
                top: `${light.y}%`,
                width: '15px',
                height: '15px',
                backgroundColor: light.state === 'green' ? '#27ae60' : '#e74c3c',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                border: '2px solid #2c3e50',
                animation: light.state === 'green' ? 'pulse 1s infinite' : 'none'
              }}
            />
          ))}

          {/* Vehicles */}
          {gameState === 'playing' && vehicles.map(vehicle => (
            <div
              key={vehicle.id}
              style={{
                position: 'absolute',
                left: `${vehicle.x}%`,
                top: `${vehicle.y}%`,
                width: vehicle.type === 'bus' ? '25px' : '20px',
                height: vehicle.type === 'bus' ? '15px' : '12px',
                backgroundColor: vehicle.type === 'bus' ? '#e67e22' : '#3498db',
                borderRadius: '3px',
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
                border: '2px solid #2980b9'
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
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default RushHourRebels;