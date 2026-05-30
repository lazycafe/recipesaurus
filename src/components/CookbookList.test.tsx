import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CookbookList } from './CookbookList';
import * as CookbookContext from '../context/CookbookContext';
import type { Cookbook } from '../types/Cookbook';

// Mock the context
vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

describe('CookbookList', () => {
  const mockCookbook: Cookbook = {
    id: '1',
    name: 'Test Cookbook',
    description: 'A test cookbook',
    recipeCount: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isOwner: true,
  };

  const mockSharedCookbook: Cookbook = {
    ...mockCookbook,
    id: '2',
    name: 'Shared Cookbook',
    isOwner: false,
    ownerName: 'Jane Doe',
  };

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });
  });

  it('shows empty state when no cookbooks', () => {
    renderWithRouter(
      <CookbookList onCreateCookbook={() => {}} />
    );

    expect(screen.getByText('No cookbooks yet')).toBeDefined();
    expect(screen.getByText('Create a cookbook to organize your recipes. Shared cookbooks will appear here too.')).toBeDefined();
  });

  it('shows page header with title and New Cookbook button', () => {
    renderWithRouter(
      <CookbookList onCreateCookbook={() => {}} />
    );

    expect(screen.getByText('Cookbooks')).toBeDefined();
    expect(screen.getByText('Organize your recipes into collections')).toBeDefined();
    expect(screen.getAllByText('New Cookbook').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onCreateCookbook when create button clicked', () => {
    const onCreateCookbook = vi.fn();
    renderWithRouter(
      <CookbookList onCreateCookbook={onCreateCookbook} />
    );

    const buttons = screen.getAllByRole('button', { name: /New Cookbook/i });
    fireEvent.click(buttons[0]);
    expect(onCreateCookbook).toHaveBeenCalledOnce();
  });

  it('renders owned cookbooks', () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    renderWithRouter(
      <CookbookList onCreateCookbook={() => {}} />
    );

    // Cookbook name appears multiple times (spine + cover)
    expect(screen.getAllByText('Test Cookbook').length).toBeGreaterThan(0);
    expect(screen.getByText('3 recipes')).toBeDefined();
  });

  it('renders owned and shared cookbooks together', () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockCookbook],
      sharedCookbooks: [mockSharedCookbook],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    renderWithRouter(
      <CookbookList onCreateCookbook={() => {}} />
    );

    // Cookbook name appears multiple times (spine + cover)
    expect(screen.getAllByText('Test Cookbook').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shared Cookbook').length).toBeGreaterThan(0);
    expect(screen.queryByText('My Cookbooks')).toBeNull();
    expect(screen.queryByText('Shared with Me')).toBeNull();
  });

  it('links to cookbook detail page when cookbook clicked', () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    renderWithRouter(
      <CookbookList onCreateCookbook={() => {}} />
    );

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/cookbooks/1');
  });

  it('does not show cookbook section tabs', () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockCookbook],
      sharedCookbooks: [mockSharedCookbook],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    renderWithRouter(
      <CookbookList onCreateCookbook={() => {}} />
    );

    expect(screen.queryByText('My Cookbooks')).toBeNull();
    expect(screen.queryByText('Shared with Me')).toBeNull();
  });
});
