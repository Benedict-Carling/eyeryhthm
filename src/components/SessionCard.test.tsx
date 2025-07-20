import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionCard } from './SessionCard';
import { SessionData } from '../lib/sessions/types';

// Mock D3
const mockElement = {
  attr: vi.fn(function() { return this; }),
  append: vi.fn(function() { return this; }),
  datum: vi.fn(function() { return this; }),
  transition: vi.fn(function() { return this; }),
  duration: vi.fn(function() { return this; }),
  ease: vi.fn(function() { return this; }),
  node: vi.fn(() => ({ getTotalLength: vi.fn(() => 100) })),
};

vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({ remove: vi.fn() })),
    attr: vi.fn(function() { return this; }),
    append: vi.fn((tag) => {
      if (tag === 'g' || tag === 'path' || tag === 'defs') {
        return mockElement;
      }
      return mockElement;
    }),
  })),
  scaleLinear: vi.fn(() => {
    const scale = vi.fn(() => 0);
    scale.domain = vi.fn(() => scale);
    scale.range = vi.fn(() => scale);
    return scale;
  }),
  line: vi.fn(() => {
    const lineFunc = vi.fn();
    lineFunc.x = vi.fn(() => lineFunc);
    lineFunc.y = vi.fn(() => lineFunc);
    lineFunc.curve = vi.fn(() => lineFunc);
    return lineFunc;
  }),
  area: vi.fn(() => {
    const areaFunc = vi.fn();
    areaFunc.x = vi.fn(() => areaFunc);
    areaFunc.y0 = vi.fn(() => areaFunc);
    areaFunc.y1 = vi.fn(() => areaFunc);
    areaFunc.curve = vi.fn(() => areaFunc);
    return areaFunc;
  }),
  max: vi.fn(() => 20),
  curveMonotoneX: vi.fn(),
  easeLinear: vi.fn(),
}));

const mockSession: SessionData = {
  id: 'session-1',
  startTime: new Date('2025-01-20T10:00:00'),
  endTime: new Date('2025-01-20T11:30:00'),
  isActive: false,
  averageBlinkRate: 12,
  blinkRateHistory: [
    { timestamp: Date.now() - 5000, rate: 11 },
    { timestamp: Date.now() - 4000, rate: 12 },
    { timestamp: Date.now() - 3000, rate: 13 },
  ],
  quality: 'good',
  fatigueAlertCount: 0,
  duration: 5400,
  totalBlinks: 1080,
};

describe('SessionCard', () => {
  it('renders session information correctly', () => {
    render(<SessionCard session={mockSession} />);

    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('12 blinks/min')).toBeInTheDocument();
    expect(screen.getByText('Good quality')).toBeInTheDocument();
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
    expect(screen.getByText('1080 total blinks')).toBeInTheDocument();
  });

  it('shows active badge with pulsing animation for active sessions', () => {
    const activeSession = { ...mockSession, isActive: true };
    render(<SessionCard session={activeSession} />);

    const activeBadge = screen.getByText('Active');
    expect(activeBadge).toBeInTheDocument();
    
    const pulseDot = activeBadge.parentElement?.querySelector('.pulse-dot');
    expect(pulseDot).toBeInTheDocument();
  });

  it('displays fatigue alert count when present', () => {
    const sessionWithAlerts = { ...mockSession, fatigueAlertCount: 2 };
    render(<SessionCard session={sessionWithAlerts} />);

    expect(screen.getByText('2 fatigue alerts')).toBeInTheDocument();
  });

  it('shows no fatigue alerts when count is zero', () => {
    render(<SessionCard session={mockSession} />);

    expect(screen.getByText('No fatigue alerts')).toBeInTheDocument();
  });

  it('displays quality badge with correct color', () => {
    const { rerender } = render(<SessionCard session={mockSession} />);
    expect(screen.getByText('Good quality')).toBeInTheDocument();

    const fairSession = { ...mockSession, quality: 'fair' as const };
    rerender(<SessionCard session={fairSession} />);
    expect(screen.getByText('Fair quality')).toBeInTheDocument();

    const poorSession = { ...mockSession, quality: 'poor' as const };
    rerender(<SessionCard session={poorSession} />);
    expect(screen.getByText('Poor quality')).toBeInTheDocument();
  });

  it('shows collecting data message for active session without data', () => {
    const emptySession = {
      ...mockSession,
      isActive: true,
      blinkRateHistory: [],
    };
    render(<SessionCard session={emptySession} />);

    expect(screen.getByText('Collecting data...')).toBeInTheDocument();
  });
});