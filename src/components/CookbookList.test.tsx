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
    expect(screen.getByText('Create a cookbook to organize your recipes.')).toBeDefined();
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

  it('shows shared tab when shared cookbooks exist', () => {
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

    expect(screen.getByText('Shared with Me')).toBeDefined();
  });

  it('switches to shared tab and shows shared cookbooks', () => {
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

    fireEvent.click(screen.getByText('Shared with Me'));
    // Cookbook name appears multiple times (spine + cover)
    expect(screen.getAllByText('Shared Cookbook').length).toBeGreaterThan(0);
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

  it('shows tabs only when shared cookbooks exist', () => {
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

    // Both tabs should be visible
    expect(screen.getByText('My Cookbooks')).toBeDefined();
    expect(screen.getByText('Shared with Me')).toBeDefined();
  });

  it('hides shared tab when no shared cookbooks', () => {
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

    // The shared tab should not be visible when there are no shared cookbooks
    expect(screen.queryByText('Shared with Me')).toBeNull();
  });
});
