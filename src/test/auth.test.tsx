import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactTestHarness } from './ReactTestHarness';
import { useClient } from '../client/ClientContext';
import { useState, useEffect } from 'react';

// Test component that uses the client
function UserDisplay() {
  const client = useClient();
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.auth.getSession().then(result => {
      setUser(result.data?.user || null);
      setLoading(false);
    });
  }, [client]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;
  return <div>Welcome, {user.name}</div>;
}

describe('Auth with React components', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  it('should show not logged in when no user', async () => {
    const Wrapper = harness.getWrapper();

    render(
      <Wrapper>
        <UserDisplay />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeDefined();
    });
  });

  it('should show user name when logged in', async () => {
    await harness.seedUser('test@example.com', 'Password123', 'Test User');

    const Wrapper = harness.getWrapper();

    render(
      <Wrapper>
        <UserDisplay />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User')).toBeDefined();
    });
  });

  it('should support different users with different clients', async () => {
    // Create two clients for two different users
    const client1 = harness.createClient();
    const client2 = harness.createClient();

    // Register both users
    await client1.auth.register('user1@example.com', 'User One', 'Password123');
    await client2.auth.register('user2@example.com', 'User Two', 'Password123');

    const Wrapper1 = harness.createWrapperForClient(client1);
    const Wrapper2 = harness.createWrapperForClient(client2);

    // Render components for each user
    const { unmount: unmount1 } = render(
      <Wrapper1>
        <UserDisplay />
      </Wrapper1>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome, User One')).toBeDefined();
    });

    unmount1();

    render(
      <Wrapper2>
        <UserDisplay />
      </Wrapper2>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome, User Two')).toBeDefined();
    });
  });
});
