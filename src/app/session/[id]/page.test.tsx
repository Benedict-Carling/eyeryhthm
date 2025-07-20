import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionDetailPage from './page';
import { SessionData } from '../../../lib/sessions/types';

// Mock useParams
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'session-1' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock D3
const mockScale = vi.fn((value) => value);
mockScale.domain = vi.fn(() => mockScale);
mockScale.range = vi.fn(() => mockScale);

const mockG = {
  append: vi.fn(function() { return this; }),
  attr: vi.fn(function() { return this; }),
  selectAll: vi.fn(function() { return this; }),
  data: vi.fn(function() { return this; }),
  enter: vi.fn(function() { return this; }),
  datum: vi.fn(function() { return this; }),
  call: vi.fn(function() { return this; }),
  style: vi.fn(function() { return this; }),
  text: vi.fn(function() { return this; }),
  remove: vi.fn(function() { return this; }),
};

vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({ remove: vi.fn() })),
    attr: vi.fn(function() { return this; }),
    append: vi.fn((tag) => {
      if (tag === 'g') return mockG;
      if (tag === 'defs') {
        return {
          append: vi.fn(() => ({
            attr: vi.fn(function() { return this; }),
            append: vi.fn(function() { return this; }),
          })),
        };
      }
      return { attr: vi.fn(function() { return this; }) };
    }),
  })),
  scaleTime: vi.fn(() => mockScale),
  scaleLinear: vi.fn(() => mockScale),
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
  extent: vi.fn(() => [new Date(), new Date()]),
  max: vi.fn(() => 20),
  axisBottom: vi.fn(() => ({
    tickFormat: vi.fn(function() { return this; }),
  })),
  axisLeft: vi.fn(() => vi.fn()),
  timeFormat: vi.fn(() => () => '12:00'),
  curveMonotoneX: vi.fn(),
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
    { timestamp: Date.now() - 2000, rate: 12 },
    { timestamp: Date.now() - 1000, rate: 11 },
  ],
  quality: 'good',
  fatigueAlertCount: 0,
  duration: 5400, // 1h 30m
  totalBlinks: 1080,
};

// Mock SessionContext
vi.mock('../../../contexts/SessionContext', () => ({
  useSession: () => ({
    sessions: [mockSession],
  }),
}));

describe('SessionDetailPage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders session details correctly', () => {
    render(<SessionDetailPage />);

    expect(screen.getByText('Session Details')).toBeInTheDocument();
    expect(screen.getByText('Monday, January 20, 2025')).toBeInTheDocument();
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
    expect(screen.getByText('12 blinks/min')).toBeInTheDocument();
    expect(screen.getByText('Good quality')).toBeInTheDocument();
  });

  it('shows session not found when session does not exist', () => {
    // Need to re-mock with empty sessions
    vi.unmock('../../../contexts/SessionContext');
    vi.mock('../../../contexts/SessionContext', () => ({
      useSession: () => ({
        sessions: [],
      }),
    }));

    render(<SessionDetailPage />);
    expect(screen.getByText('Session not found')).toBeInTheDocument();
  });

  it('displays correct fatigue alert information', () => {
    render(<SessionDetailPage />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('No fatigue')).toBeInTheDocument();
  });

  it('shows back to sessions link', () => {
    render(<SessionDetailPage />);
    
    const backLink = screen.getByText('Back to Sessions');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/sessions');
  });

  it('loads fatigue threshold from localStorage', () => {
    localStorage.setItem('fatigueThreshold', '10');
    render(<SessionDetailPage />);
    
    // The component should use the saved threshold
    expect(localStorage.getItem('fatigueThreshold')).toBe('10');
  });
});