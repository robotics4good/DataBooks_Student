// ESPDataPlot.js - Plot component for ESP data from Firebase
import React from 'react';
import PlotComponent from './PlotComponent';
import styles from './PlotComponent.module.css';
import { formatSanDiegoTime } from '../utils/timeUtils';

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

  // Transform ESP data for the plot component
  const transformedData = [{
    id: 'ESP Data',
    data: espData.map(item => ({
      x: item.timestamp ? formatSanDiegoTime(item.timestamp) : item.timestamp,
      y: item.interaction || 0
    }))
  }];

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
            Time range: {formatSanDiegoTime(Math.min(...espData.map(item => item.timestamp || 0)))} - {formatSanDiegoTime(Math.max(...espData.map(item => item.timestamp || 0)))}
          </span>
        )}
      </div>
      {/* Plot Component */}
      <PlotComponent
        plotLabel={plotLabel}
        data={transformedData}
        logAction={logAction}
      />
    </div>
  );
};

export default ESPDataPlot; 