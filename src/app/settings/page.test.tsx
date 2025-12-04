import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import SettingsPage from './page';

// Helper to render with Theme provider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<Theme>{ui}</Theme>);
};

// Mock useUpdateStatus hook
vi.mock('@/hooks/useUpdateStatus', () => ({
  useUpdateStatus: () => ({
    isElectron: false,
    updateStatus: null,
    hasUpdate: false,
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    installUpdate: vi.fn(),
  }),
}));

// Mock useNotificationSettings hook
const mockNotificationSettings = {
  isElectron: false,
  isLoading: false,
  settings: {
    enabled: true,
    soundEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: 23,
    quietHoursEnd: 7,
  },
  notificationState: {
    isSupported: true,
    canSend: true,
    isWithinQuietHours: false,
    cooldownRemaining: 0,
    permissionStatus: 'authorized' as const,
  },
  updateSetting: vi.fn(),
  updateSettings: vi.fn(),
  testNotification: vi.fn().mockResolvedValue({ success: true }),
  sendFatigueAlert: vi.fn(),
  refreshNotificationState: vi.fn(),
  openNotificationSettings: vi.fn(),
  formatHour: (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  },
};

vi.mock('@/hooks/useNotificationSettings', () => ({
  useNotificationSettings: () => mockNotificationSettings,
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'fatigueThreshold') return '8';
      return null;
    });
    // Reset to non-Electron mode by default
    mockNotificationSettings.isElectron = false;
  });

  it('renders settings page', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your fatigue detection preferences')).toBeInTheDocument();
    expect(screen.getByText('Fatigue Detection')).toBeInTheDocument();
    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
  });

  it('loads saved fatigue threshold from localStorage', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'fatigueThreshold') return '10';
      return null;
    });

    render(<SettingsPage />);

    // Check that threshold input has the correct value
    const thresholdInput = screen.getByRole('spinbutton');
    expect(thresholdInput).toHaveValue(10);
  });

  it('shows notification switches when in Electron mode', () => {
    mockNotificationSettings.isElectron = true;

    renderWithTheme(<SettingsPage />);

    // In Electron mode, notification switches should be visible
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(3); // notifications, sound, quiet hours
  });

  it('shows message about desktop app when not in Electron', () => {
    mockNotificationSettings.isElectron = false;

    render(<SettingsPage />);

    expect(screen.getByText('Desktop notifications are only available in the EyeRhythm desktop app')).toBeInTheDocument();
  });

  it('updates fatigue threshold and saves to localStorage', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const thresholdInput = screen.getByRole('spinbutton') as HTMLInputElement;

    // Verify initial value is 8 (from mock localStorage)
    expect(thresholdInput).toHaveValue(8);

    // Use fireEvent to change value directly since userEvent.type has issues with validation
    await user.tripleClick(thresholdInput); // Select all
    await user.keyboard('9'); // Type new value

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fatigueThreshold', '9');
  });

  it('notification switches are enabled in Electron mode', () => {
    mockNotificationSettings.isElectron = true;

    renderWithTheme(<SettingsPage />);

    const switches = screen.getAllByRole('switch');
    const notificationSwitch = switches[0]!;

    // Notification switch should be enabled in Electron mode
    expect(notificationSwitch).not.toBeDisabled();
  });

  it('shows threshold input with correct min/max attributes', () => {
    render(<SettingsPage />);

    const thresholdInput = screen.getByRole('spinbutton');
    expect(thresholdInput).toHaveAttribute('min', '4');
    expect(thresholdInput).toHaveAttribute('max', '15');
  });

  it('shows informational note about fatigue alerts', () => {
    render(<SettingsPage />);

    expect(screen.getByText(/Note: Fatigue alerts only trigger after 3 minutes of continuous session time/)).toBeInTheDocument();
  });
});