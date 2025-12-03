import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountPage from './page';

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

describe('AccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'fatigueThreshold') return '8';
      if (key === 'notificationsEnabled') return 'true';
      if (key === 'soundEnabled') return 'false';
      return null;
    });
  });

  it('renders account settings page', () => {
    render(<AccountPage />);
    
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your fatigue detection preferences')).toBeInTheDocument();
    expect(screen.getByText('Fatigue Detection')).toBeInTheDocument();
    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
  });

  it('loads saved settings from localStorage', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'fatigueThreshold') return '10';
      if (key === 'notificationsEnabled') return 'false';
      if (key === 'soundEnabled') return 'true';
      return null;
    });

    render(<AccountPage />);

    // Check that threshold input has the correct value
    const thresholdInput = screen.getByRole('spinbutton');
    expect(thresholdInput).toHaveValue(10);
    // Notifications switch should be off
    const switches = screen.getAllByRole('switch');
    const notificationSwitch = switches[0]; // First switch is notifications
    expect(notificationSwitch).toHaveAttribute('aria-checked', 'false');
    // Sound switch should be on but disabled (since notifications are off)
    const soundSwitch = switches[1]; // Second switch is sound
    expect(soundSwitch).toHaveAttribute('aria-checked', 'true');
    expect(soundSwitch).toBeDisabled();
  });

  it('updates fatigue threshold and saves to localStorage', async () => {
    const user = userEvent.setup();
    render(<AccountPage />);

    const thresholdInput = screen.getByRole('spinbutton') as HTMLInputElement;

    // Verify initial value is 8 (from mock localStorage)
    expect(thresholdInput).toHaveValue(8);

    // Use fireEvent to change value directly since userEvent.type has issues with validation
    await user.tripleClick(thresholdInput); // Select all
    await user.keyboard('9'); // Type new value

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fatigueThreshold', '9');
  });

  it('notification switches are disabled (feature in development)', () => {
    render(<AccountPage />);

    const switches = screen.getAllByRole('switch');
    const notificationSwitch = switches[0]!;
    const soundSwitch = switches[1]!;

    // Both switches are disabled since notifications are in development
    expect(notificationSwitch).toBeDisabled();
    expect(soundSwitch).toBeDisabled();
  });

  it('shows threshold input with correct min/max attributes', () => {
    render(<AccountPage />);

    const thresholdInput = screen.getByRole('spinbutton');
    expect(thresholdInput).toHaveAttribute('min', '4');
    expect(thresholdInput).toHaveAttribute('max', '15');
  });

  it('shows informational note about fatigue alerts', () => {
    render(<AccountPage />);

    expect(screen.getByText(/Note: Fatigue alerts only trigger after 3 minutes of continuous session time/)).toBeInTheDocument();
  });
});