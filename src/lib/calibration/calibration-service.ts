import { Calibration, CalibrationRawData } from '../blink-detection/types';

const CALIBRATIONS_STORAGE_KEY = 'eyerhythm_calibrations';

export class CalibrationService {
  static getAllCalibrations(): Calibration[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(CALIBRATIONS_STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((cal: Calibration) => ({
        ...cal,
        createdAt: new Date(cal.createdAt),
        updatedAt: new Date(cal.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading calibrations:', error);
      return [];
    }
  }

  static saveCalibration(calibration: Calibration): void {
    if (typeof window === 'undefined') return;
    
    try {
      const calibrations = this.getAllCalibrations();
      const existingIndex = calibrations.findIndex(cal => cal.id === calibration.id);
      
      if (existingIndex >= 0) {
        calibrations[existingIndex] = calibration;
      } else {
        calibrations.push(calibration);
      }
      
      localStorage.setItem(CALIBRATIONS_STORAGE_KEY, JSON.stringify(calibrations));
    } catch (error) {
      console.error('Error saving calibration:', error);
      throw new Error('Failed to save calibration');
    }
  }

  static deleteCalibration(id: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const calibrations = this.getAllCalibrations();
      const filtered = calibrations.filter(cal => cal.id !== id);
      localStorage.setItem(CALIBRATIONS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting calibration:', error);
      throw new Error('Failed to delete calibration');
    }
  }

  static getActiveCalibration(): Calibration | null {
    const calibrations = this.getAllCalibrations();
    return calibrations.find(cal => cal.isActive) || null;
  }

  static setActiveCalibration(id: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const calibrations = this.getAllCalibrations();
      
      // Set all to inactive first
      calibrations.forEach(cal => {
        cal.isActive = false;
        cal.updatedAt = new Date();
      });
      
      // Set the selected one to active
      const targetCalibration = calibrations.find(cal => cal.id === id);
      if (targetCalibration) {
        targetCalibration.isActive = true;
        targetCalibration.updatedAt = new Date();
      }
      
      localStorage.setItem(CALIBRATIONS_STORAGE_KEY, JSON.stringify(calibrations));
    } catch (error) {
      console.error('Error setting active calibration:', error);
      throw new Error('Failed to set active calibration');
    }
  }

  static updateCalibrationName(id: string, name: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const calibrations = this.getAllCalibrations();
      const calibration = calibrations.find(cal => cal.id === id);
      
      if (calibration) {
        calibration.name = name;
        calibration.updatedAt = new Date();
        localStorage.setItem(CALIBRATIONS_STORAGE_KEY, JSON.stringify(calibrations));
      }
    } catch (error) {
      console.error('Error updating calibration name:', error);
      throw new Error('Failed to update calibration name');
    }
  }

  static generateCalibrationId(): string {
    return 'cal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  static generateDefaultName(): string {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `Calibration ${timestamp}`;
  }

  static calculateEarThreshold(rawData: CalibrationRawData): number {
    if (rawData.blinkEvents.length === 0) {
      return 0.25; // Default fallback
    }

    // Calculate threshold as 90% of the average minimum EAR during blinks
    // This provides a buffer to avoid false positives
    const blinkEarValues = rawData.blinkEvents.map(event => event.earValue);
    const averageBlinkEar = blinkEarValues.reduce((sum, val) => sum + val, 0) / blinkEarValues.length;
    
    return Math.max(0.15, Math.min(0.35, averageBlinkEar * 1.1));
  }

  static validateCalibration(calibration: Calibration): boolean {
    const { metadata } = calibration;
    
    // Check if we detected at least 70% of requested blinks
    const detectionRate = metadata.totalBlinksDetected / metadata.totalBlinksRequested;
    if (detectionRate < 0.7) return false;
    
    // Check if EAR values are reasonable
    if (metadata.minEarValue < 0.1 || metadata.maxEarValue > 2.0) return false;
    
    // Check if we have sufficient data
    if (calibration.rawData.blinkEvents.length < 5) return false;
    
    return true;
  }

  static exportCalibration(id: string): string {
    const calibration = this.getAllCalibrations().find(cal => cal.id === id);
    if (!calibration) throw new Error('Calibration not found');
    
    return JSON.stringify(calibration, null, 2);
  }

  static clearAllCalibrations(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CALIBRATIONS_STORAGE_KEY);
  }

  static fixMultipleActiveCalibrations(): void {
    if (typeof window === 'undefined') return;

    try {
      const calibrations = this.getAllCalibrations();
      const activeCalibrations = calibrations.filter(cal => cal.isActive);

      // If there are multiple active calibrations, keep only the most recent one active
      if (activeCalibrations.length > 1) {
        // Sort by createdAt date (most recent first)
        activeCalibrations.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Deactivate all except the most recent
        const mostRecent = activeCalibrations[0];
        if (mostRecent) {
          calibrations.forEach(cal => {
            if (cal.id !== mostRecent.id) {
              cal.isActive = false;
              cal.updatedAt = new Date();
            }
          });
        }

        localStorage.setItem(CALIBRATIONS_STORAGE_KEY, JSON.stringify(calibrations));
      }
    } catch (error) {
      console.error('Error fixing multiple active calibrations:', error);
    }
  }

  static createDefaultCalibration(): Calibration {
    const now = new Date();
    return {
      id: 'default',
      name: 'Factory Default',
      createdAt: now,
      updatedAt: now,
      isActive: true,
      isDefault: true,
      earThreshold: 0.25,
      metadata: {
        totalBlinksRequested: 0,
        totalBlinksDetected: 0,
        accuracy: 0,
        averageBlinkInterval: 0,
        minEarValue: 0.25,
        maxEarValue: 0.25,
      },
      rawData: {
        timestamps: [],
        earValues: [],
        blinkEvents: [],
      },
    };
  }

  static ensureDefaultCalibrationExists(): void {
    if (typeof window === 'undefined') return;

    try {
      const calibrations = this.getAllCalibrations();

      // If no calibrations exist, create and save the default one
      if (calibrations.length === 0) {
        const defaultCalibration = this.createDefaultCalibration();
        this.saveCalibration(defaultCalibration);
      }
    } catch (error) {
      console.error('Error ensuring default calibration exists:', error);
    }
  }
}