import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import * as AuthContext from '../context/AuthContext';
import * as ClientContext from '../client/ClientContext';
import type { BillingStatus, IClient } from '../client/types';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

describe('SettingsPage', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  };
  const mockGetBillingStatus = vi.fn();
  const mockCancelSubscription = vi.fn();
  const mockReinstateSubscription = vi.fn();

  const freeBilling: BillingStatus = {
    isPaid: false,
    planName: 'Free',
    priceCents: 499,
    currency: 'usd',
    interval: 'month',
    freeWeeklyLimit: 2,
    paidWeeklyLimit: 50,
    weeklyLimit: 2,
    subscription: null,
  };

  const paidBilling: BillingStatus = {
    isPaid: true,
    planName: 'Meal Planner Plus',
    priceCents: 499,
    currency: 'usd',
    interval: 'month',
    freeWeeklyLimit: 2,
    paidWeeklyLimit: 50,
    weeklyLimit: 50,
    subscription: {
      status: 'active',
      currentPeriodEnd: Date.UTC(2026, 5, 15, 12),
      cancelAtPeriodEnd: false,
    },
  };

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  const mockAuth = (user = mockUser) => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBillingStatus.mockResolvedValue({ data: { billing: freeBilling } });
    mockCancelSubscription.mockResolvedValue({
      data: {
        billing: {
          ...paidBilling,
          subscription: {
            ...paidBilling.subscription!,
            cancelAtPeriodEnd: true,
          },
        },
      },
    });
    mockReinstateSubscription.mockResolvedValue({
      data: {
        billing: paidBilling,
      },
    });

    vi.mocked(ClientContext.useClient).mockReturnValue({
      billing: {
        getStatus: mockGetBillingStatus,
        createCheckoutSession: vi.fn(),
        createPortalSession: vi.fn(),
        cancelSubscription: mockCancelSubscription,
        reinstateSubscription: mockReinstateSubscription,
      },
    } as unknown as IClient);

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });
  });

  it('returns null when no user', () => {
    const { container } = renderWithRouter(<SettingsPage />);
    expect(container.firstChild).toBeNull();
  });

  it('renders settings page when user logged in', async () => {
    mockAuth();

    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeDefined();
    await waitFor(() => expect(mockGetBillingStatus).toHaveBeenCalled());
  });

  it('displays user name', async () => {
    mockAuth();

    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Test User')).toBeDefined();
    await waitFor(() => expect(mockGetBillingStatus).toHaveBeenCalled());
  });

  it('displays user email', async () => {
    mockAuth();

    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('test@example.com')).toBeDefined();
    await waitFor(() => expect(mockGetBillingStatus).toHaveBeenCalled());
  });

  it('shows Account section heading', async () => {
    mockAuth();

    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Account')).toBeDefined();
    await waitFor(() => expect(mockGetBillingStatus).toHaveBeenCalled());
  });

  it('shows the free subscription plan', async () => {
    mockAuth();

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeDefined();
    });
    expect(screen.getByText(/2 AI meal planning requests per week/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Upgrade to Meal Planner Plus/i })).toBeNull();
  });

  it('shows the paid subscription plan', async () => {
    mockGetBillingStatus.mockResolvedValue({ data: { billing: paidBilling } });
    mockAuth();

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Meal Planner Plus')).toBeDefined();
    });
    expect(screen.getByText('$4.99/month')).toBeDefined();
    expect(screen.getByText('Renews on')).toBeDefined();
    expect(screen.getByRole('button', { name: /End paid subscription/i })).toBeDefined();
  });

  it('confirms before ending a paid subscription', async () => {
    mockGetBillingStatus.mockResolvedValue({ data: { billing: paidBilling } });
    mockAuth();

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /End paid subscription/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /End paid subscription/i }));
    expect(screen.getByText('End Meal Planner Plus?')).toBeDefined();
    expect(mockCancelSubscription).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'End subscription' }));

    await waitFor(() => {
      expect(mockCancelSubscription).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/will end on/i)).toBeDefined();
      expect(screen.getByText('Access until')).toBeDefined();
    });
  });

  it('restores a paid subscription that was already scheduled to end', async () => {
    const canceledBilling: BillingStatus = {
      ...paidBilling,
      subscription: {
        ...paidBilling.subscription!,
        cancelAtPeriodEnd: true,
      },
    };
    mockGetBillingStatus.mockResolvedValue({ data: { billing: canceledBilling } });
    mockAuth();

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Restore paid subscription/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Restore paid subscription/i }));

    await waitFor(() => {
      expect(mockReinstateSubscription).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Renews on')).toBeDefined();
      expect(screen.getByRole('button', { name: /End paid subscription/i })).toBeDefined();
    });
  });
});
