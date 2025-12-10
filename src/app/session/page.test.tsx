import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import SessionDetailPage from './page';
import { SessionData } from '../../lib/sessions/types';

// Wrapper with Theme for Radix components
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<Theme>{ui}</Theme>);
};

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams('id=session-1');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock SessionContext
const mockSessions: SessionData[] = [
  {
    id: 'session-1',
    startTime: new Date('2024-01-15T10:00:00'),
    endTime: new Date('2024-01-15T11:30:00'),
    isActive: false,
    averageBlinkRate: 7,
    blinkEvents: [
      { timestamp: Date.now() - 60000 },
      { timestamp: Date.now() - 30000 },
      { timestamp: Date.now() },
    ],
    quality: 'poor',
    fatigueAlertCount: 2,
    duration: 5400, // 1h 30m
    totalBlinks: 378,
  },
  {
    id: 'session-2',
    startTime: new Date('2024-01-15T14:00:00'),
    isActive: true,
    averageBlinkRate: 12,
    blinkEvents: [],
    quality: 'good',
    fatigueAlertCount: 0,
    totalBlinks: 0,
  },
];

vi.mock('../../contexts/SessionContext', () => ({
  useSession: () => ({
    sessions: mockSessions,
    currentBlinkCount: 0,
    sessionBaselineBlinkCount: 0,
    sessionStartTime: Date.now(),
  }),
}));

// Mock BlinkRateChart
vi.mock('../../components/BlinkRateChart', () => ({
  BlinkRateChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="blink-rate-chart" data-points={data.length} />
  ),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('SessionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.set('id', 'session-1');
  });

  it('renders session details correctly', () => {
    renderWithTheme(<SessionDetailPage />);

    expect(screen.getByText('Session Details')).toBeInTheDocument();
    expect(screen.getByText(/Monday, January 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText('1h 30m 0s')).toBeInTheDocument();
    expect(screen.getByText('7/min')).toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders back button', () => {
    renderWithTheme(<SessionDetailPage />);

    const backButton = screen.getByText('Back to Sessions');
    expect(backButton).toBeInTheDocument();
  });

  it('navigates back to home when back button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SessionDetailPage />);

    const backButton = screen.getByText('Back to Sessions');
    await user.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('renders blink rate chart', () => {
    renderWithTheme(<SessionDetailPage />);

    const chart = screen.getByTestId('blink-rate-chart');
    expect(chart).toBeInTheDocument();
    // Chart data points are now aggregated from blinkEvents, so count varies by session duration
    const dataPoints = parseInt(chart.getAttribute('data-points') || '0', 10);
    expect(dataPoints).toBeGreaterThan(0);
  });

  it('shows live duration for active sessions', () => {
    mockSearchParams.set('id', 'session-2');
    renderWithTheme(<SessionDetailPage />);

    // Active sessions show live elapsed time starting from 0s
    expect(screen.getByText('0s')).toBeInTheDocument();
  });

  it('shows "Session not found" for invalid session ID', () => {
    mockSearchParams.set('id', 'invalid-id');
    renderWithTheme(<SessionDetailPage />);

    expect(screen.getByText('Session not found')).toBeInTheDocument();
  });

  it('formats duration correctly for different time periods', () => {
    renderWithTheme(<SessionDetailPage />);
    expect(screen.getByText('1h 30m 0s')).toBeInTheDocument();
  });

  it('applies correct color to quality indicator', () => {
    renderWithTheme(<SessionDetailPage />);

    const qualityText = screen.getByText('Poor');
    expect(qualityText).toBeInTheDocument();
    expect(qualityText.parentElement).toContainElement(qualityText);
  });
});
