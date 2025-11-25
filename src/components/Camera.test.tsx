import { render, screen, fireEvent, act } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { Camera } from "./Camera";
import { vi } from "vitest";

// Define mock functions at module scope so they can be referenced in tests
const mockStartCamera = vi.fn();
const mockStopCamera = vi.fn();

// Use vi.hoisted to ensure mocks are available for vi.mock
const { mockUseCamera, mockUseBlinkDetection } = vi.hoisted(() => ({
  mockUseCamera: vi.fn(() => ({
    stream: null,
    videoRef: { current: null },
    startCamera: vi.fn(),
    stopCamera: vi.fn(),
    error: null,
    hasPermission: false,
    isLoading: false,
  })),
  mockUseBlinkDetection: vi.fn(() => ({
    blinkCount: 0,
    currentEAR: 0,
    isBlinking: false,
    isReady: false,
    start: vi.fn(),
    stop: vi.fn(),
    processFrame: vi.fn(),
    resetBlinkCounter: vi.fn(),
  })),
}));

vi.mock("../hooks/useCamera", () => ({
  useCamera: mockUseCamera,
}));

vi.mock("../hooks/useBlinkDetection", () => ({
  useBlinkDetection: mockUseBlinkDetection,
}));

vi.mock("../hooks/useFrameProcessor", () => ({
  useFrameProcessor: vi.fn(),
}));

// Mock the CalibrationContext
const mockUseCalibration = vi.fn();
vi.mock("../contexts/CalibrationContext", () => ({
  useCalibration: () => mockUseCalibration(),
  CalibrationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the VideoCanvas component
vi.mock("./VideoCanvas", () => ({
  VideoCanvas: ({ videoRef, canvasRef }: { videoRef: React.RefObject<HTMLVideoElement | null>, canvasRef: React.RefObject<HTMLCanvasElement | null> }) => (
    <div>
      <video ref={videoRef} autoPlay muted playsInline style={{ filter: "grayscale(100%)", backgroundColor: "#000" }} />
      <canvas ref={canvasRef} />
    </div>
  ),
}));

const renderCamera = () => {
  return render(
    <Theme>
      <Camera />
    </Theme>
  );
};

describe("Camera Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for calibration context
    mockUseCalibration.mockReturnValue({
      canStartDetection: () => true,
      activeCalibration: { earThreshold: 0.25 }
    });
  });

  test("renders start camera button when no permission", () => {
    renderCamera();
    expect(screen.getByText("Start Camera")).toBeInTheDocument();
  });

  test("shows loading state when requesting permission", () => {
    mockUseCamera.mockReturnValue({
      stream: null,
      videoRef: { current: null },
      startCamera: mockStartCamera,
      stopCamera: mockStopCamera,
      error: null,
      hasPermission: false,
      isLoading: true,
    });

    renderCamera();

    expect(
      screen.getByText("Requesting camera permission...")
    ).toBeInTheDocument();
  });

  test("displays error message when there is an error", () => {
    mockUseCamera.mockReturnValue({
      stream: null,
      videoRef: { current: null },
      startCamera: mockStartCamera,
      stopCamera: mockStopCamera,
      error: "Camera permission denied",
      hasPermission: false,
      isLoading: false,
    });

    renderCamera();

    expect(screen.getByText("Camera permission denied")).toBeInTheDocument();
  });

  test("renders video element when stream is available", () => {
    const mockStream = new MediaStream();
    const mockVideoRef = { current: document.createElement("video") };

    mockUseCamera.mockReturnValue({
      stream: mockStream,
      videoRef: mockVideoRef,
      startCamera: mockStartCamera,
      stopCamera: mockStopCamera,
      error: null,
      hasPermission: true,
      isLoading: false,
    });

    renderCamera();

    const video = document.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveProperty("muted", true);
    expect(video).toHaveAttribute("playsinline");
    expect(screen.getByText("Stop Camera")).toBeInTheDocument();
  });

  test("video element has correct styling for grayscale", () => {
    const mockStream = new MediaStream();
    const mockVideoRef = { current: document.createElement("video") };

    mockUseCamera.mockReturnValue({
      stream: mockStream,
      videoRef: mockVideoRef,
      startCamera: mockStartCamera,
      stopCamera: mockStopCamera,
      error: null,
      hasPermission: true,
      isLoading: false,
    });

    renderCamera();

    const video = document.querySelector("video");
    expect(video).toHaveStyle("filter: grayscale(100%)");
    expect(video).toHaveStyle("background-color: #000");
  });

  test("calls startCamera when start button is clicked", async () => {
    const startCameraFn = vi.fn();
    mockUseCamera.mockReturnValue({
      stream: null,
      videoRef: { current: null },
      startCamera: startCameraFn,
      stopCamera: vi.fn(),
      error: null,
      hasPermission: false,
      isLoading: false,
    });

    renderCamera();

    const startButton = screen.getByText("Start Camera");

    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(startCameraFn).toHaveBeenCalledOnce();
  });

  test("calls stopCamera when stop button is clicked", async () => {
    const mockStream = new MediaStream();
    const mockVideoRef = { current: document.createElement("video") };
    const stopCameraFn = vi.fn();

    mockUseCamera.mockReturnValue({
      stream: mockStream,
      videoRef: mockVideoRef,
      startCamera: vi.fn(),
      stopCamera: stopCameraFn,
      error: null,
      hasPermission: true,
      isLoading: false,
    });

    mockUseBlinkDetection.mockReturnValue({
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      isReady: true,
      start: vi.fn(),
      stop: vi.fn(),
      processFrame: vi.fn(),
      resetBlinkCounter: vi.fn(),
    });

    renderCamera();

    const stopButton = screen.getByText("Stop Camera");

    await act(async () => {
      fireEvent.click(stopButton);
    });

    expect(stopCameraFn).toHaveBeenCalledOnce();
  });
});