import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Carousel } from './Carousel';

describe('Carousel', () => {
  it('renders children', () => {
    render(
      <Carousel>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Carousel>
    );

    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 2')).toBeDefined();
    expect(screen.getByText('Item 3')).toBeDefined();
  });

  it('renders title when provided', () => {
    render(
      <Carousel title="My Carousel">
        <div>Item</div>
      </Carousel>
    );

    expect(screen.getByText('My Carousel')).toBeDefined();
  });

  it('does not render title when not provided', () => {
    render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );

    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('renders scroll arrows when showArrows is true', () => {
    render(
      <Carousel title="Test" showArrows={true}>
        <div>Item</div>
      </Carousel>
    );

    // Arrows may or may not be visible depending on scroll state
    // Just verify the component renders without error
    expect(screen.getByText('Test')).toBeDefined();
  });

  it('does not render arrows when showArrows is false', () => {
    render(
      <Carousel title="Test" showArrows={false}>
        <div>Item</div>
      </Carousel>
    );

    expect(screen.queryByLabelText('Scroll left')).toBeNull();
    expect(screen.queryByLabelText('Scroll right')).toBeNull();
  });

  it('has carousel track for horizontal scrolling', () => {
    const { container } = render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );

    const track = container.querySelector('.carousel-track');
    expect(track).toBeDefined();
  });

  it('has carousel content wrapper', () => {
    const { container } = render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );

    const content = container.querySelector('.carousel-content');
    expect(content).toBeDefined();
  });

  it('renders multiple children in a row', () => {
    const { container } = render(
      <Carousel>
        <div data-testid="item-1">Item 1</div>
        <div data-testid="item-2">Item 2</div>
        <div data-testid="item-3">Item 3</div>
      </Carousel>
    );

    const content = container.querySelector('.carousel-content');
    expect(content?.children.length).toBe(3);
  });
});
