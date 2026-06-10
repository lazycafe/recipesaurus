import { useEffect, useRef } from 'react';

interface SwipeStart {
  pointerId: number;
  x: number;
  y: number;
}

interface UseGlobalSwipeBackOptions {
  enabled?: boolean;
  threshold?: number;
  restraint?: number;
}

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(EDITABLE_SELECTOR));
}

export function useGlobalSwipeBack({
  enabled = true,
  threshold = 54,
  restraint = 72,
}: UseGlobalSwipeBackOptions = {}) {
  const startRef = useRef<SwipeStart | null>(null);
  const lastSwipeBackAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (isEditableTarget(event.target)) {
        startRef.current = null;
        return;
      }

      startRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = startRef.current;
      startRef.current = null;

      if (!start || start.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;

      if (deltaX >= threshold && Math.abs(deltaY) <= restraint) {
        lastSwipeBackAtRef.current = Date.now();
        event.preventDefault();
        window.history.back();
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (Date.now() - lastSwipeBackAtRef.current < 350) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePointerCancel = () => {
      startRef.current = null;
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('pointercancel', handlePointerCancel, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('pointercancel', handlePointerCancel, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [enabled, restraint, threshold]);
}
