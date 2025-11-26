import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext';
import React from 'react';

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
  })),
}));

vi.mock('../hooks/useFrameProcessor', () => ({
  useFrameProcessor: vi.fn(({ onFrame }) => {
    // Simulate frame processing
    if (onFrame) {
      setInterval(() => onFrame(), 100);
    }
  }),
}));

vi.mock('./CalibrationContext', () => ({
  useCalibration: () => ({
    activeCalibration: null,
  }),
}));

// Mock AlertService
const mockStartMonitoring = vi.fn();
const mockStopMonitoring = vi.fn();
const mockCheckForFatigue = vi.fn();

vi.mock('../lib/alert-service', () => ({
  AlertService: vi.fn().mockImplementation(() => ({
    startMonitoring: mockStartMonitoring,
    stopMonitoring: mockStopMonitoring,
    checkForFatigue: mockCheckForFatigue,
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
    vi.clearAllTimers();
  });

  it('provides session context values', () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    expect(screen.getByTestId('sessions-count')).toHaveTextContent('2'); // Mock sessions
    expect(screen.getByTestId('active-session')).toHaveTextContent('none');
    expect(screen.getByTestId('is-tracking')).toHaveTextContent('false');
  });

  it('starts alert monitoring when tracking is enabled', async () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    const toggleButton = screen.getByText('Toggle Tracking');
    
    await act(async () => {
      toggleButton.click();
    });

    expect(mockStartCamera).toHaveBeenCalled();
    expect(mockStartMonitoring).toHaveBeenCalled();
    expect(screen.getByTestId('is-tracking')).toHaveTextContent('true');
  });

  it('stops alert monitoring when tracking is disabled', async () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    const toggleButton = screen.getByText('Toggle Tracking');
    
    // Enable tracking first
    await act(async () => {
      toggleButton.click();
    });

    // Then disable it
    await act(async () => {
      toggleButton.click();
    });

    expect(mockStopCamera).toHaveBeenCalled();
    expect(mockStopMonitoring).toHaveBeenCalled();
    expect(screen.getByTestId('is-tracking')).toHaveTextContent('false');
  });

  it.skip('increments fatigue alert count when alert is triggered', async () => {
    let fatigueAlertCallback: (() => void) | undefined;
    
    mockStartMonitoring.mockImplementation((getSession, onAlert) => {
      fatigueAlertCallback = onAlert;
    });

    const TestComponentWithAlerts = () => {
      const { activeSession } = useSession();
      return (
        <div data-testid="fatigue-count">
          {activeSession?.fatigueAlertCount || 0}
        </div>
      );
    };

    // Update mocks to simulate face detection and stream
    const { useCamera } = await import('../hooks/useCamera');
    const { useBlinkDetection } = await import('../hooks/useBlinkDetection');
    
    vi.mocked(useCamera).mockReturnValue({
      stream: new MediaStream(),
      videoRef: { current: document.createElement('video') },
      startCamera: mockStartCamera,
      stopCamera: mockStopCamera,
        hasPermission: true,
      error: null,
      isLoading: false,
    });

    vi.mocked(useBlinkDetection).mockReturnValue({
      blinkCount: 10,
      currentEAR: 0.3, // Face detected
      isReady: true,
      start: mockStartDetection,
      stop: mockStopDetection,
      processFrame: vi.fn(),
      resetBlinkCounter: vi.fn(),
      isBlinking: false,
      error: null,
    });

    render(
      <SessionProvider>
        <TestComponent />
        <TestComponentWithAlerts />
      </SessionProvider>
    );

    // Enable tracking to start a session
    const toggleButton = screen.getByText('Toggle Tracking');
    await act(async () => {
      toggleButton.click();
    });

    // Wait for session to start - need to wait for face detection to trigger session start
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Check initial state
    const fatigueCount = screen.getByTestId('fatigue-count');
    expect(fatigueCount).toHaveTextContent('0');

    // Trigger fatigue alert
    expect(fatigueAlertCallback).toBeDefined();
    await act(async () => {
      fatigueAlertCallback?.();
    });

    expect(fatigueCount).toHaveTextContent('1');
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
});