// Responsive test utilities
import { describe, beforeEach, afterEach } from 'vitest';

export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Set the viewport width for testing responsive behavior
 */
export function setViewport(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      // Parse the query to check if it matches
      const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
      const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);

      let matches = true;
      if (minWidthMatch) {
        matches = matches && width >= parseInt(minWidthMatch[1]);
      }
      if (maxWidthMatch) {
        matches = matches && width <= parseInt(maxWidthMatch[1]);
      }

      return {
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      };
    },
  });

  // Dispatch resize event
  window.dispatchEvent(new Event('resize'));
}

/**
 * Reset viewport to default
 */
export function resetViewport(): void {
  setViewport(BREAKPOINTS.desktop);
}

/**
 * Test helper to run tests at different breakpoints
 */
export function describeResponsive(
  name: string,
  fn: (breakpoint: Breakpoint, width: number) => void
): void {
  describe(name, () => {
    Object.entries(BREAKPOINTS).forEach(([breakpoint, width]) => {
      describe(`at ${breakpoint} (${width}px)`, () => {
        beforeEach(() => {
          setViewport(width);
        });

        afterEach(() => {
          resetViewport();
        });

        fn(breakpoint as Breakpoint, width);
      });
    });
  });
}
