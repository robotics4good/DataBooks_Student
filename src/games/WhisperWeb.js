// src/games/WhisperWeb.js - Updated to use real ESP data
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

const WhisperWeb = () => {
  // Generate unique session ID for this game instance
  const sessionId = `whisper_web_${timeService.getCurrentTime().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Game state
  const [gameState, setGameState] = useState('waiting');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const { logAction } = useUserLog();
  
  // Control ESP data access
  const { 
    espData, 
    loading, 
    error, 
    getPlotData, 
    totalPackets,
    uniqueStudents,
    timeRange 
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

  // Generate network nodes based on ESP data
  useEffect(() => {
    if (gameState === 'playing' && espData.length > 0) {
      const newNodes = espData.slice(-8).map((dataPoint, index) => ({
        id: `node_${index}`,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        strength: (dataPoint.interaction || 0) / 100,
        type: dataPoint.interactionType || 'standard',
        connected: false
      }));
      setNodes(newNodes);
      setConnections([]);
    }
  }, [espData, gameState]);

  // Handle node selection and connection
  const handleNodeClick = (nodeId) => {
    if (gameState !== 'playing') return;
    
    if (!selectedNode) {
      setSelectedNode(nodeId);
    } else if (selectedNode !== nodeId) {
      // Create connection
      const newConnection = {
        id: `conn_${selectedNode}_${nodeId}`,
        from: selectedNode,
        to: nodeId
      };
      setConnections(prev => [...prev, newConnection]);
      setScore(prev => prev + 10);
      setSelectedNode(null);
    } else {
      setSelectedNode(null);
    }
  };

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setNodes([]);
    setConnections([]);
    setSelectedNode(null);
  };

  // Reset game
  const resetGame = () => {
    setGameState('waiting');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setNodes([]);
    setConnections([]);
    setSelectedNode(null);
  };

  // Custom log action for WhisperWeb plots
  const handlePlotAction = (action) => {
    logAction(`WhisperWeb plot: ${action}`);
  };

  // Transform ESP data for WhisperWeb visualization
  const getWhisperData = () => {
    if (!espData.length) return [];
    
    // Create heatmap data from ESP interactions
    const studentData = {};
    
    espData.forEach(item => {
      const studentId = item.studentId || 'Unknown';
      if (!studentData[studentId]) {
        studentData[studentId] = { id: studentId, interactions: 0, avgValue: 0, count: 0 };
      }
      studentData[studentId].interactions++;
      studentData[studentId].avgValue += (item.interaction || 0);
      studentData[studentId].count++;
    });

    // Calculate averages and create heatmap format
    return Object.values(studentData).map(student => ({
      id: student.id,
      interaction_rate: student.interactions,
      avg_interaction: Math.round(student.avgValue / student.count),
      total_activity: student.interactions * (student.avgValue / student.count)
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
          Loading Whisper Web data...
        </div>
        <div style={{ fontSize: "0.9rem", color: "#666" }}>
          Connecting to ESP data source
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#b00" }}>
          Error loading Whisper Web data
        </div>
        <div style={{ fontSize: "0.9rem", color: "#666", textAlign: "center" }}>
          {error}
        </div>
      </div>
    );
  }

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
        <h2>WhisperWeb - Real ESP Data</h2>
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
              <h3>WhisperWeb</h3>
              <p>Click nodes to connect them and build the network!</p>
              <p>ESP data controls node generation</p>
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
              <p>Connections Made: {connections.length}</p>
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

          {/* Connections */}
          {gameState === 'playing' && connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            
            return (
              <svg
                key={conn.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              >
                <line
                  x1={`${fromNode.x}%`}
                  y1={`${fromNode.y}%`}
                  x2={`${toNode.x}%`}
                  y2={`${toNode.y}%`}
                  stroke="#3498db"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                />
              </svg>
            );
          })}

          {/* Nodes */}
          {gameState === 'playing' && nodes.map(node => (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              style={{
                position: 'absolute',
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: `${20 + node.strength * 30}px`,
                height: `${20 + node.strength * 30}px`,
                backgroundColor: selectedNode === node.id ? '#e74c3c' : 
                               node.type === 'standard' ? '#3498db' : '#9b59b6',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                border: selectedNode === node.id ? '3px solid #c0392b' : '2px solid #2980b9',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
    </div>
  );
};

export default WhisperWeb;