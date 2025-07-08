# DataBooks - Interactive Data Science Learning Platform

A React-based educational platform that integrates real-time ESP device data with interactive games and data visualization for teaching data science concepts.

## Features

- **Real-time ESP Device Integration**: Direct Firebase connection for immediate data processing
- **Interactive Games**: Alien Invasion game that responds to ESP device interactions
- **Data Visualization**: Real-time charts and plots using Plotly
- **Control Panel**: Comprehensive testing and monitoring interface
- **Journal System**: User activity logging and reflection
- **Firebase Backend**: Scalable, real-time data storage and synchronization

## Architecture

### Frontend
- **React**: Modern UI with hooks and context
- **Firebase**: Real-time database and authentication
- **Plotly**: Interactive data visualization
- **Custom Hooks**: ESP data management and real-time updates

### Data Pipeline
- **ESP Devices**: Physical devices sending button presses, status, and proximity data
- **Firebase Realtime Database**: Immediate data storage and synchronization
- **Real-time Updates**: Live data streaming to games and visualizations
- **Session Management**: Organized data storage by user sessions

### ESP Data Format
```json
{
  "id": "ESP_001",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "buttonA": 1,
  "buttonB": 0,
  "status": 0.75,
  "beaconArray": 1,
  "totalButtons": 1,
  "hasInteraction": true,
  "receivedAt": "2024-01-01T12:00:00.000Z",
  "sessionId": "user-session-123"
}
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Realtime Database

### Installation
1. Clone the repository
2. Navigate to the DataBooks directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up Firebase configuration:
   - Create a `.env` file in the DataBooks directory
   - Add your Firebase configuration:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   ```

### Running the Application
1. Start the development server:
   ```bash
   npm start
   ```
2. Open [http://localhost:3000](http://localhost:3000) to view the app

### Testing ESP Devices
The application includes built-in ESP device simulation:

1. **Browser-based testing**: Use the "Send Test Packet" and "Start Simulation" buttons in the Control Panel
2. **Node.js testing** (optional): For advanced testing scenarios:
   ```bash
   # Send a single test packet
   npm run test-esp-single

   # Start continuous simulation (2-second intervals)
   npm run test-esp

   # Start fast simulation (0.5-second intervals)
   npm run test-esp-fast
   ```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run test-esp` - Starts ESP device simulation
- `npm run test-esp-single` - Sends a single test packet
- `npm run test-esp-fast` - Fast simulation mode

## Project Structure

```
src/
├── games/           # Interactive games (Alien Invasion, etc.)
├── plots/           # Data visualization components
├── services/        # Firebase and data services
├── hooks/           # Custom React hooks
├── utils/           # Utility functions and ESP simulator
├── ControlPanel.js  # Main control interface
├── GameLayout.js    # Dual-screen layout system
├── App.js           # Main application component
└── firebase.js      # Firebase configuration
```

## Key Components

### Control Panel
- Real-time ESP statistics
- Device activity monitoring
- Test controls and simulation
- Data visualization
- Server data inspection

### Alien Invasion Game
- Real-time ESP data integration
- Dynamic alien ship generation based on device interactions
- Interactive gameplay with data science concepts

### ESP Data Management
- Real-time data streaming from Firebase
- Automatic data processing and enhancement
- Session-based data organization
- Historical data analysis

## Firebase Database Structure

```
firebase-database/
├── devicePackets/           # Individual ESP packets
│   ├── ESP_001/            # Device-specific data
│   └── ESP_002/
├── sessions/               # User session data
│   ├── session-1/
│   │   ├── devicePackets/  # Session-specific packets
│   │   └── userActions/    # User interactions
│   └── session-2/
└── stats/                  # Aggregated statistics
    ├── totalPackets
    ├── activeDevices
    └── interactions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
