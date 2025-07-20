import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from './Navbar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Navbar', () => {
  it('renders navbar with all navigation items', () => {
    const onThemeChange = vi.fn();
    render(<Navbar currentTheme="system" onThemeChange={onThemeChange} />);

    expect(screen.getByText('BlinkTrack')).toBeInTheDocument();
    expect(screen.getByText('Detection')).toBeInTheDocument();
    expect(screen.getByText('Calibration')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('cycles through themes when theme button is clicked', () => {
    const onThemeChange = vi.fn();
    render(<Navbar currentTheme="light" onThemeChange={onThemeChange} />);

    const themeButton = screen.getByLabelText('Switch to light theme');
    fireEvent.click(themeButton);

    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('shows correct theme icon based on current theme', () => {
    const onThemeChange = vi.fn();
    const { rerender } = render(<Navbar currentTheme="light" onThemeChange={onThemeChange} />);
    
    expect(screen.getByLabelText('Switch to light theme')).toBeInTheDocument();

    rerender(<Navbar currentTheme="dark" onThemeChange={onThemeChange} />);
    expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();

    rerender(<Navbar currentTheme="system" onThemeChange={onThemeChange} />);
    expect(screen.getByLabelText('Switch to system theme')).toBeInTheDocument();
  });

  it('toggles mobile menu when hamburger button is clicked', () => {
    const onThemeChange = vi.fn();
    render(<Navbar currentTheme="system" onThemeChange={onThemeChange} />);

    // Mobile menu should not be visible initially
    const mobileLinks = screen.queryAllByText('Detection');
    expect(mobileLinks).toHaveLength(1); // Only desktop version

    // Click hamburger menu
    const menuButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(menuButton);

    // Mobile menu should now be visible
    const allLinks = screen.getAllByText('Detection');
    expect(allLinks).toHaveLength(2); // Desktop + mobile versions
  });
});