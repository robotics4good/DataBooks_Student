import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import GamePage from "./GamePage";
import { UserLogProvider } from "./UserLog";
import "./App.css";
import { logAction } from "./services/userActionLogger";

// Game configuration - centralized and maintainable
const GAME_CONFIG = {
  games: [
    { name: "Alien Invasion", key: "alien-invasion", enabled: true },
    { name: "Whisper Web", key: "whisper-web", enabled: false },
    { name: "Logistics League", key: "logistics-league", enabled: false },
    { name: "Pollination Party", key: "pollination-party", enabled: false },
    { name: "Rush Hour Rebels", key: "rush-hour-rebels", enabled: false }
  ],
  playerNames: [
    "Luma", "Buzz", "Kino", "Zee", "Taz", "Jade", "Star", "Gem", "Echo",
    "Synth", "Jazz", "Drift", "Nova", "Hex", "Ember", "Mav", "Geo", "Eli", "Glow", "Lex"
  ]
};

const App = () => {
  useEffect(() => {
    if (window.location.pathname !== "/") {
      window.location.replace("/");
    }
  }, []);
  return (
    <UserLogProvider>
      <div className="App">
        <div className="size-unsupported-message">
          Please make your browser window larger to use the application.
        </div>
        <div className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage gameConfig={GAME_CONFIG} />} />
            <Route path="/login/:gameKey" element={<LoginPage gameConfig={GAME_CONFIG} />} />
            <Route path="/games/:gameKey" element={<GamePage gameConfig={GAME_CONFIG} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </UserLogProvider>
  );
};

export default App;
