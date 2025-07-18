import { renderHook, act } from "@testing-library/react";
import { useCamera } from "./useCamera";

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

describe("useCamera Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("initial state is correct", () => {
    const { result } = renderHook(() => useCamera());

    expect(result.current.stream).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.videoRef).toBeDefined();
    expect(typeof result.current.startCamera).toBe("function");
    expect(typeof result.current.stopCamera).toBe("function");
  });

  test("startCamera successfully gets media stream", async () => {
    const mockStream = new MediaStream();
    const mockVideoTrack = new MediaStreamTrack("video");
    mockStream.addTrack(mockVideoTrack);

    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { facingMode: "user" },
      audio: false,
    });
    expect(result.current.stream).toBe(mockStream);
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test("startCamera handles permission denied error", async () => {
    const permissionError = new Error("Permission denied");
    permissionError.name = "NotAllowedError";
    mockGetUserMedia.mockRejectedValue(permissionError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.stream).toBe(null);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Camera permission denied");
  });

  test("startCamera handles generic error", async () => {
    const genericError = new Error("Generic error");
    mockGetUserMedia.mockRejectedValue(genericError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.stream).toBe(null);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Failed to access camera");
  });

  test("startCamera sets up video element correctly", async () => {
    const mockStream = new MediaStream();
    const mockVideoTrack = new MediaStreamTrack("video");
    mockStream.addTrack(mockVideoTrack);

    mockGetUserMedia.mockResolvedValue(mockStream);

    // Create a mock video element
    const mockVideoElement = document.createElement("video");
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    mockVideoElement.play = mockPlay;

    const { result } = renderHook(() => useCamera());

    // Set the video ref
    result.current.videoRef.current = mockVideoElement;

    await act(async () => {
      await result.current.startCamera();
      // Wait for requestAnimationFrame to complete
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(mockVideoElement.getAttribute("playsinline")).toBe("true");
    expect(mockVideoElement.getAttribute("webkit-playsinline")).toBe("true");
    expect(mockVideoElement.autoplay).toBe(true);
    expect(mockVideoElement.muted).toBe(true);
    expect(mockVideoElement.srcObject).toBe(mockStream);
  });

  test("stopCamera stops all tracks and cleans up", async () => {
    const mockStream = new MediaStream();
    const mockVideoTrack = new MediaStreamTrack("video");
    const mockStopTrack = vi.fn();
    mockVideoTrack.stop = mockStopTrack;
    mockStream.addTrack(mockVideoTrack);

    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCamera());

    // Start camera first
    await act(async () => {
      await result.current.startCamera();
    });

    // Create mock video element
    const mockVideoElement = document.createElement("video");
    result.current.videoRef.current = mockVideoElement;

    // Stop camera
    act(() => {
      result.current.stopCamera();
    });

    expect(mockStopTrack).toHaveBeenCalled();
    expect(mockVideoElement.srcObject).toBe(null);
    expect(result.current.stream).toBe(null);
    expect(result.current.hasPermission).toBe(false);
  });

  test("video element receives onloadedmetadata handler", async () => {
    const mockStream = new MediaStream();
    const mockVideoTrack = new MediaStreamTrack("video");
    mockStream.addTrack(mockVideoTrack);

    mockGetUserMedia.mockResolvedValue(mockStream);

    // Create a mock video element
    const mockVideoElement = document.createElement("video");
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    mockVideoElement.play = mockPlay;

    const { result } = renderHook(() => useCamera());

    // Set the video ref
    result.current.videoRef.current = mockVideoElement;

    await act(async () => {
      await result.current.startCamera();
      // Wait for requestAnimationFrame to complete
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(mockVideoElement.onloadedmetadata).toBeTruthy();

    // Simulate the metadata loaded event
    await act(async () => {
      if (mockVideoElement.onloadedmetadata) {
        mockVideoElement.onloadedmetadata({} as Event);
      }
    });
  });
});
