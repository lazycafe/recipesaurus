# Recipesaurus Development Guidelines

## Testing Requirements

**Every source file should have a corresponding `.test.ts` or `.test.tsx` file.**

- Tests should run quickly (target <100ms per test file)
- Use the `ReactTestHarness` for tests that need backend data
- Pure UI components can be tested with just `@testing-library/react`

### Running Tests

```bash
npm test              # Run all tests (~1s)
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Test File Location

- Component tests: `src/components/ComponentName.test.tsx`
- Client tests: `src/client/*.test.ts`
- Integration tests: `src/test/*.test.ts`

### Example: Testing a Pure UI Component

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeDefined();
  });
});
```

### Example: Testing with Backend Data

```tsx
import { ReactTestHarness } from '../test/ReactTestHarness';

describe('MyComponent with data', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
    await harness.seedUser('test@example.com', 'Password123', 'Test');
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  it('displays user data', async () => {
    const Wrapper = harness.getWrapper();
    render(<Wrapper><MyComponent /></Wrapper>);
    // assertions...
  });
});
```

## Project Structure

- `src/client/` - Client abstraction layer (IClient interface)
- `src/components/` - React UI components
- `src/context/` - React context providers
- `src/test/` - Test harness and integration tests
- `api/src/core/` - Backend business logic (handlers, adapters)

## Architecture Notes

- **Client abstraction**: React components use `useClient()` hook to access the API
- **In-memory testing**: Tests use `InMemoryClient` with sql.js for fast, isolated tests
- **Production**: Uses `HttpClient` with fetch to hit the Cloudflare Workers API
