import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DinoMascot } from './DinoMascot';

describe('DinoMascot', () => {
  it('renders an SVG', () => {
    const { container } = render(<DinoMascot />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('uses default size of 120', () => {
    const { container } = render(<DinoMascot />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('120');
    expect(svg?.getAttribute('height')).toBe('120');
  });

  it('accepts custom size', () => {
    const { container } = render(<DinoMascot size={64} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('64');
    expect(svg?.getAttribute('height')).toBe('64');
  });

  it('accepts custom className', () => {
    const { container } = render(<DinoMascot className="my-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('my-class')).toBe(true);
  });

  it('accepts custom style', () => {
    const { container } = render(<DinoMascot style={{ color: 'red' }} />);
    const svg = container.querySelector('svg');
    expect(svg?.style.color).toBe('red');
  });
});
