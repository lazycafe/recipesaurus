import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  beforeEach(() => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });
  });

  it('shows empty state when no cookbooks', () => {
    render(
      <CookbookList onCreateCookbook={() => {}} onSelectCookbook={() => {}} />
    );

    expect(screen.getByText('No cookbooks yet')).toBeDefined();
    expect(screen.getByText('Create Your First Cookbook')).toBeDefined();
  });

  it('calls onCreateCookbook when create button clicked', () => {
    const onCreateCookbook = vi.fn();
    render(
      <CookbookList onCreateCookbook={onCreateCookbook} onSelectCookbook={() => {}} />
    );

    fireEvent.click(screen.getByText('Create Your First Cookbook'));
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
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <CookbookList onCreateCookbook={() => {}} onSelectCookbook={() => {}} />
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
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <CookbookList onCreateCookbook={() => {}} onSelectCookbook={() => {}} />
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
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <CookbookList onCreateCookbook={() => {}} onSelectCookbook={() => {}} />
    );

    fireEvent.click(screen.getByText('Shared with Me'));
    // Cookbook name appears multiple times (spine + cover)
    expect(screen.getAllByText('Shared Cookbook').length).toBeGreaterThan(0);
  });

  it('calls onSelectCookbook when cookbook clicked', () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    const onSelectCookbook = vi.fn();
    render(
      <CookbookList onCreateCookbook={() => {}} onSelectCookbook={onSelectCookbook} />
    );

    fireEvent.click(screen.getByRole('article'));
    expect(onSelectCookbook).toHaveBeenCalledWith(mockCookbook);
  });

  it('hides New Cookbook button in shared tab', () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockCookbook],
      sharedCookbooks: [mockSharedCookbook],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <CookbookList onCreateCookbook={() => {}} onSelectCookbook={() => {}} />
    );

    // Initially visible
    expect(screen.getByText('New Cookbook')).toBeDefined();

    // Switch to shared tab
    fireEvent.click(screen.getByText('Shared with Me'));
    expect(screen.queryByText('New Cookbook')).toBeNull();
  });

  it('hides shared tab when no shared cookbooks', () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <CookbookList onCreateCookbook={() => {}} onSelectCookbook={() => {}} />
    );

    // The shared tab should not be visible when there are no shared cookbooks
    expect(screen.queryByText('Shared with Me')).toBeNull();
  });
});
