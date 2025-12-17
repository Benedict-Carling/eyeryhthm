import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext';

// Mock dependencies
const mockStartCamera = vi.fn().mockResolvedValue(true);
const mockStopCamera = vi.fn();
const mockStartDetection = vi.fn().mockResolvedValue(true);
const mockStopDetection = vi.fn();

vi.mock('../hooks/useCamera', () => ({
  useCamera: vi.fn(() => ({
    stream: null,
    videoRef: { current: null },
    startCamera: mockStartCamera,
    stopCamera: mockStopCamera,
    hasPermission: true,
    error: null,
    isLoading: false,
  })),
}));

vi.mock('../hooks/useBlinkDetection', () => ({
  useBlinkDetection: vi.fn(() => ({
    blinkCount: 0,
    currentEAR: 0,
    isReady: true,
    start: mockStartDetection,
    stop: mockStopDetection,
    processFrame: vi.fn(),
    resetBlinkCounter: vi.fn(),
    isBlinking: false,
    error: null,
  })),
}));

// Mock useFrameProcessor without setInterval to avoid test pollution
vi.mock('../hooks/useFrameProcessor', () => ({
  useFrameProcessor: vi.fn(),
}));

vi.mock('./CalibrationContext', () => ({
  useCalibration: () => ({
    activeCalibration: null,
  }),
}));

vi.mock('../lib/sessions/supabase-session-service', () => ({
  SupabaseSessionService: {
    hasPersistedSessions: vi.fn().mockResolvedValue(false),
    getAllSessions: vi.fn().mockResolvedValue([]),
    saveSession: vi.fn().mockResolvedValue(undefined),
    generateSessionId: vi.fn().mockReturnValue('test-session-id'),
  },
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: null,
    profile: null,
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

// Mock AlertService
const mockStartMonitoring = vi.fn();
const mockStopMonitoring = vi.fn();

vi.mock('../lib/alert-service', () => ({
  AlertService: vi.fn().mockImplementation(() => ({
    startMonitoring: mockStartMonitoring,
    stopMonitoring: mockStopMonitoring,
    checkForFatigue: vi.fn(),
  })),
}));

// Test component that uses the session context
function TestComponent() {
  const { sessions, activeSession, isTracking, toggleTracking } = useSession();

  return (
    <div>
      <div data-testid="sessions-count">{sessions.length}</div>
      <div data-testid="active-session">{activeSession ? activeSession.id : 'none'}</div>
      <div data-testid="is-tracking">{isTracking ? 'true' : 'false'}</div>
      <button onClick={toggleTracking}>Toggle Tracking</button>
    </div>
  );
}

describe('SessionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    expect(screen.getByTestId('is-tracking')).toHaveTextContent('false');
    expect(screen.getByTestId('active-session')).toHaveTextContent('none');
  });

  it('cleans up alert service on unmount', () => {
    const { unmount } = render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    unmount();

    expect(mockStopMonitoring).toHaveBeenCalled();
  });

  // These tests require complex async setup with camera/detection initialization
  // They are better suited for e2e tests with proper async handling
  it.skip('starts alert monitoring when tracking is enabled', () => {
    // This test requires async camera and detection initialization
    // Covered by e2e tests
  });

  it.skip('stops alert monitoring when tracking is disabled', () => {
    // This test requires async camera and detection initialization
    // Covered by e2e tests
  });

  it.skip('increments fatigue alert count when alert is triggered', () => {
    // This test requires complex setup with face detection simulation
    // Covered by e2e tests
  });

  describe('Blink Count Stability (Bug Fix)', () => {
    it('exposes non-negative blink count values', () => {
      const TestBlinkCount = () => {
        const { currentBlinkCount, sessionBaselineBlinkCount } = useSession();
        return (
          <div>
            <div data-testid="current-blinks">{currentBlinkCount}</div>
            <div data-testid="baseline-blinks">{sessionBaselineBlinkCount}</div>
          </div>
        );
      };

      render(
        <SessionProvider>
          <TestBlinkCount />
        </SessionProvider>
      );

      const currentBlinks = parseInt(screen.getByTestId('current-blinks').textContent || '0');
      const baselineBlinks = parseInt(screen.getByTestId('baseline-blinks').textContent || '0');

      // Both values should be non-negative
      expect(currentBlinks).toBeGreaterThanOrEqual(0);
      expect(baselineBlinks).toBeGreaterThanOrEqual(0);
    });

    it('exposes session-related state correctly', () => {
      const TestSessionState = () => {
        const { isTracking, isFaceDetected, faceLostCountdown } = useSession();
        return (
          <div>
            <div data-testid="is-tracking">{String(isTracking)}</div>
            <div data-testid="face-detected">{String(isFaceDetected)}</div>
            <div data-testid="countdown">{faceLostCountdown ?? 'null'}</div>
          </div>
        );
      };

      render(
        <SessionProvider>
          <TestSessionState />
        </SessionProvider>
      );

      expect(screen.getByTestId('is-tracking')).toHaveTextContent('false');
      expect(screen.getByTestId('face-detected')).toHaveTextContent('false');
      expect(screen.getByTestId('countdown')).toHaveTextContent('null');
    });

    // These tests require async session loading and tracking state changes
    // They are better suited for e2e tests
    it.skip('should not cause cascading re-renders when session updates', () => {
      // Covered by e2e tests
    });

    it.skip('should maintain stable callback references', () => {
      // Covered by e2e tests
    });

    it.skip('should maintain consistent blink count across session updates', () => {
      // Covered by e2e tests
    });

    it.skip('should not recreate ImageCapture on every blink', () => {
      // Covered by e2e tests
    });
  });
});
