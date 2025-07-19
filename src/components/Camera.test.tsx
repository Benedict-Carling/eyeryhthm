import { render, screen, fireEvent } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { Camera } from "./Camera";

// Mock the useCameraWithBlinkDetection hook
const mockUseCameraWithBlinkDetection = vi.fn();
vi.mock("../hooks/useCameraWithBlinkDetection", () => ({
  useCameraWithBlinkDetection: () => mockUseCameraWithBlinkDetection(),
}));

// Mock the CalibrationContext
const mockUseCalibration = vi.fn();
vi.mock("../contexts/CalibrationContext", () => ({
  useCalibration: () => mockUseCalibration(),
  CalibrationProvider: ({ children }: { children: React.ReactNode }) => children,
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
    mockUseCameraWithBlinkDetection.mockReturnValue({
      stream: null,
      isLoading: false,
      error: null,
      hasPermission: false,
      videoRef: { current: null },
      canvasRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      isDetectorReady: false,
      showDebugOverlay: false,
      resetBlinkCounter: vi.fn(),
      toggleDebugOverlay: vi.fn(),
    });

    renderCamera();

    expect(screen.getByText("Start Camera")).toBeInTheDocument();
  });

  test("shows loading state when requesting permission", () => {
    mockUseCameraWithBlinkDetection.mockReturnValue({
      stream: null,
      isLoading: true,
      error: null,
      hasPermission: false,
      videoRef: { current: null },
      canvasRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      isDetectorReady: false,
      showDebugOverlay: false,
      resetBlinkCounter: vi.fn(),
      toggleDebugOverlay: vi.fn(),
    });

    renderCamera();

    expect(
      screen.getByText("Requesting camera permission...")
    ).toBeInTheDocument();
  });

  test("displays error message when there is an error", () => {
    mockUseCameraWithBlinkDetection.mockReturnValue({
      stream: null,
      isLoading: false,
      error: "Camera permission denied",
      hasPermission: false,
      videoRef: { current: null },
      canvasRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      isDetectorReady: false,
      showDebugOverlay: false,
      resetBlinkCounter: vi.fn(),
      toggleDebugOverlay: vi.fn(),
    });

    renderCamera();

    expect(screen.getByText("Camera permission denied")).toBeInTheDocument();
  });

  test("renders video element when stream is available", () => {
    const mockStream = new MediaStream();
    const mockVideoRef = { current: document.createElement("video") };

    mockUseCameraWithBlinkDetection.mockReturnValue({
      stream: mockStream,
      isLoading: false,
      error: null,
      hasPermission: true,
      videoRef: mockVideoRef,
      canvasRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      isDetectorReady: false,
      showDebugOverlay: false,
      resetBlinkCounter: vi.fn(),
      toggleDebugOverlay: vi.fn(),
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

    mockUseCameraWithBlinkDetection.mockReturnValue({
      stream: mockStream,
      isLoading: false,
      error: null,
      hasPermission: true,
      videoRef: mockVideoRef,
      canvasRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      isDetectorReady: false,
      showDebugOverlay: false,
      resetBlinkCounter: vi.fn(),
      toggleDebugOverlay: vi.fn(),
    });

    renderCamera();

    const video = document.querySelector("video");
    expect(video).toHaveStyle("filter: grayscale(100%)");
    expect(video).toHaveStyle("background-color: #000");
  });

  test("calls startCamera when start button is clicked", async () => {
    const mockStartCamera = vi.fn();

    mockUseCameraWithBlinkDetection.mockReturnValue({
      stream: null,
      isLoading: false,
      error: null,
      hasPermission: false,
      videoRef: { current: null },
      canvasRef: { current: null },
      startCamera: mockStartCamera,
      stopCamera: vi.fn(),
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      isDetectorReady: false,
      showDebugOverlay: false,
      resetBlinkCounter: vi.fn(),
      toggleDebugOverlay: vi.fn(),
    });

    renderCamera();

    const startButton = screen.getByText("Start Camera");
    fireEvent.click(startButton);

    expect(mockStartCamera).toHaveBeenCalledOnce();
  });

  test("calls stopCamera when stop button is clicked", async () => {
    const mockStopCamera = vi.fn();
    const mockStream = new MediaStream();
    const mockVideoRef = { current: document.createElement("video") };

    mockUseCameraWithBlinkDetection.mockReturnValue({
      stream: mockStream,
      isLoading: false,
      error: null,
      hasPermission: true,
      videoRef: mockVideoRef,
      canvasRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: mockStopCamera,
      blinkCount: 0,
      currentEAR: 0,
      isBlinking: false,
      isDetectorReady: false,
      showDebugOverlay: false,
      resetBlinkCounter: vi.fn(),
      toggleDebugOverlay: vi.fn(),
    });

    renderCamera();

    const stopButton = screen.getByText("Stop Camera");
    fireEvent.click(stopButton);

    expect(mockStopCamera).toHaveBeenCalledOnce();
  });
});
