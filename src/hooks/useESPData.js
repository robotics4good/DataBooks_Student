// useESPData.js - Custom hook for fetching and transforming ESP data from Firebase
import { useState, useEffect } from 'react';
import { db, ref, get } from '../firebase';
import { formatSanDiegoTimeOnly, formatSanDiegoTime, timeService } from '../utils/timeUtils';
import dataSyncService from '../services/dataSyncService';

/**
 * Custom hook for fetching ESP data from Firebase and transforming it for plots
 * @param {boolean} enableRealTime - Whether to enable real-time updates (default: false)
 * @returns {Object} - ESP data in various formats for different plot types
 */
export function useESPData(enableRealTime = false) {
  const [espData, setEspData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manual fetch function
  const fetchESPData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const espDataRef = ref(db, 'devicePackets');
      const snapshot = await get(espDataRef);
      const data = snapshot.val();
      
      if (data) {
        // Transform Firebase data into array format
        const transformedData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        // Sort by timestamp
        transformedData.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        setEspData(transformedData);
        
        // Update ESP data summary in localStorage for sync service
        const summary = {
          totalPackets: transformedData.length,
          uniqueStudents: [...new Set(transformedData.map(item => item.id).filter(Boolean))].length,
          lastUpdate: timeService.getCurrentTime().toISOString()
        };
        dataSyncService.updateESPDataSummary(summary);
      } else {
        setEspData([]);
        // Update with empty summary
        dataSyncService.updateESPDataSummary({
          totalPackets: 0,
          uniqueStudents: 0,
          lastUpdate: timeService.getCurrentTime().toISOString()
        });
      }
    } catch (err) {
      console.error("Error processing ESP data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load only
  useEffect(() => {
    fetchESPData();
  }, []);

  // Transform ESP data for different plot types
  const getPlotData = (plotType, xVariable = "timestamp", yVariable = "status") => {
    if (!espData.length) return [];

    switch (plotType) {
      case 'line':
      case 'scatter':
        return [{
          id: 'ESP Data',
          data: espData.map(item => ({
            x: xVariable === "timestamp" ? formatSanDiegoTimeOnly(item.timestamp) : item[xVariable],
            y: item[yVariable] || 0
          }))
        }];

      case 'bar':
        // Group by device ID and count button presses
        const groupedData = espData.reduce((acc, item) => {
          const deviceId = item.id || 'Unknown';
          if (!acc[deviceId]) {
            acc[deviceId] = {
              buttonAPresses: 0,
              buttonBPresses: 0,
              interactions: 0,
              totalPackets: 0
            };
          }
          acc[deviceId].buttonAPresses += item.buttonA || 0;
          acc[deviceId].buttonBPresses += item.buttonB || 0;
          acc[deviceId].interactions += item.beaconArray || 0;
          acc[deviceId].totalPackets += 1;
          return acc;
        }, {});
        
        return [
          {
            id: 'Button A Presses',
            data: Object.entries(groupedData).map(([deviceId, stats]) => ({
              x: deviceId,
              y: stats.buttonAPresses
            }))
          },
          {
            id: 'Button B Presses',
            data: Object.entries(groupedData).map(([deviceId, stats]) => ({
              x: deviceId,
              y: stats.buttonBPresses
            }))
          },
          {
            id: 'Interactions',
            data: Object.entries(groupedData).map(([deviceId, stats]) => ({
              x: deviceId,
              y: stats.interactions
            }))
          }
        ];

      case 'histogram':
        // Create histogram of status values
        const statusCounts = {};
        espData.forEach(item => {
          const status = item.status || 0;
          const bucket = Math.floor(status * 10) / 10; // Group by 0.1 increments
          statusCounts[bucket] = (statusCounts[bucket] || 0) + 1;
        });
        
        return [{
          id: 'Status Distribution',
          data: Object.entries(statusCounts).map(([bucket, count]) => ({
            x: `${parseFloat(bucket).toFixed(1)}`,
            y: count
          }))
        }];

      case 'pie':
        // Count button presses and interactions
        const totalStats = espData.reduce((acc, item) => {
          acc.buttonAPresses += item.buttonA || 0;
          acc.buttonBPresses += item.buttonB || 0;
          acc.interactions += item.beaconArray || 0;
          return acc;
        }, { buttonAPresses: 0, buttonBPresses: 0, interactions: 0 });
        
        return [
          {
            id: 'Button A',
            label: 'Button A Presses',
            value: totalStats.buttonAPresses
          },
          {
            id: 'Button B',
            label: 'Button B Presses',
            value: totalStats.buttonBPresses
          },
          {
            id: 'Interactions',
            label: 'Device Interactions',
            value: totalStats.interactions
          }
        ];

      default:
        return [];
    }
  };

  // Get available variables for plot configuration
  const getAvailableVariables = () => {
    if (!espData.length) return [];
    
    const firstItem = espData[0];
    return Object.keys(firstItem).filter(key => 
      key !== 'id' && 
      typeof firstItem[key] === 'number' || 
      typeof firstItem[key] === 'string'
    );
  };

  // Get unique device IDs
  const getDeviceIds = () => {
    return [...new Set(espData.map(item => item.id).filter(Boolean))];
  };

  // Calculate statistics
  const totalPackets = espData.length;
  const uniqueStudents = getDeviceIds().length;
  const timeRange = espData.length > 0 ? {
    start: espData[0]?.timestamp,
    end: espData[espData.length - 1]?.timestamp
  } : null;

  return {
    // Raw data
    espData,
    loading,
    error,
    
    // Manual fetch function
    fetchESPData,
    
    // Plot data functions
    getPlotData,
    getAvailableVariables,
    getDeviceIds,
    
    // Statistics
    totalPackets,
    uniqueStudents,
    timeRange
  };
} 