"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Calibration, CalibrationProgress } from "../lib/blink-detection/types";
import { CalibrationService } from "../lib/calibration/calibration-service";
import { SupabaseCalibrationService } from "../lib/calibration/supabase-calibration-service";
import { useAuth } from "./AuthContext";

interface CalibrationContextType {
  // Calibration data
  calibrations: Calibration[];
  activeCalibration: Calibration | null;

  // Calibration process state
  isCalibrating: boolean;
  calibrationProgress: CalibrationProgress | null;

  // Loading state
  isLoading: boolean;

  // Actions
  loadCalibrations: () => Promise<void>;
  createCalibration: (
    calibration: Omit<Calibration, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  deleteCalibration: (id: string) => Promise<void>;
  setActiveCalibration: (id: string) => Promise<void>;
  updateCalibrationName: (id: string, name: string) => Promise<void>;
  startCalibration: () => void;
  stopCalibration: () => void;
  updateCalibrationProgress: (progress: Partial<CalibrationProgress>) => void;
  completeCalibration: (
    calibration: Omit<Calibration, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;

  // Helpers
  hasActiveCalibration: () => boolean;
  canStartDetection: () => boolean;
  exportCalibration: (id: string) => string;
  hasOnlyFactoryDefault: () => boolean;
}

const CalibrationContext = createContext<CalibrationContextType | undefined>(
  undefined
);

interface CalibrationProviderProps {
  children: ReactNode;
}

export function CalibrationProvider({ children }: CalibrationProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [activeCalibration, setActiveCalibrationState] =
    useState<Calibration | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] =
    useState<CalibrationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCalibrations = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        // Load from Supabase for authenticated users
        const loadedCalibrations =
          await SupabaseCalibrationService.getAllCalibrations(user.id);
        setCalibrations(loadedCalibrations);

        const active = await SupabaseCalibrationService.getActiveCalibration(
          user.id
        );
        setActiveCalibrationState(active);
      } else {
        // Fallback to localStorage for unauthenticated users
        CalibrationService.ensureDefaultCalibrationExists();
        CalibrationService.fixMultipleActiveCalibrations();

        const loadedCalibrations = CalibrationService.getAllCalibrations();
        setCalibrations(loadedCalibrations);

        const active = CalibrationService.getActiveCalibration();
        setActiveCalibrationState(active);
      }
    } catch (error) {
      console.error("Error loading calibrations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load calibrations when auth state changes
  useEffect(() => {
    if (!authLoading) {
      loadCalibrations();
    }
  }, [authLoading, loadCalibrations]);

  const createCalibration = useCallback(
    async (
      calibrationData: Omit<Calibration, "id" | "createdAt" | "updatedAt">
    ) => {
      try {
        const newCalibration: Calibration = {
          ...calibrationData,
          id: user
            ? SupabaseCalibrationService.generateCalibrationId()
            : CalibrationService.generateCalibrationId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (user) {
          // If the new calibration is marked as active, deactivate all others first
          if (newCalibration.isActive) {
            await SupabaseCalibrationService.setActiveCalibration(
              newCalibration.id,
              user.id
            );
          }
          await SupabaseCalibrationService.saveCalibration(
            newCalibration,
            user.id
          );
        } else {
          // If the new calibration is marked as active, deactivate all others first
          if (newCalibration.isActive) {
            const allCalibrations = CalibrationService.getAllCalibrations();
            allCalibrations.forEach((cal) => {
              cal.isActive = false;
              cal.updatedAt = new Date();
            });
            localStorage.setItem(
              "eyerhythm_calibrations",
              JSON.stringify(allCalibrations)
            );
          }
          CalibrationService.saveCalibration(newCalibration);
        }

        await loadCalibrations();
      } catch (error) {
        console.error("Error creating calibration:", error);
        throw error;
      }
    },
    [user, loadCalibrations]
  );

  const deleteCalibration = useCallback(
    async (id: string) => {
      try {
        // Prevent deletion if this is the only calibration
        if (calibrations.length <= 1) {
          throw new Error("Cannot delete the only calibration");
        }

        // Check if we're deleting the active calibration
        const calibrationToDelete = calibrations.find((cal) => cal.id === id);
        const wasActive = calibrationToDelete?.isActive;

        if (user) {
          await SupabaseCalibrationService.deleteCalibration(id);

          // If we deleted the active calibration, make the most recent one active
          if (wasActive) {
            const remainingCalibrations =
              await SupabaseCalibrationService.getAllCalibrations(user.id);
            if (remainingCalibrations.length > 0) {
              remainingCalibrations.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              );
              const mostRecent = remainingCalibrations[0];
              if (mostRecent) {
                await SupabaseCalibrationService.setActiveCalibration(
                  mostRecent.id,
                  user.id
                );
              }
            }
          }
        } else {
          CalibrationService.deleteCalibration(id);

          // If we deleted the active calibration, make the most recent one active
          if (wasActive) {
            const remainingCalibrations =
              CalibrationService.getAllCalibrations();
            if (remainingCalibrations.length > 0) {
              remainingCalibrations.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              );
              const mostRecent = remainingCalibrations[0];
              if (mostRecent) {
                CalibrationService.setActiveCalibration(mostRecent.id);
              }
            }
          }
        }

        await loadCalibrations();
      } catch (error) {
        console.error("Error deleting calibration:", error);
        throw error;
      }
    },
    [user, calibrations, loadCalibrations]
  );

  const setActiveCalibration = useCallback(
    async (id: string) => {
      try {
        if (user) {
          await SupabaseCalibrationService.setActiveCalibration(id, user.id);
        } else {
          CalibrationService.setActiveCalibration(id);
        }
        await loadCalibrations();
      } catch (error) {
        console.error("Error setting active calibration:", error);
        throw error;
      }
    },
    [user, loadCalibrations]
  );

  const updateCalibrationName = useCallback(
    async (id: string, name: string) => {
      try {
        if (user) {
          await SupabaseCalibrationService.updateCalibrationName(id, name);
        } else {
          CalibrationService.updateCalibrationName(id, name);
        }
        await loadCalibrations();
      } catch (error) {
        console.error("Error updating calibration name:", error);
        throw error;
      }
    },
    [user, loadCalibrations]
  );

  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    setCalibrationProgress({
      currentBlink: 0,
      totalBlinks: 10,
      isActive: true,
      timeRemaining: 2000,
      showBlinkPrompt: false,
    });
  }, []);

  const stopCalibration = useCallback(() => {
    setIsCalibrating(false);
    setCalibrationProgress(null);
  }, []);

  const updateCalibrationProgress = useCallback(
    (progress: Partial<CalibrationProgress>) => {
      setCalibrationProgress((prev) => (prev ? { ...prev, ...progress } : null));
    },
    []
  );

  const completeCalibration = useCallback(
    async (
      calibrationData: Omit<Calibration, "id" | "createdAt" | "updatedAt">
    ) => {
      try {
        // New calibrations should always be active by default
        const newCalibration: Calibration = {
          ...calibrationData,
          id: user
            ? SupabaseCalibrationService.generateCalibrationId()
            : CalibrationService.generateCalibrationId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true, // Always set new calibrations as active
        };

        if (user) {
          // Deactivate all existing calibrations first
          const existingCalibrations =
            await SupabaseCalibrationService.getAllCalibrations(user.id);
          for (const cal of existingCalibrations) {
            if (cal.isActive) {
              await SupabaseCalibrationService.setActiveCalibration(
                cal.id,
                user.id
              );
            }
          }

          // Save the new active calibration
          await SupabaseCalibrationService.saveCalibration(
            newCalibration,
            user.id
          );
          // Set it as active
          await SupabaseCalibrationService.setActiveCalibration(
            newCalibration.id,
            user.id
          );
        } else {
          // If there are existing calibrations, deactivate them first
          if (calibrations.length > 0) {
            const allCalibrations = CalibrationService.getAllCalibrations();
            allCalibrations.forEach((cal) => {
              cal.isActive = false;
              cal.updatedAt = new Date();
            });
            localStorage.setItem(
              "eyerhythm_calibrations",
              JSON.stringify(allCalibrations)
            );
          }

          // Save the new active calibration
          CalibrationService.saveCalibration(newCalibration);
        }

        await loadCalibrations();
        stopCalibration();
      } catch (error) {
        console.error("Error completing calibration:", error);
        throw error;
      }
    },
    [user, calibrations, loadCalibrations, stopCalibration]
  );

  const hasActiveCalibration = useCallback((): boolean => {
    return activeCalibration !== null;
  }, [activeCalibration]);

  const canStartDetection = useCallback((): boolean => {
    return hasActiveCalibration() && !isCalibrating;
  }, [hasActiveCalibration, isCalibrating]);

  const exportCalibration = useCallback(
    (id: string): string => {
      const calibration = calibrations.find((cal) => cal.id === id);
      if (!calibration) throw new Error("Calibration not found");
      return JSON.stringify(calibration, null, 2);
    },
    [calibrations]
  );

  const hasOnlyFactoryDefault = useCallback((): boolean => {
    return calibrations.length === 1 && calibrations[0]?.isDefault === true;
  }, [calibrations]);

  const contextValue: CalibrationContextType = {
    // Data
    calibrations,
    activeCalibration,
    isCalibrating,
    calibrationProgress,
    isLoading,

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
    throw new Error("useCalibration must be used within a CalibrationProvider");
  }
  return context;
}
