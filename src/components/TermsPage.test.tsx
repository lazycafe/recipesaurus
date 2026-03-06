import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TermsPage } from './TermsPage';

describe('TermsPage', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );
  };

  it('renders the page title', () => {
    renderWithRouter();
    expect(screen.getByText('Terms of Use')).toBeDefined();
  });

  it('renders the last updated date', () => {
    renderWithRouter();
    expect(screen.getByText(/Last updated:/)).toBeDefined();
  });

  it('renders back link', () => {
    renderWithRouter();
    expect(screen.getByText('Back to Recipes')).toBeDefined();
  });

  it('renders all section headings', () => {
    renderWithRouter();
    expect(screen.getByText('1. Acceptance of Terms')).toBeDefined();
    expect(screen.getByText('2. Description of Service')).toBeDefined();
    expect(screen.getByText('3. User Accounts')).toBeDefined();
    expect(screen.getByText('4. User Content')).toBeDefined();
    expect(screen.getByText('5. Acceptable Use')).toBeDefined();
    expect(screen.getByText('6. Privacy')).toBeDefined();
    expect(screen.getByText('7. Disclaimer')).toBeDefined();
    expect(screen.getByText('8. Changes to Terms')).toBeDefined();
    expect(screen.getByText('9. Contact')).toBeDefined();
  });

  it('renders link to feedback page', () => {
    renderWithRouter();
    expect(screen.getByText('feedback page')).toBeDefined();
  });

  it('renders acceptable use list items', () => {
    renderWithRouter();
    expect(screen.getByText(/Upload content that infringes/)).toBeDefined();
    expect(screen.getByText(/Use the service for any illegal purpose/)).toBeDefined();
  });
});
