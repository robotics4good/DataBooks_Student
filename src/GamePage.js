import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import SingleScreenLayout from "./SingleScreenLayout";
import GameLayout from "./GameLayout";
import { useUserLog } from "./UserLog";
import { JournalProvider } from "./JournalContext";
import { logAction as globalLogAction } from "./services/userActionLogger";

const GamePage = ({ gameConfig, setDualScreen: setDualScreenProp }) => {
  const { gameKey } = useParams();
  const navigate = useNavigate();
  const { logAction, startLogging } = useUserLog();
  const [dualScreen, setDualScreen] = useState(false);

  useEffect(() => {
    // Enable logging as soon as the game page loads
    startLogging();
  }, [startLogging]);

  // Sync dualScreen state with App if setDualScreen prop is provided
  useEffect(() => {
    if (typeof setDualScreenProp === 'function') {
      setDualScreenProp(dualScreen);
    }
  }, [dualScreen, setDualScreenProp]);

  // Find the current game from config
  const currentGame = gameConfig.games.find(g => g.key === gameKey);
  
  // Redirect if game doesn't exist or is disabled
  if (!currentGame || !currentGame.enabled) {
    return <Navigate to="/" replace />;
  }

  const handleBackToGames = () => {
    logAction('Clicked back to games');
    navigate('/');
  };

  // IMPORTANT: All layout toggles must go through handleToggleLayout for logging. Do NOT call setDualScreen directly elsewhere.
  const handleToggleLayout = (source) => {
    const newLayout = !dualScreen;
    setDualScreen(newLayout);
    globalLogAction({
      type: "navigation",
      action: "toggle_screen",
      details: { to: newLayout ? "dual" : "single", triggeredFrom: source }
    });
    logAction(`Switched to ${newLayout ? 'dual' : 'single'} screen layout`);
  };

  return (
    <JournalProvider>
      {dualScreen ? (
        <GameLayout
          selectedGame={currentGame}
          handleBackToGames={handleBackToGames}
          playerNames={gameConfig.playerNames}
          onToggleLayout={() => handleToggleLayout('DualScreenLayout')}
          isDualScreen={true}
        />
      ) : (
        <SingleScreenLayout
          selectedGame={currentGame}
          handleBackToGames={handleBackToGames}
          playerNames={gameConfig.playerNames}
          onToggleLayout={() => handleToggleLayout('SingleScreenLayout')}
          isDualScreen={false}
        />
      )}
    </JournalProvider>
  );
};

export default GamePage;
