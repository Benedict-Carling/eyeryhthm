import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { Camera } from '../Camera';

// Mock the useCamera hook
const mockUseCamera = vi.fn();
vi.mock('../../hooks/useCamera', () => ({
  useCamera: () => mockUseCamera(),
}));

const renderCamera = () => {
  return render(
    <Theme>
      <Camera />
    </Theme>
  );
};

describe('Camera Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders start camera button when no permission', () => {
    mockUseCamera.mockReturnValue({
      stream: null,
      isLoading: false,
      error: null,
      hasPermission: false,
      videoRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
    });

    renderCamera();
    
    expect(screen.getByText('Start Camera')).toBeInTheDocument();
  });

  test('shows loading state when requesting permission', () => {
    mockUseCamera.mockReturnValue({
      stream: null,
      isLoading: true,
      error: null,
      hasPermission: false,
      videoRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
    });

    renderCamera();
    
    expect(screen.getByText('Requesting camera permission...')).toBeInTheDocument();
  });

  test('displays error message when there is an error', () => {
    mockUseCamera.mockReturnValue({
      stream: null,
      isLoading: false,
      error: 'Camera permission denied',
      hasPermission: false,
      videoRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
    });

    renderCamera();
    
    expect(screen.getByText('Camera permission denied')).toBeInTheDocument();
  });

  test('renders video element when stream is available', () => {
    const mockStream = new MediaStream();
    const mockVideoRef = { current: document.createElement('video') };
    
    mockUseCamera.mockReturnValue({
      stream: mockStream,
      isLoading: false,
      error: null,
      hasPermission: true,
      videoRef: mockVideoRef,
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
    });

    renderCamera();
    
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveProperty('muted', true);
    expect(video).toHaveAttribute('playsinline');
    expect(screen.getByText('Stop Camera')).toBeInTheDocument();
  });

  test('video element has correct styling for grayscale', () => {
    const mockStream = new MediaStream();
    const mockVideoRef = { current: document.createElement('video') };
    
    mockUseCamera.mockReturnValue({
      stream: mockStream,
      isLoading: false,
      error: null,
      hasPermission: true,
      videoRef: mockVideoRef,
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
    });

    renderCamera();
    
    const video = document.querySelector('video');
    expect(video).toHaveStyle('filter: grayscale(100%)');
    expect(video).toHaveStyle('background-color: #000');
  });

  test('calls startCamera when start button is clicked', async () => {
    const mockStartCamera = vi.fn();
    
    mockUseCamera.mockReturnValue({
      stream: null,
      isLoading: false,
      error: null,
      hasPermission: false,
      videoRef: { current: null },
      startCamera: mockStartCamera,
      stopCamera: vi.fn(),
    });

    renderCamera();
    
    const startButton = screen.getByText('Start Camera');
    fireEvent.click(startButton);
    
    expect(mockStartCamera).toHaveBeenCalledOnce();
  });

  test('calls stopCamera when stop button is clicked', async () => {
    const mockStopCamera = vi.fn();
    const mockStream = new MediaStream();
    const mockVideoRef = { current: document.createElement('video') };
    
    mockUseCamera.mockReturnValue({
      stream: mockStream,
      isLoading: false,
      error: null,
      hasPermission: true,
      videoRef: mockVideoRef,
      startCamera: vi.fn(),
      stopCamera: mockStopCamera,
    });

    renderCamera();
    
    const stopButton = screen.getByText('Stop Camera');
    fireEvent.click(stopButton);
    
    expect(mockStopCamera).toHaveBeenCalledOnce();
  });
});