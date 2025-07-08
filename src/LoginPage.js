import React, { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useUserLog } from "./UserLog";

const LoginPage = ({ gameConfig }) => {
  const { gameKey } = useParams();
  const navigate = useNavigate();
  const { logAction } = useUserLog();
  const [selectedPlayer, setSelectedPlayer] = useState('');

  // Find the current game from config
  const currentGame = gameConfig.games.find(g => g.key === gameKey);
  
  // Redirect if game doesn't exist or is disabled
  if (!currentGame || !currentGame.enabled) {
    return <Navigate to="/" replace />;
  }

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player);
  };

  const handleStartGame = () => {
    if (selectedPlayer) {
      localStorage.setItem('selectedPlayer', selectedPlayer);
      navigate(`/games/${gameKey}`);
    }
  };

  const handleBackToGames = () => {
    logAction('Clicked back to games');
    navigate('/');
  };

  // Player selection button component
  const PlayerButton = ({ player, isSelected, onClick }) => (
            <button
      onClick={() => onClick(player)}
              style={{
                padding: "12px 16px",
        border: isSelected ? "3px solid #667eea" : "2px solid #ddd",
                borderRadius: "10px",
        background: isSelected ? "#f0f4ff" : "white",
        color: isSelected ? "#667eea" : "#333",
                cursor: "pointer",
                fontSize: "0.9rem",
        fontWeight: isSelected ? "bold" : "normal",
                transition: "all 0.3s ease"
              }}
            >
              {player}
            </button>
  );

  // Action buttons component
  const ActionButtons = () => (
        <div style={{
          display: "flex",
          gap: "15px",
          justifyContent: "center"
        }}>
          <button
            onClick={handleBackToGames}
            style={{
              padding: "12px 24px",
              border: "2px solid #ddd",
              borderRadius: "8px",
              background: "white",
              color: "#666",
              cursor: "pointer",
              fontSize: "1rem",
              transition: "all 0.3s ease"
            }}
          >
            Back to Games
          </button>
          
          <button
            onClick={handleStartGame}
            disabled={!selectedPlayer}
            style={{
              padding: "12px 24px",
              border: "none",
              borderRadius: "8px",
              background: selectedPlayer ? "#667eea" : "#ccc",
              color: "white",
              cursor: selectedPlayer ? "pointer" : "not-allowed",
              fontSize: "1rem",
              fontWeight: "bold",
              transition: "all 0.3s ease"
            }}
          >
            Start Game
          </button>
        </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "20px",
        padding: "40px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
        maxWidth: "500px",
        width: "100%",
        textAlign: "center"
      }}>
        <h1 style={{
          color: "#333",
          marginBottom: "10px",
          fontSize: "2.5rem",
          fontWeight: "bold"
        }}>
          {currentGame.name}
        </h1>
        
        <p style={{
          color: "#666",
          marginBottom: "30px",
          fontSize: "1.1rem"
        }}>
          Select your player identity
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "10px",
          marginBottom: "30px"
        }}>
          {gameConfig.playerNames.map((player) => (
            <PlayerButton
              key={player}
              player={player}
              isSelected={selectedPlayer === player}
              onClick={handlePlayerSelect}
            />
          ))}
        </div>

        <ActionButtons />
      </div>
    </div>
  );
};

export default LoginPage; 