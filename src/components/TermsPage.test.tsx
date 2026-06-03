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
    expect(screen.getByText('2. Our Service')).toBeDefined();
    expect(screen.getByText('3. Accounts and Security')).toBeDefined();
    expect(screen.getByText('4. Your Content')).toBeDefined();
    expect(screen.getByText('5. Sharing, Friends, and Public Content')).toBeDefined();
    expect(screen.getByText('6. Imported and Third-Party Content')).toBeDefined();
    expect(screen.getByText('7. Acceptable Use')).toBeDefined();
    expect(screen.getByText('8. Food, Allergies, and Meal Planning')).toBeDefined();
    expect(screen.getByText('9. Privacy')).toBeDefined();
    expect(screen.getByText('10. Service Changes and Availability')).toBeDefined();
    expect(screen.getByText('11. Termination')).toBeDefined();
    expect(screen.getByText('12. Disclaimers and Liability')).toBeDefined();
    expect(screen.getByText('13. Changes to Terms')).toBeDefined();
    expect(screen.getByText('14. Contact')).toBeDefined();
  });

  it('renders link to feedback page', () => {
    renderWithRouter();
    expect(screen.getByText('feedback page')).toBeDefined();
  });

  it('renders acceptable use list items', () => {
    renderWithRouter();
    expect(screen.getByText(/Upload, import, or share content that infringes/)).toBeDefined();
    expect(screen.getByText(/Use the service for illegal/)).toBeDefined();
    expect(screen.getByText(/Harass others or send unwanted friend requests/)).toBeDefined();
  });
});
