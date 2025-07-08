// src/LandingPage.js
import { useNavigate } from "react-router-dom";
import LandingPageTemplate from "./templates/LandingPageTemplate";
import { useUserLog } from "./UserLog";

const LandingPage = ({ gameConfig }) => {
  const navigate = useNavigate();
  const { logAction } = useUserLog();

  // Create game routes mapping
  const gameRoutes = gameConfig.games.reduce((routes, game) => {
    routes[game.name] = `/login/${game.key}`;
    return routes;
  }, {});

  const handleGameSelect = (route) => {
    navigate(route);
  };

  return (
    <LandingPageTemplate 
      gameRoutes={gameRoutes} 
      onNavigate={handleGameSelect} 
      className="landing-bg" 
    />
  );
};

export default LandingPage;
