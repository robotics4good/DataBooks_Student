// ESPDataPlot.js - Plot component for ESP data from Firebase
// All time handling uses local device time only
import React from 'react';
import PlotComponent from './PlotComponent';
import styles from './PlotComponent.module.css';
import { formatLocalTime } from '../utils/timeUtils';

const ESPDataPlot = ({ plotLabel = "ESP Data", espData = [], loading = false, error = null }) => {
  // Custom log action for ESP data plots
  const logAction = (action) => {
    console.log(`ESP Data Plot - ${action}`);
  };

  if (loading) {
    return (
      <div className={styles.plotContainer}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '200px',
          color: '#000000'
        }}>
          Loading ESP data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.plotContainer}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '200px',
          color: '#ff0000'
        }}>
          Error loading ESP data: {error}
        </div>
      </div>
    );
  }

  if (!espData.length) {
    return (
      <div className={styles.plotContainer}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '200px',
          color: '#000000'
        }}>
          <div>No ESP data available</div>
          <div style={{ fontSize: '0.8rem', marginTop: '8px' }}>
            Waiting for ESP device data...
          </div>
        </div>
      </div>
    );
  }

  // Pass the raw, normalized espData directly to PlotComponent
  return (
    <div className={styles.plotContainer}>
      {/* Data Summary */}
      <div style={{ 
        padding: '8px 12px', 
        background: '#f5f5f5',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '0.8rem',
        color: '#000000'
      }}>
        <strong>ESP Data Summary:</strong> {espData.length} packets
        {espData.length > 0 && (
          <span style={{ marginLeft: '12px' }}>
            Time range: {formatLocalTime(new Date(Math.min(...espData.map(item => new Date(item.timestamp).getTime() || 0))))} - {formatLocalTime(new Date(Math.max(...espData.map(item => new Date(item.timestamp).getTime() || 0))))}
          </span>
        )}
      </div>
      {/* Plot Component */}
      <PlotComponent
        plotLabel={plotLabel}
        data={espData} // <-- pass raw, normalized ESP data
        logAction={logAction}
      />
    </div>
  );
};

export default ESPDataPlot; 