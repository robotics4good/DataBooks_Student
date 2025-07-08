// espSimulator.js - Browser-based ESP device simulation utility

import { db, ref, push, set } from '../firebase';
import { timeService } from './timeUtils';

class ESPSimulator {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.devices = ['ESP_001', 'ESP_002', 'ESP_003', 'ESP_004', 'ESP_005'];
    this.currentInterval = 2000; // Default 2 seconds
  }

  /**
   * Generate random ESP device data
   */
  generateESPData() {
    const deviceId = this.devices[Math.floor(Math.random() * this.devices.length)];
    
    return {
      id: deviceId,
      timestamp: timeService.getCurrentTime().toISOString(),
      buttonA: Math.random() > 0.7 ? 1 : 0,
      buttonB: Math.random() > 0.8 ? 1 : 0,
      status: Math.random(),
      beaconArray: Math.random() > 0.9 ? 1 : 0,
      totalButtons: Math.floor(Math.random() * 3),
      hasInteraction: Math.random() > 0.8,
      receivedAt: timeService.getCurrentTime().toISOString(),
      sessionId: `browser-session-${timeService.getCurrentTime().getTime()}`
    };
  }

  /**
   * Send ESP data to Firebase
   */
  async sendESPData(data) {
    try {
      const devicePacketsRef = ref(db, 'devicePackets');
      const newPacketRef = push(devicePacketsRef);
      await set(newPacketRef, data);
      
      console.log(`📡 Browser ESP: ${data.id} - Status: ${data.status.toFixed(2)} - Buttons: A=${data.buttonA}, B=${data.buttonB}`);
      return newPacketRef.key;
    } catch (error) {
      console.error('❌ Error sending ESP data:', error);
      throw error;
    }
  }

  /**
   * Send a single test packet
   */
  async sendTestPacket() {
    try {
      const data = this.generateESPData();
      const key = await this.sendESPData(data);
      return { success: true, key, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Start continuous simulation
   */
  startSimulation(interval = 2000) {
    if (this.isRunning) {
      console.log('⚠️ Simulation already running');
      return false;
    }

    this.isRunning = true;
    this.currentInterval = interval;
    
    console.log(`🚀 Starting browser ESP simulation (interval: ${interval}ms)`);
    
    this.intervalId = setInterval(async () => {
      try {
        const data = this.generateESPData();
        await this.sendESPData(data);
      } catch (error) {
        console.error('❌ Simulation error:', error);
        this.stopSimulation();
      }
    }, interval);
    
    return true;
  }

  /**
   * Stop the simulation
   */
  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Browser ESP simulation stopped');
  }

  /**
   * Get simulation status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.currentInterval,
      devices: this.devices
    };
  }

  /**
   * Change simulation interval
   */
  setInterval(interval) {
    this.currentInterval = interval;
    if (this.isRunning) {
      this.stopSimulation();
      this.startSimulation(interval);
    }
  }

  /**
   * Add a custom device
   */
  addDevice(deviceId) {
    if (!this.devices.includes(deviceId)) {
      this.devices.push(deviceId);
    }
  }

  /**
   * Remove a device
   */
  removeDevice(deviceId) {
    this.devices = this.devices.filter(id => id !== deviceId);
  }

  /**
   * Generate realistic ESP data based on patterns
   */
  generateRealisticESPData() {
    const deviceId = this.devices[Math.floor(Math.random() * this.devices.length)];
    
    // Simulate more realistic button press patterns
    const buttonAPressed = Math.random() > 0.85;
    const buttonBPressed = Math.random() > 0.9;
    
    // Simulate status changes over time
    const baseStatus = Math.sin(timeService.getCurrentTime().getTime() / 10000) * 0.5 + 0.5; // Oscillating pattern
    const noise = (Math.random() - 0.5) * 0.2; // Add some noise
    const status = Math.max(0, Math.min(1, baseStatus + noise));
    
    // Simulate beacon interactions
    const beaconActive = Math.random() > 0.95;
    
    return {
      id: deviceId,
      timestamp: timeService.getCurrentTime().toISOString(),
      buttonA: buttonAPressed ? 1 : 0,
      buttonB: buttonBPressed ? 1 : 0,
      status: status,
      beaconArray: beaconActive ? 1 : 0,
      totalButtons: (buttonAPressed ? 1 : 0) + (buttonBPressed ? 1 : 0),
      hasInteraction: buttonAPressed || buttonBPressed || beaconActive,
      receivedAt: timeService.getCurrentTime().toISOString(),
      sessionId: `browser-session-${timeService.getCurrentTime().getTime()}`
    };
  }

  /**
   * Start realistic simulation
   */
  startRealisticSimulation(interval = 2000) {
    if (this.isRunning) {
      console.log('⚠️ Simulation already running');
      return false;
    }

    this.isRunning = true;
    this.currentInterval = interval;
    
    console.log(`🚀 Starting realistic browser ESP simulation (interval: ${interval}ms)`);
    
    this.intervalId = setInterval(async () => {
      try {
        const data = this.generateRealisticESPData();
        await this.sendESPData(data);
      } catch (error) {
        console.error('❌ Realistic simulation error:', error);
        this.stopSimulation();
      }
    }, interval);
    
    return true;
  }
}

// Create singleton instance
const espSimulator = new ESPSimulator();

export default espSimulator; 