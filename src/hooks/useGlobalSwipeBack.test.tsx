import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGlobalSwipeBack } from './useGlobalSwipeBack';

function SwipeBackHarness() {
  useGlobalSwipeBack();

  return (
    <div>
      <button>Action</button>
      <input aria-label="Recipe search" />
    </div>
  );
}

describe('useGlobalSwipeBack', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses browser history for right swipes', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(<SwipeBackHarness />);

    fireEvent.pointerDown(document, { clientX: 40, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(document, { clientX: 120, clientY: 82, pointerId: 1 });

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('ignores right swipes that start in editable fields', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const { getByLabelText } = render(<SwipeBackHarness />);
    const input = getByLabelText('Recipe search');

    fireEvent.pointerDown(input, { clientX: 40, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(document, { clientX: 120, clientY: 82, pointerId: 1 });

    expect(back).not.toHaveBeenCalled();
  });
});
