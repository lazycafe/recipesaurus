import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSwipeActions } from './useSwipeActions';

function SwipeTarget({ onSwipeLeft }: { onSwipeLeft: () => void }) {
  const { swipeHandlers } = useSwipeActions<HTMLDivElement>({
    onSwipeLeft,
  });

  return (
    <div data-testid="swipe-target" {...swipeHandlers}>
      <button aria-label="Floating action">
        <svg aria-hidden="true" data-testid="button-icon" />
      </button>
    </div>
  );
}

describe('useSwipeActions', () => {
  it('ignores gestures that start on SVG icons inside buttons', () => {
    const onSwipeLeft = vi.fn();
    render(<SwipeTarget onSwipeLeft={onSwipeLeft} />);

    const icon = screen.getByTestId('button-icon');
    fireEvent.pointerDown(icon, { clientX: 140, clientY: 20, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(icon, { clientX: 60, clientY: 24, pointerId: 1, pointerType: 'touch' });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
