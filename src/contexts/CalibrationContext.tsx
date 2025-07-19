'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Calibration, CalibrationProgress } from '../lib/blink-detection/types';
import { CalibrationService } from '../lib/calibration/calibration-service';

interface CalibrationContextType {
  // Calibration data
  calibrations: Calibration[];
  activeCalibration: Calibration | null;
  
  // Calibration process state
  isCalibrating: boolean;
  calibrationProgress: CalibrationProgress | null;
  
  // Actions
  loadCalibrations: () => void;
  createCalibration: (calibration: Omit<Calibration, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteCalibration: (id: string) => void;
  setActiveCalibration: (id: string) => void;
  updateCalibrationName: (id: string, name: string) => void;
  startCalibration: () => void;
  stopCalibration: () => void;
  updateCalibrationProgress: (progress: Partial<CalibrationProgress>) => void;
  completeCalibration: (calibration: Omit<Calibration, 'id' | 'createdAt' | 'updatedAt'>) => void;
  
  // Helpers
  hasActiveCalibration: () => boolean;
  canStartDetection: () => boolean;
  exportCalibration: (id: string) => string;
}

const CalibrationContext = createContext<CalibrationContextType | undefined>(undefined);

interface CalibrationProviderProps {
  children: ReactNode;
}

export function CalibrationProvider({ children }: CalibrationProviderProps) {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [activeCalibration, setActiveCalibrationState] = useState<Calibration | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState<CalibrationProgress | null>(null);

  // Load calibrations on mount
  useEffect(() => {
    // Fix any existing data with multiple active calibrations
    CalibrationService.fixMultipleActiveCalibrations();
    loadCalibrations();
  }, []);

  const loadCalibrations = () => {
    try {
      const loadedCalibrations = CalibrationService.getAllCalibrations();
      setCalibrations(loadedCalibrations);
      
      const active = CalibrationService.getActiveCalibration();
      setActiveCalibrationState(active);
    } catch (error) {
      console.error('Error loading calibrations:', error);
    }
  };

  const createCalibration = (calibrationData: Omit<Calibration, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCalibration: Calibration = {
        ...calibrationData,
        id: CalibrationService.generateCalibrationId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // If the new calibration is marked as active, deactivate all others first
      if (newCalibration.isActive) {
        const allCalibrations = CalibrationService.getAllCalibrations();
        allCalibrations.forEach(cal => {
          cal.isActive = false;
          cal.updatedAt = new Date();
        });
        localStorage.setItem('blinktrack_calibrations', JSON.stringify(allCalibrations));
      }

      CalibrationService.saveCalibration(newCalibration);
      loadCalibrations();
    } catch (error) {
      console.error('Error creating calibration:', error);
      throw error;
    }
  };

  const deleteCalibration = (id: string) => {
    try {
      // Check if we're deleting the active calibration
      const calibrationToDelete = calibrations.find(cal => cal.id === id);
      const wasActive = calibrationToDelete?.isActive;
      
      CalibrationService.deleteCalibration(id);
      
      // If we deleted the active calibration and there are others, make the most recent one active
      if (wasActive) {
        const remainingCalibrations = CalibrationService.getAllCalibrations();
        if (remainingCalibrations.length > 0) {
          // Sort by createdAt date (most recent first)
          remainingCalibrations.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          // Set the most recent as active
          CalibrationService.setActiveCalibration(remainingCalibrations[0].id);
        }
      }
      
      loadCalibrations();
    } catch (error) {
      console.error('Error deleting calibration:', error);
      throw error;
    }
  };

  const setActiveCalibration = (id: string) => {
    try {
      CalibrationService.setActiveCalibration(id);
      loadCalibrations();
    } catch (error) {
      console.error('Error setting active calibration:', error);
      throw error;
    }
  };

  const updateCalibrationName = (id: string, name: string) => {
    try {
      CalibrationService.updateCalibrationName(id, name);
      loadCalibrations();
    } catch (error) {
      console.error('Error updating calibration name:', error);
      throw error;
    }
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationProgress({
      currentBlink: 0,
      totalBlinks: 10,
      isActive: true,
      timeRemaining: 2000,
      showBlinkPrompt: false,
    });
  };

  const stopCalibration = () => {
    setIsCalibrating(false);
    setCalibrationProgress(null);
  };

  const updateCalibrationProgress = (progress: Partial<CalibrationProgress>) => {
    setCalibrationProgress(prev => prev ? { ...prev, ...progress } : null);
  };

  const completeCalibration = (calibrationData: Omit<Calibration, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // New calibrations should always be active by default
      const newCalibration: Calibration = {
        ...calibrationData,
        id: CalibrationService.generateCalibrationId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true, // Always set new calibrations as active
      };

      // If there are existing calibrations, deactivate them first
      if (calibrations.length > 0) {
        // Deactivate all existing calibrations
        const allCalibrations = CalibrationService.getAllCalibrations();
        allCalibrations.forEach(cal => {
          cal.isActive = false;
          cal.updatedAt = new Date();
        });
        
        // Save the deactivated calibrations
        localStorage.setItem('blinktrack_calibrations', JSON.stringify(allCalibrations));
      }

      // Save the new active calibration
      CalibrationService.saveCalibration(newCalibration);
      loadCalibrations();
      stopCalibration();
    } catch (error) {
      console.error('Error completing calibration:', error);
      throw error;
    }
  };

  const hasActiveCalibration = (): boolean => {
    return activeCalibration !== null;
  };

  const canStartDetection = (): boolean => {
    return hasActiveCalibration() && !isCalibrating;
  };

  const exportCalibration = (id: string): string => {
    return CalibrationService.exportCalibration(id);
  };

  const contextValue: CalibrationContextType = {
    // Data
    calibrations,
    activeCalibration,
    isCalibrating,
    calibrationProgress,
    
    // Actions
    loadCalibrations,
    createCalibration,
    deleteCalibration,
    setActiveCalibration,
    updateCalibrationName,
    startCalibration,
    stopCalibration,
    updateCalibrationProgress,
    completeCalibration,
    
    // Helpers
    hasActiveCalibration,
    canStartDetection,
    exportCalibration,
  };

  return (
    <CalibrationContext.Provider value={contextValue}>
      {children}
    </CalibrationContext.Provider>
  );
}

export function useCalibration(): CalibrationContextType {
  const context = useContext(CalibrationContext);
  if (context === undefined) {
    throw new Error('useCalibration must be used within a CalibrationProvider');
  }
  return context;
}