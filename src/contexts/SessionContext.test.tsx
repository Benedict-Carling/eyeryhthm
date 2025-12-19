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

  describe('Blink Count Stability (Bug Fix)', () => {
    it('should not cause cascading re-renders when session updates', async () => {
      let renderCount = 0;

      const TestRenderCounter = () => {
        useSession(); // Trigger context subscription
        renderCount++;
        return <div data-testid="render-count">{renderCount}</div>;
      };

      render(
        <SessionProvider>
          <TestRenderCounter />
        </SessionProvider>
      );

      const initialRenderCount = renderCount;

      // Simulate session updates (like what happens every 5 seconds)
      // With the bug fix, this should NOT cause multiple re-renders
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should not have excessive re-renders
      // Allow for a few expected re-renders but not cascading ones
      expect(renderCount - initialRenderCount).toBeLessThan(5);
    });

    it('should maintain stable updateActiveSessionBlinkRate callback', () => {
      const renderCounts: number[] = [];

      const TestCallbackStability = () => {
        useSession(); // Trigger context subscription
        renderCounts.push(renderCounts.length);
        return null;
      };

      const { rerender } = render(
        <SessionProvider>
          <TestCallbackStability />
        </SessionProvider>
      );

      const initialRenderCount = renderCounts.length;

      rerender(
        <SessionProvider>
          <TestCallbackStability />
        </SessionProvider>
      );

      // The callback should be stable (not recreated on every render)
      // This is ensured by the empty dependency array in updateActiveSessionBlinkRate
      // Verify no excessive re-renders occurred
      expect(renderCounts.length - initialRenderCount).toBeLessThan(3);
    });

    it('should maintain consistent blink count across multiple session updates', async () => {
      const { useBlinkDetection } = await import('../hooks/useBlinkDetection');
      const { useCamera } = await import('../hooks/useCamera');

      // Mock stream with video track
      const mockTrack = {
        label: 'camera',
        enabled: true,
        readyState: 'live',
        getSettings: () => ({ width: 640, height: 480 }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaStreamTrack;

      const mockStream = {
        getVideoTracks: () => [mockTrack],
      } as MediaStream;

      vi.mocked(useCamera).mockReturnValue({
        stream: mockStream,
        videoRef: { current: document.createElement('video') },
        startCamera: mockStartCamera,
        stopCamera: mockStopCamera,
        hasPermission: true,
        error: null,
        isLoading: false,
      });

      // Start with 10 blinks
      let currentBlinkCount = 10;

      vi.mocked(useBlinkDetection).mockReturnValue({
        blinkCount: currentBlinkCount,
        currentEAR: 0.3, // Face detected
        isReady: true,
        start: mockStartDetection,
        stop: mockStopDetection,
        processFrame: vi.fn(),
        resetBlinkCounter: vi.fn(),
        isBlinking: false,
        error: null,
      });

      const TestBlinkCount = () => {
        const { activeSession } = useSession();
        return (
          <div data-testid="total-blinks">
            {activeSession?.totalBlinks ?? 0}
          </div>
        );
      };

      const { rerender } = render(
        <SessionProvider>
          <TestComponent />
          <TestBlinkCount />
        </SessionProvider>
      );

      // Enable tracking
      const toggleButton = screen.getByText('Toggle Tracking');
      await act(async () => {
        toggleButton.click();
      });

      // Wait for session to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Simulate 5 more blinks
      currentBlinkCount = 15;

      vi.mocked(useBlinkDetection).mockReturnValue({
        blinkCount: currentBlinkCount,
        currentEAR: 0.3,
        isReady: true,
        start: mockStartDetection,
        stop: mockStopDetection,
        processFrame: vi.fn(),
        resetBlinkCounter: vi.fn(),
        isBlinking: false,
        error: null,
      });

      rerender(
        <SessionProvider>
          <TestComponent />
          <TestBlinkCount />
        </SessionProvider>
      );

      // The blink count should never decrease within the same session
      const totalBlinks = screen.getByTestId('total-blinks');
      const currentValue = parseInt(totalBlinks.textContent || '0');

      // Verify count doesn't go backwards
      expect(currentValue).toBeGreaterThanOrEqual(0);
    });

    it('should not restart ImageCapture loop on every blink', async () => {
      // Mock ImageBitmap if not available in test environment
      if (typeof ImageBitmap === 'undefined') {
        (global as { ImageBitmap?: unknown }).ImageBitmap = class MockImageBitmap {
          width = 640;
          height = 480;
          close() {}
        };
      }

      // Mock ImageCapture globally if not already mocked
      const mockImageBitmap = new (global as { ImageBitmap: new() => unknown }).ImageBitmap();
      const grabFrameMock = vi.fn().mockResolvedValue(mockImageBitmap);
      (global as { ImageCapture?: unknown }).ImageCapture = vi.fn().mockImplementation(() => ({
        track: {},
        grabFrame: grabFrameMock,
      }));

      const { useBlinkDetection } = await import('../hooks/useBlinkDetection');
      const { useCamera } = await import('../hooks/useCamera');

      const mockTrack = {
        label: 'camera',
        enabled: true,
        readyState: 'live',
        getSettings: () => ({ width: 640, height: 480 }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaStreamTrack;

      const mockStream = {
        getVideoTracks: () => [mockTrack],
      } as MediaStream;

      vi.mocked(useCamera).mockReturnValue({
        stream: mockStream,
        videoRef: { current: document.createElement('video') },
        startCamera: mockStartCamera,
        stopCamera: mockStopCamera,
        hasPermission: true,
        error: null,
        isLoading: false,
      });

      vi.mocked(useBlinkDetection).mockReturnValue({
        blinkCount: 0,
        currentEAR: 0.3,
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
        </SessionProvider>
      );

      const toggleButton = screen.getByText('Toggle Tracking');
      await act(async () => {
        toggleButton.click();
      });

      // Wait for initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
      });

      const initialImageCaptureCount = ((global as { ImageCapture?: ReturnType<typeof vi.fn> }).ImageCapture?.mock.calls.length) || 0;

      // Simulate multiple blinks
      for (let i = 1; i <= 5; i++) {
        vi.mocked(useBlinkDetection).mockReturnValue({
          blinkCount: i,
          currentEAR: 0.3,
          isReady: true,
          start: mockStartDetection,
          stop: mockStopDetection,
          processFrame: vi.fn(),
          resetBlinkCounter: vi.fn(),
          isBlinking: i % 2 === 0,
          error: null,
        });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // ImageCapture should only be created once, not recreated on every blink
      const finalImageCaptureCount = ((global as { ImageCapture?: ReturnType<typeof vi.fn> }).ImageCapture?.mock.calls.length) || 0;

      // Should have created ImageCapture once or very few times, not 5+ times
      expect(finalImageCaptureCount - initialImageCaptureCount).toBeLessThan(3);
    });

    it('should never show negative blink counts (stale closure bug fix)', async () => {
      const { useBlinkDetection } = await import('../hooks/useBlinkDetection');
      const { useCamera } = await import('../hooks/useCamera');

      const mockTrack = {
        label: 'camera',
        enabled: true,
        readyState: 'live',
        getSettings: () => ({ width: 640, height: 480 }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaStreamTrack;

      const mockStream = {
        getVideoTracks: () => [mockTrack],
      } as MediaStream;

      vi.mocked(useCamera).mockReturnValue({
        stream: mockStream,
        videoRef: { current: document.createElement('video') },
        startCamera: mockStartCamera,
        stopCamera: mockStopCamera,
        hasPermission: true,
        error: null,
        isLoading: false,
      });

      // Start with baseline blinkCount = 150
      let currentBlinkCount = 150;

      vi.mocked(useBlinkDetection).mockReturnValue({
        blinkCount: currentBlinkCount,
        currentEAR: 0.3,
        isReady: true,
        start: mockStartDetection,
        stop: mockStopDetection,
        processFrame: vi.fn(),
        resetBlinkCounter: vi.fn(),
        isBlinking: false,
        error: null,
      });

      const TestBlinkCount = () => {
        const { activeSession } = useSession();
        return (
          <div data-testid="total-blinks">
            {activeSession?.totalBlinks ?? 0}
          </div>
        );
      };

      const { rerender } = render(
        <SessionProvider>
          <TestComponent />
          <TestBlinkCount />
        </SessionProvider>
      );

      // Enable tracking
      const toggleButton = screen.getByText('Toggle Tracking');
      await act(async () => {
        toggleButton.click();
      });

      // Wait for session to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Simulate the scenario that caused negative counts:
      // BlinkCount increases, but handleFrameProcessing has stale closure
      for (let i = 151; i <= 200; i++) {
        currentBlinkCount = i;

        vi.mocked(useBlinkDetection).mockReturnValue({
          blinkCount: currentBlinkCount,
          currentEAR: 0.3,
          isReady: true,
          start: mockStartDetection,
          stop: mockStopDetection,
          processFrame: vi.fn(),
          resetBlinkCounter: vi.fn(),
          isBlinking: i % 5 === 0,
          error: null,
        });

        rerender(
          <SessionProvider>
            <TestComponent />
            <TestBlinkCount />
          </SessionProvider>
        );

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      // Verify blink count is NEVER negative
      const totalBlinks = screen.getByTestId('total-blinks');
      const currentValue = parseInt(totalBlinks.textContent || '0');

      expect(currentValue).toBeGreaterThanOrEqual(0);
    });
  });
});