import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeStart {
  pointerId: number;
  x: number;
  y: number;
}

interface UseSwipeActionsOptions {
  enabled?: boolean;
  threshold?: number;
  restraint?: number;
  ignoreDefaultSelectors?: boolean;
  ignoreSelectors?: string[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const DEFAULT_IGNORE_SELECTORS = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'label',
  '[contenteditable="true"]',
];

function isTouchPointer(event: ReactPointerEvent): boolean {
  return event.pointerType === 'touch';
}

function getSwipeDirection(
  deltaX: number,
  deltaY: number,
  threshold: number,
  restraint: number
): SwipeDirection | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX >= threshold && absY <= restraint) {
    return deltaX < 0 ? 'left' : 'right';
  }

  if (absY >= threshold && absX <= restraint) {
    return deltaY < 0 ? 'up' : 'down';
  }

  return null;
}

function isIgnoredTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement,
  selectors: string[]
): boolean {
  if (!(target instanceof Element)) return false;

  return selectors.some(selector => {
    const closest = target.closest(selector);
    return closest !== null && closest !== currentTarget;
  });
}

export function useSwipeActions<T extends HTMLElement = HTMLElement>({
  enabled = true,
  threshold = 54,
  restraint = 72,
  ignoreDefaultSelectors = true,
  ignoreSelectors = [],
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
}: UseSwipeActionsOptions) {
  const startRef = useRef<SwipeStart | null>(null);
  const lastSwipeAtRef = useRef(0);
  const optionsRef = useRef({
    enabled,
    threshold,
    restraint,
    ignoreDefaultSelectors,
    ignoreSelectors,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  });

  optionsRef.current = {
    enabled,
    threshold,
    restraint,
    ignoreDefaultSelectors,
    ignoreSelectors,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  };

  const handlePointerDown = useCallback((event: ReactPointerEvent<T>) => {
    const options = optionsRef.current;
    const selectors = [
      ...(options.ignoreDefaultSelectors ? DEFAULT_IGNORE_SELECTORS : []),
      ...options.ignoreSelectors,
    ];

    if (
      !options.enabled ||
      !isTouchPointer(event) ||
      isIgnoredTarget(event.target, event.currentTarget, selectors)
    ) {
      startRef.current = null;
      return;
    }

    startRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const finishSwipe = useCallback((event: ReactPointerEvent<T>) => {
    const start = startRef.current;
    startRef.current = null;

    if (!start || start.pointerId !== event.pointerId) return;

    const options = optionsRef.current;
    const direction = getSwipeDirection(
      event.clientX - start.x,
      event.clientY - start.y,
      options.threshold,
      options.restraint
    );

    if (!direction) return;

    const action = {
      left: options.onSwipeLeft,
      right: options.onSwipeRight,
      up: options.onSwipeUp,
      down: options.onSwipeDown,
    }[direction];

    if (!action) return;

    lastSwipeAtRef.current = Date.now();
    action();
  }, []);

  const handlePointerCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  const shouldIgnoreSwipeClick = useCallback(() => (
    Date.now() - lastSwipeAtRef.current < 350
  ), []);

  return {
    swipeHandlers: {
      onPointerDown: handlePointerDown,
      onPointerUp: finishSwipe,
      onPointerCancel: handlePointerCancel,
    },
    shouldIgnoreSwipeClick,
  };
}
