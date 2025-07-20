import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { SessionCard } from './SessionCard';
import { SessionData } from '../lib/sessions/types';

// Mock the CalibrationContext
const mockCalibrations = [
  {
    id: 'calibration-1',
    name: 'Default Calibration',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    earThreshold: 0.25,
    metadata: {
      totalBlinksRequested: 0,
      totalBlinksDetected: 0,
      accuracy: 0,
      averageBlinkInterval: 0,
      minEarValue: 0,
      maxEarValue: 0,
    },
    rawData: {
      timestamps: [],
      earValues: [],
      blinkEvents: [],
    },
  },
];

vi.mock('../contexts/CalibrationContext', () => ({
  useCalibration: () => ({
    calibrations: mockCalibrations,
  }),
}));

// Mock D3
const createD3Mock = () => {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {
    append: vi.fn(),
    attr: vi.fn(),
    datum: vi.fn(),
    selectAll: vi.fn(),
    transition: vi.fn(),
    duration: vi.fn(),
    ease: vi.fn(),
    node: vi.fn(() => ({ getTotalLength: vi.fn(() => 100) })),
  };
  
  // Make all methods chainable
  Object.keys(mock).forEach(key => {
    if (key === 'selectAll') {
      mock[key].mockReturnValue({ remove: vi.fn() });
    } else if (key === 'node') {
      // node returns the DOM element, not the selection
    } else {
      mock[key].mockReturnValue(mock);
    }
  });
  
  return mock;
};

// Create chainable mocks for area and line
const createChainableMock = () => {
  const mock: ReturnType<typeof vi.fn> & Record<string, ReturnType<typeof vi.fn>> = Object.assign(vi.fn(), {
    x: vi.fn(),
    y: vi.fn(),
    y0: vi.fn(),
    y1: vi.fn(),
    curve: vi.fn(),
  });
  mock.x = vi.fn(() => mock);
  mock.y = vi.fn(() => mock);
  mock.y0 = vi.fn(() => mock);
  mock.y1 = vi.fn(() => mock);
  mock.curve = vi.fn(() => mock);
  return mock;
};

vi.mock('d3', () => ({
  select: vi.fn(() => createD3Mock()),
  scaleLinear: vi.fn(() => ({
    domain: vi.fn(() => ({ 
      range: vi.fn(() => vi.fn()),
    })),
  })),
  max: vi.fn(() => 20),
  area: vi.fn(() => createChainableMock()),
  line: vi.fn(() => createChainableMock()),
  curveMonotoneX: {},
  easeLinear: {},
}));

// Mock CSS file
vi.mock('./SessionCard.css', () => ({}));

describe('SessionCard', () => {
  const mockSession: SessionData = {
    id: 'session-1',
    startTime: new Date(),
    isActive: false,
    averageBlinkRate: 12,
    blinkRateHistory: [
      { timestamp: Date.now() - 60000, rate: 10 },
      { timestamp: Date.now() - 30000, rate: 12 },
      { timestamp: Date.now(), rate: 14 },
    ],
    quality: 'good',
    fatigueAlertCount: 0,
    duration: 3600, // 1 hour
    calibrationId: 'calibration-1',
  };

  const renderSessionCard = (session: SessionData) => {
    return render(
      <Theme>
        <SessionCard session={session} />
      </Theme>
    );
  };

  it('displays calibration name when session has calibrationId', () => {
    renderSessionCard(mockSession);
    
    expect(screen.getByText('• Default Calibration')).toBeInTheDocument();
  });

  it('does not display calibration info when session has no calibrationId', () => {
    const sessionWithoutCalibration = { ...mockSession, calibrationId: undefined };
    renderSessionCard(sessionWithoutCalibration);
    
    expect(screen.queryByText(/Default Calibration/)).not.toBeInTheDocument();
  });

  it('displays "Unknown calibration" when calibrationId does not match any calibration', () => {
    const sessionWithUnknownCalibration = { ...mockSession, calibrationId: 'unknown-id' };
    renderSessionCard(sessionWithUnknownCalibration);
    
    expect(screen.getByText('• Unknown calibration')).toBeInTheDocument();
  });
});