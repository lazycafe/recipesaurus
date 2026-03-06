import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackPage } from './FeedbackPage';

const mockFetch = vi.fn();

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

describe('FeedbackPage', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('localStorage', localStorageMock);
    mockFetch.mockResolvedValue({ ok: true });
    localStorageMock.clear();
  });

  it('renders the page title', () => {
    renderWithRouter();
    expect(screen.getByText('Give Feedback')).toBeDefined();
  });

  it('renders back link', () => {
    renderWithRouter();
    expect(screen.getByText('Back to Recipes')).toBeDefined();
  });

  it('renders feedback type buttons', () => {
    renderWithRouter();
    expect(screen.getByText('Report a Bug')).toBeDefined();
    expect(screen.getByText('Request a Feature')).toBeDefined();
    expect(screen.getByText('General Feedback')).toBeDefined();
  });

  it('renders message textarea', () => {
    renderWithRouter();
    expect(screen.getByLabelText('Your Message')).toBeDefined();
  });

  it('renders email input', () => {
    renderWithRouter();
    expect(screen.getByLabelText('Email (optional)')).toBeDefined();
  });

  it('renders submit button', () => {
    renderWithRouter();
    expect(screen.getByText('Send Feedback')).toBeDefined();
  });

  it('submit button is disabled when message is empty', () => {
    renderWithRouter();
    const submitButton = screen.getByText('Send Feedback').closest('button');
    expect(submitButton).toHaveProperty('disabled', true);
  });

  it('submit button is enabled when message has content', () => {
    renderWithRouter();
    const textarea = screen.getByLabelText('Your Message');
    fireEvent.change(textarea, { target: { value: 'Test feedback' } });

    const submitButton = screen.getByText('Send Feedback').closest('button');
    expect(submitButton).toHaveProperty('disabled', false);
  });

  it('changes placeholder text based on feedback type', () => {
    renderWithRouter();

    // Default is general
    expect(screen.getByPlaceholderText(/Share your thoughts/)).toBeDefined();

    // Click bug report
    fireEvent.click(screen.getByText('Report a Bug'));
    expect(screen.getByPlaceholderText(/Please describe the bug/)).toBeDefined();

    // Click feature request
    fireEvent.click(screen.getByText('Request a Feature'));
    expect(screen.getByPlaceholderText(/What feature would you like/)).toBeDefined();
  });

  it('shows success message after submission', async () => {
    renderWithRouter();

    const textarea = screen.getByLabelText('Your Message');
    fireEvent.change(textarea, { target: { value: 'Great app!' } });

    const submitButton = screen.getByText('Send Feedback').closest('button')!;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Thank You!')).toBeDefined();
    });
    expect(screen.getByText(/Your feedback has been received/)).toBeDefined();
  });

  it('sends feedback to Discord webhook', async () => {
    renderWithRouter();

    fireEvent.click(screen.getByText('Report a Bug'));

    const textarea = screen.getByLabelText('Your Message');
    fireEvent.change(textarea, { target: { value: 'Found a bug' } });

    const emailInput = screen.getByLabelText('Email (optional)');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByText('Send Feedback').closest('button')!;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('discord.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('shows return to recipes link after submission', async () => {
    renderWithRouter();

    const textarea = screen.getByLabelText('Your Message');
    fireEvent.change(textarea, { target: { value: 'Feedback' } });

    const submitButton = screen.getByText('Send Feedback').closest('button')!;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Return to Recipes')).toBeDefined();
    });
  });

  it('shows loading state while submitting', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100)));
    renderWithRouter();

    const textarea = screen.getByLabelText('Your Message');
    fireEvent.change(textarea, { target: { value: 'Feedback' } });

    const submitButton = screen.getByText('Send Feedback').closest('button')!;
    fireEvent.click(submitButton);

    expect(screen.getByText('Sending...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Thank You!')).toBeDefined();
    });
  });

  it('shows rate limit message after 3 submissions', () => {
    // Simulate 3 recent submissions
    const recentTimestamps = [Date.now() - 1000, Date.now() - 2000, Date.now() - 3000];
    localStorageMock.setItem('recipesaurus_feedback_timestamps', JSON.stringify(recentTimestamps));

    renderWithRouter();

    expect(screen.getByText(/reached the daily feedback limit/)).toBeDefined();
    expect(screen.queryByText('Send Feedback')).toBeNull();
  });

  it('shows remaining submissions count', async () => {
    // Simulate 1 recent submission
    const recentTimestamps = [Date.now() - 1000];
    localStorageMock.setItem('recipesaurus_feedback_timestamps', JSON.stringify(recentTimestamps));

    renderWithRouter();

    expect(screen.getByText('2 submissions remaining today')).toBeDefined();
  });
});
