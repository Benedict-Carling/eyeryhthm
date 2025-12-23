'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Calibration, CalibrationProgress } from '../lib/blink-detection/types';
import { CalibrationService } from '../lib/calibration/calibration-service';
import { SupabaseSyncService } from '../lib/sync';
import { useAuth } from './AuthContext';

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
  hasOnlyFactoryDefault: () => boolean;
}

const CalibrationContext = createContext<CalibrationContextType | undefined>(undefined);

interface CalibrationProviderProps {
  children: ReactNode;
}

export function CalibrationProvider({ children }: CalibrationProviderProps) {
  const { user } = useAuth();
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [activeCalibration, setActiveCalibrationState] = useState<Calibration | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState<CalibrationProgress | null>(null);
  const isLoadingRef = useRef(false);

  // Load calibrations on mount
  useEffect(() => {
    // Ensure default calibration exists
    CalibrationService.ensureDefaultCalibrationExists();
    // Fix any existing data with multiple active calibrations
    CalibrationService.fixMultipleActiveCalibrations();
    loadCalibrations();
  }, []);

  const loadCalibrations = useCallback(async () => {
    // Prevent re-execution while loading
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;

    try {
      // Load from localStorage first (instant)
      const localCalibrations = CalibrationService.getAllCalibrations();
      setCalibrations(localCalibrations);

      // If authenticated, merge with Supabase data
      if (user?.id) {
        const supabaseCalibrations = await SupabaseSyncService.loadCalibrations(user.id);
        const merged = SupabaseSyncService.mergeCalibrations(localCalibrations, supabaseCalibrations);

        // Update localStorage with merged data
        for (const cal of merged) {
          await CalibrationService.saveCalibration(cal, user.id);
        }

        setCalibrations(merged);
      }

      const active = CalibrationService.getActiveCalibration();
      setActiveCalibrationState(active);
    } catch (error) {
      console.error('Error loading calibrations:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user]);

  const createCalibration = useCallback(async (calibrationData: Omit<Calibration, 'id' | 'createdAt' | 'updatedAt'>) => {
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
        localStorage.setItem('eyerhythm_calibrations', JSON.stringify(allCalibrations));
      }

      await CalibrationService.saveCalibration(newCalibration, user?.id);
      await loadCalibrations();
    } catch (error) {
      console.error('Error creating calibration:', error);
      throw error;
    }
  }, [user, loadCalibrations]);

  const deleteCalibration = useCallback(async (id: string) => {
    try {
      // Prevent deletion if this is the only calibration
      if (calibrations.length <= 1) {
        throw new Error('Cannot delete the only calibration');
      }

      // Check if we're deleting the active calibration
      const calibrationToDelete = calibrations.find(cal => cal.id === id);
      const wasActive = calibrationToDelete?.isActive;

      await CalibrationService.deleteCalibration(id, user?.id);

      // If we deleted the active calibration and there are others, make the most recent one active
      if (wasActive) {
        const remainingCalibrations = CalibrationService.getAllCalibrations();
        if (remainingCalibrations.length > 0) {
          // Sort by createdAt date (most recent first)
          remainingCalibrations.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          // Set the most recent as active
          const mostRecent = remainingCalibrations[0];
          if (mostRecent) {
            await CalibrationService.setActiveCalibration(mostRecent.id, user?.id);
          }
        }
      }

      await loadCalibrations();
    } catch (error) {
      console.error('Error deleting calibration:', error);
      throw error;
    }
  }, [calibrations, user, loadCalibrations]);

  const setActiveCalibration = useCallback(async (id: string) => {
    try {
      await CalibrationService.setActiveCalibration(id, user?.id);
      await loadCalibrations();
    } catch (error) {
      console.error('Error setting active calibration:', error);
      throw error;
    }
  }, [user, loadCalibrations]);

  const updateCalibrationName = useCallback(async (id: string, name: string) => {
    try {
      await CalibrationService.updateCalibrationName(id, name, user?.id);
      await loadCalibrations();
    } catch (error) {
      console.error('Error updating calibration name:', error);
      throw error;
    }
  }, [user, loadCalibrations]);

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

  const completeCalibration = useCallback(async (calibrationData: Omit<Calibration, 'id' | 'createdAt' | 'updatedAt'>) => {
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
        localStorage.setItem('eyerhythm_calibrations', JSON.stringify(allCalibrations));
      }

      // Save the new active calibration
      await CalibrationService.saveCalibration(newCalibration, user?.id);
      await loadCalibrations();
      stopCalibration();
    } catch (error) {
      console.error('Error completing calibration:', error);
      throw error;
    }
  }, [calibrations, user, loadCalibrations]);

  const hasActiveCalibration = (): boolean => {
    return activeCalibration !== null;
  };

  const canStartDetection = (): boolean => {
    return hasActiveCalibration() && !isCalibrating;
  };

  const exportCalibration = (id: string): string => {
    return CalibrationService.exportCalibration(id);
  };

  const hasOnlyFactoryDefault = (): boolean => {
    return calibrations.length === 1 && calibrations[0]?.isDefault === true;
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
    hasOnlyFactoryDefault,
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