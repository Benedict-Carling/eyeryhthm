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
    
    expect(screen.getByText('10 blinks/min')).toBeInTheDocument();
    // Notifications switch should be off
    const switches = screen.getAllByRole('switch');
    const notificationSwitch = switches[0]; // First switch is notifications
    expect(notificationSwitch).not.toBeChecked();
    // Sound switch should be on but disabled (since notifications are off)
    const soundSwitch = switches[1]; // Second switch is sound
    expect(soundSwitch).toBeChecked();
    expect(soundSwitch).toBeDisabled();
  });

  it('updates fatigue threshold and saves to localStorage', async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    
    const slider = screen.getByRole('slider');
    
    // Simulate changing the slider value by clicking near the desired position
    // Since we can't directly set the value, we'll verify the slider works by checking initial state
    expect(screen.getByText('8 blinks/min')).toBeInTheDocument();
    
    // Use keyboard to change value
    slider.focus();
    await user.keyboard('{ArrowRight}');
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fatigueThreshold', '9');
    expect(screen.getByText('9 blinks/min')).toBeInTheDocument();
  });

  it('toggles notifications and saves to localStorage', async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    
    const switches = screen.getAllByRole('switch');
    const notificationSwitch = switches[0]; // First switch is notifications
    
    await user.click(notificationSwitch);
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('notificationsEnabled', 'false');
  });

  it('toggles sound alerts and saves to localStorage', async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    
    const switches = screen.getAllByRole('switch');
    const soundSwitch = switches[1]; // Second switch is sound
    
    await user.click(soundSwitch);
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('soundEnabled', 'true');
  });

  it('disables sound switch when notifications are disabled', async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    
    const switches = screen.getAllByRole('switch');
    const notificationSwitch = switches[0]; // First switch is notifications
    const soundSwitch = switches[1]; // Second switch is sound
    
    expect(soundSwitch).not.toBeDisabled();
    
    // Disable notifications
    await user.click(notificationSwitch);
    
    expect(soundSwitch).toBeDisabled();
  });

  it('shows threshold range labels', () => {
    render(<AccountPage />);
    
    expect(screen.getByText('4 blinks/min')).toBeInTheDocument();
    expect(screen.getByText('15 blinks/min')).toBeInTheDocument();
  });

  it('shows informational note about fatigue alerts', () => {
    render(<AccountPage />);
    
    expect(screen.getByText('Note: Fatigue alerts only trigger after 5 minutes of continuous session time')).toBeInTheDocument();
  });
});