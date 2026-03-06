import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackPage } from './FeedbackPage';

describe('FeedbackPage', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>
    );
  };

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

  it('shows success message after submission', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    renderWithRouter();

    const textarea = screen.getByLabelText('Your Message');
    fireEvent.change(textarea, { target: { value: 'Great app!' } });

    const submitButton = screen.getByText('Send Feedback').closest('button')!;
    fireEvent.click(submitButton);

    expect(screen.getByText('Thank You!')).toBeDefined();
    expect(screen.getByText(/Your feedback has been received/)).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('logs feedback data on submission', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    renderWithRouter();

    fireEvent.click(screen.getByText('Report a Bug'));

    const textarea = screen.getByLabelText('Your Message');
    fireEvent.change(textarea, { target: { value: 'Found a bug' } });

    const emailInput = screen.getByLabelText('Email (optional)');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByText('Send Feedback').closest('button')!;
    fireEvent.click(submitButton);

    expect(consoleSpy).toHaveBeenCalledWith('Feedback submitted:', {
      feedbackType: 'bug',
      message: 'Found a bug',
      email: 'test@example.com',
    });

    consoleSpy.mockRestore();
  });

  it('shows return to recipes link after submission', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    renderWithRouter();

    const textarea = screen.getByLabelText('Your Message');
    fireEvent.change(textarea, { target: { value: 'Feedback' } });

    const submitButton = screen.getByText('Send Feedback').closest('button')!;
    fireEvent.click(submitButton);

    expect(screen.getByText('Return to Recipes')).toBeDefined();

    consoleSpy.mockRestore();
  });
});
