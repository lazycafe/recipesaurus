// Test setup file for happy-dom environment
// This file is loaded before each test file

// Note: happy-dom is configured via vitest.config.ts
// happy-dom provides crypto globally

// Clean up after each test
import { afterEach } from 'vitest';

afterEach(() => {
  // Clean up any DOM state
  document.body.innerHTML = '';
});
