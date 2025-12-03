import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionCard } from './SessionCard';
import { SessionData } from '../lib/sessions/types';

// Mock CalibrationContext
vi.mock('../contexts/CalibrationContext', () => ({
  useCalibration: () => ({
    calibrations: [
      { id: 'cal-1', name: 'Morning Calibration', earThreshold: 0.25 },
      { id: 'cal-2', name: 'Evening Calibration', earThreshold: 0.23 },
    ],
  }),
}));

// Mock SessionContext
vi.mock('../contexts/SessionContext', () => ({
  useSession: () => ({
    isFaceDetected: true,
    faceLostCountdown: null,
    sessions: [],
    activeSession: null,
    isTracking: true,
    toggleTracking: vi.fn(),
    videoRef: { current: null },
    canvasRef: { current: null },
  }),
}));

// Mock d3
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      remove: vi.fn(),
    })),
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    datum: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
    ease: vi.fn().mockReturnThis(),
    node: vi.fn(() => ({
      getTotalLength: vi.fn(() => 100),
    })),
  })),
  scaleLinear: vi.fn(() => {
    const scale = Object.assign(vi.fn((value: number) => value * 10), {
      domain: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    });
    return scale;
  }),
  line: vi.fn(() => ({
    x: vi.fn().mockReturnThis(),
    y: vi.fn().mockReturnThis(),
    curve: vi.fn().mockReturnThis(),
  })),
  area: vi.fn(() => ({
    x: vi.fn().mockReturnThis(),
    y0: vi.fn().mockReturnThis(),
    y1: vi.fn().mockReturnThis(),
    curve: vi.fn().mockReturnThis(),
  })),
  max: vi.fn((data, accessor) => {
    if (!data || data.length === 0) return 20;
    const values = data.map(accessor);
    return Math.max(...values);
  }),
  curveMonotoneX: {},
  easeLinear: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('SessionCard', () => {
  const mockSession: SessionData = {
    id: 'session-1',
    startTime: new Date('2024-01-15T10:00:00'),
    endTime: new Date('2024-01-15T11:30:00'),
    isActive: false,
    averageBlinkRate: 7,
    blinkRateHistory: [
      { timestamp: Date.now() - 60000, rate: 8 },
      { timestamp: Date.now() - 30000, rate: 6 },
      { timestamp: Date.now(), rate: 7 },
    ],
    quality: 'poor',
    fatigueAlertCount: 2,
    duration: 5400, // 1h 30m
    totalBlinks: 378,
    calibrationId: 'cal-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session time correctly', () => {
    render(<SessionCard session={mockSession} />);
    
    // The time will be formatted based on locale
    const timeText = screen.getByText(/10:00/);
    expect(timeText).toBeInTheDocument();
  });

  it('displays quality badge with correct color', () => {
    render(<SessionCard session={mockSession} />);
    
    const qualityBadge = screen.getByText(/poor quality/i);
    expect(qualityBadge).toBeInTheDocument();
  });

  it('shows fatigue alert count when greater than 0', () => {
    render(<SessionCard session={mockSession} />);
    
    const alertBadge = screen.getByText(/2 fatigue alerts/);
    expect(alertBadge).toBeInTheDocument();
  });

  it('shows no fatigue alerts when count is 0', () => {
    const sessionNoAlerts = { ...mockSession, fatigueAlertCount: 0 };
    render(<SessionCard session={sessionNoAlerts} />);
    
    const noAlertBadge = screen.getByText(/No fatigue alerts/);
    expect(noAlertBadge).toBeInTheDocument();
  });

  it('displays duration for completed sessions', () => {
    render(<SessionCard session={mockSession} />);
    
    const duration = screen.getByText('1h 30m');
    expect(duration).toBeInTheDocument();
  });

  it('shows active badge for active sessions', () => {
    const activeSession = { ...mockSession, isActive: true, endTime: undefined };
    render(<SessionCard session={activeSession} />);

    const activeBadge = screen.getByText('- Active');
    expect(activeBadge).toBeInTheDocument();
    expect(activeBadge).toHaveClass('pulse');
  });

  it('displays average blink rate', () => {
    render(<SessionCard session={mockSession} />);

    const blinkRate = screen.getByText('7/min avg');
    expect(blinkRate).toBeInTheDocument();
  });

  it('shows total blink count when available', () => {
    render(<SessionCard session={mockSession} />);
    
    const totalBlinks = screen.getByText('378 total blinks');
    expect(totalBlinks).toBeInTheDocument();
  });

  it('displays calibration name when calibrationId is present', () => {
    render(<SessionCard session={mockSession} />);

    const usingText = screen.getByText('Using');
    const calibrationName = screen.getByText('Morning Calibration');
    expect(usingText).toBeInTheDocument();
    expect(calibrationName).toBeInTheDocument();
  });

  it('does not show calibration when calibrationId is missing', () => {
    const sessionNoCalibration = { ...mockSession, calibrationId: undefined };
    render(<SessionCard session={sessionNoCalibration} />);

    const usingText = screen.queryByText('Using');
    expect(usingText).not.toBeInTheDocument();
  });

  it('shows "Unknown calibration" for invalid calibrationId', () => {
    const sessionInvalidCalibration = { ...mockSession, calibrationId: 'invalid-id' };
    render(<SessionCard session={sessionInvalidCalibration} />);

    const usingText = screen.getByText('Using');
    const unknownCalibration = screen.getByText('Unknown calibration');
    expect(usingText).toBeInTheDocument();
    expect(unknownCalibration).toBeInTheDocument();
  });

  it('renders chart container for sessions with data', () => {
    const { container } = render(<SessionCard session={mockSession} />);
    
    const svg = container.querySelector('svg[width="200"][height="60"]');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '200');
    expect(svg).toHaveAttribute('height', '60');
  });

  it('shows "Collecting data..." for active sessions without data', () => {
    const activeSessionNoData = { 
      ...mockSession, 
      isActive: true, 
      blinkRateHistory: [] 
    };
    render(<SessionCard session={activeSessionNoData} />);
    
    const collectingText = screen.getByText('Collecting data...');
    expect(collectingText).toBeInTheDocument();
  });

  it('shows "No data" for inactive sessions without data', () => {
    const inactiveSessionNoData = { 
      ...mockSession, 
      isActive: false, 
      blinkRateHistory: [] 
    };
    render(<SessionCard session={inactiveSessionNoData} />);
    
    const noDataText = screen.getByText('No data');
    expect(noDataText).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<SessionCard session={mockSession} />);
    
    const card = container.querySelector('.session-card');
    expect(card).toBeInTheDocument();
    expect(card).not.toHaveClass('active');
  });

  it('applies active CSS class for active sessions', () => {
    const activeSession = { ...mockSession, isActive: true };
    const { container } = render(<SessionCard session={activeSession} />);
    
    const card = container.querySelector('.session-card');
    expect(card).toHaveClass('active');
  });
});