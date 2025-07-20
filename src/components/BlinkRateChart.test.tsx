import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BlinkRateChart } from './BlinkRateChart';
import { BlinkRatePoint } from '../lib/sessions/types';

// Mock d3
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      remove: vi.fn(),
    })),
    node: vi.fn(() => ({
      getBoundingClientRect: vi.fn(() => ({
        width: 800,
        height: 400,
      })),
    })),
    append: vi.fn(() => ({
      attr: vi.fn().mockReturnThis(),
      append: vi.fn().mockReturnThis(),
      datum: vi.fn().mockReturnThis(),
      data: vi.fn().mockReturnThis(),
      enter: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      style: vi.fn().mockReturnThis(),
      selectAll: vi.fn(() => ({
        data: vi.fn().mockReturnThis(),
        enter: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis(),
        attr: vi.fn().mockReturnThis(),
      })),
    })),
  })),
  scaleTime: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
  scaleLinear: vi.fn(() => {
    const scale = vi.fn((value: number) => value * 10);
    scale.domain = vi.fn().mockReturnValue(scale);
    scale.nice = vi.fn().mockReturnValue(scale);
    scale.range = vi.fn().mockReturnValue(scale);
    return scale;
  }),
  line: vi.fn(() => ({
    x: vi.fn().mockReturnThis(),
    y: vi.fn().mockReturnThis(),
    curve: vi.fn().mockReturnThis(),
  })),
  area: vi.fn(() => ({
    x: vi.fn().mockReturnThis(),
    y0: vi.fn().mockReturnThis(),
    y1: vi.fn().mockReturnThis(),
    curve: vi.fn().mockReturnThis(),
  })),
  extent: vi.fn((data, accessor) => {
    const values = data.map(accessor);
    return [Math.min(...values), Math.max(...values)];
  }),
  max: vi.fn((data, accessor) => {
    const values = data.map(accessor);
    return Math.max(...values);
  }),
  axisBottom: vi.fn(() => ({
    tickFormat: vi.fn().mockReturnThis(),
    tickSize: vi.fn().mockReturnThis(),
  })),
  axisLeft: vi.fn(() => ({
    tickSize: vi.fn().mockReturnThis(),
    tickFormat: vi.fn().mockReturnThis(),
  })),
  timeFormat: vi.fn(() => vi.fn()),
  curveMonotoneX: {},
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

describe('BlinkRateChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('8');
  });

  const mockData: BlinkRatePoint[] = [
    { timestamp: 1000, rate: 10 },
    { timestamp: 2000, rate: 12 },
    { timestamp: 3000, rate: 8 },
    { timestamp: 4000, rate: 6 },
    { timestamp: 5000, rate: 9 },
  ];

  it('renders an svg element', () => {
    const { container } = render(<BlinkRateChart data={mockData} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveStyle({ display: 'block' });
  });

  it('renders with 100% width and height', () => {
    const { container } = render(<BlinkRateChart data={mockData} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '100%');
    expect(svg).toHaveAttribute('height', '100%');
  });

  it('handles empty data gracefully', () => {
    const { container } = render(<BlinkRateChart data={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('uses fatigue threshold from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('10');
    render(<BlinkRateChart data={mockData} />);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('fatigueThreshold');
  });

  it('uses default threshold when localStorage is empty', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    render(<BlinkRateChart data={mockData} />);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('fatigueThreshold');
  });
});