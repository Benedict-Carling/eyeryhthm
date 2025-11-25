import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import { Navbar } from './Navbar';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
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

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function renderNavbar() {
  return render(
    <Theme>
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    </Theme>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the navbar with all navigation links', () => {
    renderNavbar();
    
    expect(screen.getByText('BlinkTrack')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Calibration')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('shows theme toggle button', () => {
    renderNavbar();
    
    const themeButton = screen.getByRole('button');
    expect(themeButton).toBeInTheDocument();
  });

  it('opens theme dropdown when clicked', async () => {
    const user = userEvent.setup();
    renderNavbar();
    
    const themeButton = screen.getByRole('button');
    await user.click(themeButton);
    
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('changes theme when option is selected', async () => {
    const user = userEvent.setup();
    renderNavbar();
    
    const themeButton = screen.getByRole('button');
    await user.click(themeButton);
    
    const lightOption = screen.getByText('Light');
    await user.click(lightOption);
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('highlights current page link', async () => {
    const nextNavigation = await import('next/navigation');
    const { usePathname } = vi.mocked(nextNavigation);
    usePathname.mockReturnValue('/calibration');

    renderNavbar();

    const calibrationLink = screen.getByText('Calibration');
    const calibrationLinkElement = calibrationLink.closest('a');
    expect(calibrationLinkElement).toHaveStyle({ color: 'var(--accent-11)' });
  });

  it('navigation links have correct href paths', () => {
    renderNavbar();

    // Get all navigation links
    const sessionsLink = screen.getByText('Sessions').closest('a');
    const calibrationLink = screen.getByText('Calibration').closest('a');
    const accountLink = screen.getByText('Account').closest('a');

    // Verify href attributes are set correctly
    expect(sessionsLink).toHaveAttribute('href', '/');
    expect(calibrationLink).toHaveAttribute('href', '/calibration');
    expect(accountLink).toHaveAttribute('href', '/account');
  });

  it('displays version number from package.json', () => {
    renderNavbar();

    // Version badge should show v{version} format
    const versionText = screen.getByText(/^v\d+\.\d+\.\d+$/);
    expect(versionText).toBeInTheDocument();
  });
});