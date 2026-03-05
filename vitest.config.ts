import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/client/**/*.{ts,tsx}',
        'src/components/**/*.tsx',
        'api/src/core/**/*.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/index.ts',
        '**/*.d.ts',
        // Production-only code (uses HTTP/Cloudflare, not testable with in-memory harness)
        'src/client/HttpClient.ts',
        'src/client/defaultClient.ts',
        'api/src/core/D1Adapter.ts',
        // Type-only files
        'src/client/types.ts',
        'api/src/core/types.ts',
      ],
    },
  },
});
