const LandingPageTemplate = ({ gameRoutes, onNavigate, className }) => {
  return (
    <div className={className} style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ fontSize: "4rem", marginBottom: "2rem" }}>DataOrganisms</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {Object.entries(gameRoutes).map(([game, route]) => {
          const isEnabled = game === "Alien Invasion";
          return (
            <button
              key={game}
              onClick={() => isEnabled && onNavigate(route)}
              className={isEnabled ? "dark-red" : "dimmer-red"}
              style={{
                fontSize: "1.5rem",
                padding: "0.8rem 1.5rem",
                cursor: isEnabled ? "pointer" : "not-allowed",
                opacity: isEnabled ? 1 : 0.5,
                borderRadius: "8px",
                border: "none"
              }}
            >
              {game}
            </button>
          );
        })}
        
        {/* Control Panel Button */}
        <button
          onClick={() => onNavigate("/control-panel")}
          className="dark-red"
          style={{
            fontSize: "1.5rem",
            padding: "0.8rem 1.5rem",
            cursor: "pointer",
            borderRadius: "8px",
            border: "none",
            marginTop: "1rem"
          }}
        >
          Control Panel
        </button>
      </div>
    </div>
  );
};

export default LandingPageTemplate; 