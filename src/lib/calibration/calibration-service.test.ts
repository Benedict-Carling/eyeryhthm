import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalibrationService } from './calibration-service';
import { Calibration } from '../blink-detection/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Set up global localStorage mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('CalibrationService', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('createDefaultCalibration', () => {
    it('should create a default calibration with correct properties', () => {
      const defaultCalibration = CalibrationService.createDefaultCalibration();

      expect(defaultCalibration.id).toBe('default');
      expect(defaultCalibration.name).toBe('Factory Default');
      expect(defaultCalibration.isActive).toBe(true);
      expect(defaultCalibration.isDefault).toBe(true);
      expect(defaultCalibration.earThreshold).toBe(0.2);
      expect(defaultCalibration.metadata.totalBlinksRequested).toBe(0);
      expect(defaultCalibration.metadata.totalBlinksDetected).toBe(0);
      expect(defaultCalibration.metadata.accuracy).toBe(0);
      expect(defaultCalibration.rawData.blinkEvents).toEqual([]);
    });

    it('should create default calibration with valid dates', () => {
      const beforeCreate = new Date();
      const defaultCalibration = CalibrationService.createDefaultCalibration();
      const afterCreate = new Date();

      expect(defaultCalibration.createdAt).toBeInstanceOf(Date);
      expect(defaultCalibration.updatedAt).toBeInstanceOf(Date);
      expect(defaultCalibration.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(defaultCalibration.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('ensureDefaultCalibrationExists', () => {
    it('should create default calibration when none exist', () => {
      expect(CalibrationService.getAllCalibrations()).toEqual([]);

      CalibrationService.ensureDefaultCalibrationExists();

      const calibrations = CalibrationService.getAllCalibrations();
      expect(calibrations).toHaveLength(1);
      expect(calibrations[0]?.id).toBe('default');
      expect(calibrations[0]?.isDefault).toBe(true);
      expect(calibrations[0]?.earThreshold).toBe(0.2);
    });

    it('should not create default calibration when calibrations already exist', () => {
      const existingCalibration: Calibration = {
        id: 'test-123',
        name: 'Test Calibration',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        isDefault: false,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: [],
        },
      };

      CalibrationService.saveCalibration(existingCalibration);
      expect(CalibrationService.getAllCalibrations()).toHaveLength(1);

      CalibrationService.ensureDefaultCalibrationExists();

      const calibrations = CalibrationService.getAllCalibrations();
      expect(calibrations).toHaveLength(1);
      expect(calibrations[0]?.id).toBe('test-123');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => CalibrationService.ensureDefaultCalibrationExists()).not.toThrow();

      consoleSpy.mockRestore();
      getItemSpy.mockRestore();
    });
  });

  describe('getAllCalibrations', () => {
    it('should return empty array when no calibrations exist', () => {
      expect(CalibrationService.getAllCalibrations()).toEqual([]);
    });

    it('should retrieve all stored calibrations', () => {
      const calibration1: Calibration = {
        id: 'cal-1',
        name: 'Calibration 1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isActive: true,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: [],
        },
      };

      const calibration2: Calibration = {
        id: 'cal-2',
        name: 'Calibration 2',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        isActive: false,
        earThreshold: 0.23,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 8,
          accuracy: 0.8,
          averageBlinkInterval: 3500,
          minEarValue: 0.16,
          maxEarValue: 0.36,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: [],
        },
      };

      CalibrationService.saveCalibration(calibration1);
      CalibrationService.saveCalibration(calibration2);

      const calibrations = CalibrationService.getAllCalibrations();
      expect(calibrations).toHaveLength(2);
      expect(calibrations[0]?.id).toBe('cal-1');
      expect(calibrations[1]?.id).toBe('cal-2');
    });
  });

  describe('getActiveCalibration', () => {
    it('should return null when no calibrations exist', () => {
      expect(CalibrationService.getActiveCalibration()).toBeNull();
    });

    it('should return the active calibration', () => {
      const activeCalibration: Calibration = {
        id: 'active-cal',
        name: 'Active Calibration',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: [],
        },
      };

      const inactiveCalibration: Calibration = {
        ...activeCalibration,
        id: 'inactive-cal',
        name: 'Inactive Calibration',
        isActive: false,
      };

      CalibrationService.saveCalibration(inactiveCalibration);
      CalibrationService.saveCalibration(activeCalibration);

      const active = CalibrationService.getActiveCalibration();
      expect(active).not.toBeNull();
      expect(active?.id).toBe('active-cal');
      expect(active?.isActive).toBe(true);
    });

    it('should return default calibration when it is active', () => {
      CalibrationService.ensureDefaultCalibrationExists();

      const active = CalibrationService.getActiveCalibration();
      expect(active).not.toBeNull();
      expect(active?.id).toBe('default');
      expect(active?.isDefault).toBe(true);
      expect(active?.isActive).toBe(true);
    });
  });

  describe('deleteCalibration', () => {
    it('should delete a calibration by id', () => {
      const calibration: Calibration = {
        id: 'cal-to-delete',
        name: 'Calibration To Delete',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: false,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: [],
        },
      };

      CalibrationService.saveCalibration(calibration);
      expect(CalibrationService.getAllCalibrations()).toHaveLength(1);

      CalibrationService.deleteCalibration('cal-to-delete');
      expect(CalibrationService.getAllCalibrations()).toHaveLength(0);
    });

    it('should not affect other calibrations when deleting one', () => {
      const calibration1: Calibration = {
        id: 'cal-1',
        name: 'Calibration 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: [],
        },
      };

      const calibration2: Calibration = {
        ...calibration1,
        id: 'cal-2',
        name: 'Calibration 2',
        isActive: false,
      };

      CalibrationService.saveCalibration(calibration1);
      CalibrationService.saveCalibration(calibration2);
      expect(CalibrationService.getAllCalibrations()).toHaveLength(2);

      CalibrationService.deleteCalibration('cal-2');

      const remaining = CalibrationService.getAllCalibrations();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe('cal-1');
    });
  });

  describe('calculateEarThreshold', () => {
    it('should return 0.2 when no blink events', () => {
      const rawData = {
        timestamps: [],
        earValues: [],
        blinkEvents: [],
      };

      const threshold = CalibrationService.calculateEarThreshold(rawData);
      expect(threshold).toBe(0.2);
    });

    it('should calculate threshold from blink events', () => {
      const rawData = {
        timestamps: [1000, 2000, 3000],
        earValues: [0.3, 0.2, 0.3],
        blinkEvents: [
          { timestamp: 1000, earValue: 0.2, duration: 100 },
          { timestamp: 2000, earValue: 0.18, duration: 120 },
          { timestamp: 3000, earValue: 0.22, duration: 110 },
        ],
      };

      const threshold = CalibrationService.calculateEarThreshold(rawData);

      // Average blink EAR = (0.2 + 0.18 + 0.22) / 3 = 0.2
      expect(threshold).toBeCloseTo(0.2, 2);
    });

    it('should clamp threshold between 0.1 and 0.4', () => {
      const lowRawData = {
        timestamps: [1000],
        earValues: [0.05],
        blinkEvents: [{ timestamp: 1000, earValue: 0.05, duration: 100 }],
      };

      const lowThreshold = CalibrationService.calculateEarThreshold(lowRawData);
      expect(lowThreshold).toBe(0.1);

      const highRawData = {
        timestamps: [1000],
        earValues: [0.5],
        blinkEvents: [{ timestamp: 1000, earValue: 0.5, duration: 100 }],
      };

      const highThreshold = CalibrationService.calculateEarThreshold(highRawData);
      expect(highThreshold).toBe(0.4);
    });
  });

  describe('validateCalibration', () => {
    it('should validate a good calibration', () => {
      const goodCalibration: Calibration = {
        id: 'good-cal',
        name: 'Good Calibration',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [1000, 2000, 3000, 4000, 5000, 6000],
          earValues: [0.3, 0.2, 0.3, 0.2, 0.3, 0.2],
          blinkEvents: [
            { timestamp: 1000, earValue: 0.2, duration: 100 },
            { timestamp: 2000, earValue: 0.2, duration: 100 },
            { timestamp: 3000, earValue: 0.2, duration: 100 },
            { timestamp: 4000, earValue: 0.2, duration: 100 },
            { timestamp: 5000, earValue: 0.2, duration: 100 },
            { timestamp: 6000, earValue: 0.2, duration: 100 },
          ],
        },
      };

      expect(CalibrationService.validateCalibration(goodCalibration)).toBe(true);
    });

    it('should reject calibration with low detection rate', () => {
      const lowDetectionCalibration: Calibration = {
        id: 'low-detection-cal',
        name: 'Low Detection Calibration',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 5, // Only 50% detection rate
          accuracy: 0.5,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: Array(5).fill({ timestamp: 1000, earValue: 0.2, duration: 100 }),
        },
      };

      expect(CalibrationService.validateCalibration(lowDetectionCalibration)).toBe(false);
    });

    it('should reject calibration with unreasonable EAR values', () => {
      const unreasonableCalibration: Calibration = {
        id: 'unreasonable-cal',
        name: 'Unreasonable Calibration',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.05, // Too low
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: Array(6).fill({ timestamp: 1000, earValue: 0.2, duration: 100 }),
        },
      };

      expect(CalibrationService.validateCalibration(unreasonableCalibration)).toBe(false);
    });

    it('should reject calibration with insufficient data', () => {
      const insufficientDataCalibration: Calibration = {
        id: 'insufficient-cal',
        name: 'Insufficient Data Calibration',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: [
            { timestamp: 1000, earValue: 0.2, duration: 100 },
            { timestamp: 2000, earValue: 0.2, duration: 100 },
          ], // Only 2 blink events, needs at least 5
        },
      };

      expect(CalibrationService.validateCalibration(insufficientDataCalibration)).toBe(false);
    });
  });

  describe('setActiveCalibration', () => {
    it('should set a calibration as active and deactivate others', () => {
      const calibration1: Calibration = {
        id: 'cal-1',
        name: 'Calibration 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        earThreshold: 0.22,
        metadata: {
          totalBlinksRequested: 10,
          totalBlinksDetected: 9,
          accuracy: 0.9,
          averageBlinkInterval: 3000,
          minEarValue: 0.15,
          maxEarValue: 0.35,
        },
        rawData: {
          timestamps: [],
          earValues: [],
          blinkEvents: [],
        },
      };

      const calibration2: Calibration = {
        ...calibration1,
        id: 'cal-2',
        name: 'Calibration 2',
        isActive: false,
      };

      CalibrationService.saveCalibration(calibration1);
      CalibrationService.saveCalibration(calibration2);

      CalibrationService.setActiveCalibration('cal-2');

      const calibrations = CalibrationService.getAllCalibrations();
      const cal1 = calibrations.find(c => c.id === 'cal-1');
      const cal2 = calibrations.find(c => c.id === 'cal-2');

      expect(cal1?.isActive).toBe(false);
      expect(cal2?.isActive).toBe(true);
    });
  });
});
