import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToCookbookModal } from './AddToCookbookModal';
import * as CookbookContext from '../context/CookbookContext';
import * as ClientContext from '../client/ClientContext';
import type { Cookbook } from '../types/Cookbook';
import type { Recipe } from '../types/Recipe';

// Mock the contexts
vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

describe('AddToCookbookModal', () => {
  const mockRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A test recipe',
    ingredients: ['ingredient 1'],
    instructions: ['step 1'],
    tags: ['test'],
    createdAt: Date.now(),
  };

  const mockOwnedCookbook: Cookbook = {
    id: 'cookbook-1',
    name: 'My Cookbook',
    description: 'My test cookbook',
    recipeCount: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isOwner: true,
  };

  const mockSharedCookbook: Cookbook = {
    id: 'cookbook-2',
    name: 'Shared Cookbook',
    description: 'A shared cookbook',
    recipeCount: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isOwner: false,
    ownerName: 'Jane Doe',
  };

  const mockAddRecipeToCookbook = vi.fn();
  const mockGetCookbooksForRecipe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    vi.mocked(ClientContext.useClient).mockReturnValue({
      auth: {
        getSession: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      },
      recipes: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getCookbooksForRecipe: mockGetCookbooksForRecipe.mockResolvedValue({ data: { cookbookIds: [] } }),
        saveFromPreview: vi.fn(),
      },
      cookbooks: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        addRecipe: vi.fn(),
        removeRecipe: vi.fn(),
        shareByEmail: vi.fn(),
        removeShare: vi.fn(),
        getShares: vi.fn(),
        createShareLink: vi.fn(),
        revokeShareLink: vi.fn(),
        getShared: vi.fn(),
      },
      notifications: {
        list: vi.fn(),
        markRead: vi.fn(),
        markAllRead: vi.fn(),
        clearAll: vi.fn(),
      },
      invites: {
        accept: vi.fn(),
        decline: vi.fn(),
      },
      discover: {
        recipes: vi.fn(),
        cookbooks: vi.fn(),
        getRecipe: vi.fn(),
        getCookbook: vi.fn(),
        saveRecipe: vi.fn(),
      },
    });
  });

  it('shows loading state initially', () => {
    mockGetCookbooksForRecipe.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    expect(screen.getByText('Add to Cookbook')).toBeDefined();
    expect(screen.getByText(`Add "${mockRecipe.title}" to a cookbook`)).toBeDefined();
  });

  it('shows empty state when no cookbooks', async () => {
    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("You don't have any cookbooks yet.")).toBeDefined();
    });
  });

  it('shows owned cookbooks', async () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockOwnedCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Cookbook')).toBeDefined();
      expect(screen.getByText('3 recipes')).toBeDefined();
    });
  });

  it('shows shared cookbooks with owner name', async () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [mockSharedCookbook],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Cookbook')).toBeDefined();
      expect(screen.getByText('5 recipes · Shared by Jane Doe')).toBeDefined();
    });
  });

  it('shows check mark for cookbooks already containing recipe', async () => {
    mockGetCookbooksForRecipe.mockResolvedValue({ data: { cookbookIds: ['cookbook-1'] } });

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockOwnedCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      const cookbookButton = screen.getByRole('button', { name: /My Cookbook/i });
      expect(cookbookButton.classList.contains('added')).toBe(true);
    });
  });

  it('calls addRecipeToCookbook when cookbook clicked', async () => {
    mockAddRecipeToCookbook.mockResolvedValue(true);

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockOwnedCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Cookbook')).toBeDefined();
    });

    const cookbookButton = screen.getByRole('button', { name: /My Cookbook/i });
    fireEvent.click(cookbookButton);

    await waitFor(() => {
      expect(mockAddRecipeToCookbook).toHaveBeenCalledWith('cookbook-1', 'recipe-1');
    });
  });

  it('shows added state after successful add', async () => {
    mockAddRecipeToCookbook.mockResolvedValue(true);

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockOwnedCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Cookbook')).toBeDefined();
    });

    const cookbookButton = screen.getByRole('button', { name: /My Cookbook/i });
    fireEvent.click(cookbookButton);

    await waitFor(() => {
      expect(cookbookButton.classList.contains('added')).toBe(true);
    });
  });

  it('toggles cookbook when clicking on already added cookbook', async () => {
    const mockRemoveRecipeFromCookbook = vi.fn().mockResolvedValue(true);
    mockGetCookbooksForRecipe.mockResolvedValue({ data: { cookbookIds: ['cookbook-1'] } });

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockOwnedCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: mockRemoveRecipeFromCookbook,
      refreshCookbooks: vi.fn(),
    });

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      const cookbookButton = screen.getByRole('button', { name: /My Cookbook/i });
      expect(cookbookButton.classList.contains('added')).toBe(true);
    });

    // Click to remove
    const cookbookButton = screen.getByRole('button', { name: /My Cookbook/i });
    fireEvent.click(cookbookButton);

    await waitFor(() => {
      expect(mockRemoveRecipeFromCookbook).toHaveBeenCalledWith('cookbook-1', 'recipe-1');
      expect(cookbookButton.classList.contains('added')).toBe(false);
    });
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={onClose}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Add to Cookbook')).toBeDefined();
    });

    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose and onCreateCookbook when Create New Cookbook clicked', async () => {
    const onClose = vi.fn();
    const onCreateCookbook = vi.fn();

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={onClose}
        onCreateCookbook={onCreateCookbook}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create New Cookbook')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Create New Cookbook'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onCreateCookbook).toHaveBeenCalledOnce();
  });

  it('fetches existing cookbooks for recipe on mount', async () => {
    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(mockGetCookbooksForRecipe).toHaveBeenCalledWith('recipe-1');
    });
  });

  it('shows both owned and shared cookbooks', async () => {
    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [mockOwnedCookbook],
      sharedCookbooks: [mockSharedCookbook],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Cookbook')).toBeDefined();
      expect(screen.getByText('Shared Cookbook')).toBeDefined();
    });
  });

  it('shows singular "recipe" for count of 1', async () => {
    const singleRecipeCookbook: Cookbook = {
      ...mockOwnedCookbook,
      recipeCount: 1,
    };

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [singleRecipeCookbook],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: mockAddRecipeToCookbook,
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    render(
      <AddToCookbookModal
        recipe={mockRecipe}
        onClose={() => {}}
        onCreateCookbook={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1 recipe')).toBeDefined();
    });
  });
});
