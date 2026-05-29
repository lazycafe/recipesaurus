import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MealPlannerPage } from './MealPlannerPage';
import * as ClientContext from '../client/ClientContext';
import * as RecipeContext from '../context/RecipeContext';
import * as CookbookContext from '../context/CookbookContext';
import type { IClient, MealPlanUsage } from '../client/types';

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

vi.mock('../context/RecipeContext', () => ({
  useRecipes: vi.fn(),
}));

vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

const samplePrompt = 'Plan my lunches and dinners for this week using recipes I own and a few new easy recipes. Make them a mix of Asian and healthy dishes.';

function usage(remainingRequests: number): MealPlanUsage {
  return {
    weeklyLimit: 2,
    usedThisWeek: 2 - remainingRequests,
    remainingRequests,
    windowStartsAt: Date.now() - 1000,
    nextResetAt: remainingRequests === 0 ? Date.now() + 86400000 : null,
    isPaid: false,
    planName: 'Free',
    priceCents: 499,
  };
}

describe('MealPlannerPage', () => {
  const mockGetMealPlanUsage = vi.fn();
  const mockCreateMealPlan = vi.fn();
  const mockCreateCookbook = vi.fn();
  const mockAddRecipe = vi.fn();
  const mockRefreshCookbooks = vi.fn();
  const mockCreateCheckoutSession = vi.fn();
  const mockCreatePortalSession = vi.fn();

  function renderMealPlanner() {
    return render(
      <MemoryRouter>
        <MealPlannerPage />
      </MemoryRouter>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetMealPlanUsage.mockResolvedValue({ data: { usage: usage(2) } });
    mockCreateMealPlan.mockResolvedValue({
      data: {
        suggestion: 'Monday: From your recipes: Herb-Crusted Chicken',
        mentionedRecipes: [{ id: 'recipe-1', title: 'Herb-Crusted Chicken' }],
        cookbookName: 'Healthy Dinner Meal Plan',
        usage: usage(1),
        recipeCount: 3,
      },
    });
    mockCreateCookbook.mockResolvedValue('cookbook-1');
    mockAddRecipe.mockResolvedValue({ data: { success: true } });
    mockRefreshCookbooks.mockResolvedValue(undefined);
    mockCreateCheckoutSession.mockResolvedValue({ data: { url: 'https://checkout.stripe.test/session' } });
    mockCreatePortalSession.mockResolvedValue({ data: { url: 'https://billing.stripe.test/session' } });

    vi.mocked(ClientContext.useClient).mockReturnValue({
      ai: {
        getMealPlanUsage: mockGetMealPlanUsage,
        createMealPlan: mockCreateMealPlan,
      },
      billing: {
        getStatus: vi.fn(),
        createCheckoutSession: mockCreateCheckoutSession,
        createPortalSession: mockCreatePortalSession,
      },
      cookbooks: {
        addRecipe: mockAddRecipe,
      },
    } as unknown as IClient);

    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [
        {
          id: 'recipe-1',
          title: 'Herb-Crusted Chicken',
          description: 'Dinner',
          ingredients: [],
          instructions: [],
          tags: ['healthy'],
          createdAt: 1,
        },
      ],
      isLoading: false,
      addRecipe: vi.fn(),
      updateRecipe: vi.fn(),
      deleteRecipe: vi.fn(),
      getAllTags: vi.fn(),
      refreshRecipes: vi.fn(),
    });

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: mockCreateCookbook,
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: mockRefreshCookbooks,
    });
  });

  it('shows the sample request and submits it to the AI client', async () => {
    renderMealPlanner();

    await waitFor(() => {
      expect(screen.getByText(/2 requests remaining this week/)).toBeDefined();
    });

    expect(screen.getByDisplayValue(samplePrompt)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Get Suggestions/i }));

    await waitFor(() => {
      expect(mockCreateMealPlan).toHaveBeenCalledWith(samplePrompt);
      expect(screen.getByText(/Herb-Crusted Chicken/i)).toBeDefined();
    });
    expect(screen.getByRole('button', { name: 'Herb-Crusted Chicken' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Create Cookbook/i })).toBeDefined();
    expect(screen.queryByText('AI meal plan draft')).toBeNull();
  });

  it('shows the paywall when the weekly quota is gone', async () => {
    mockGetMealPlanUsage.mockResolvedValue({ data: { usage: usage(0) } });

    renderMealPlanner();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Weekly AI plans used' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Get Suggestions/i }));
    expect(mockCreateMealPlan).not.toHaveBeenCalled();
  });

  it('creates a cookbook from linked saved recipes', async () => {
    renderMealPlanner();

    await waitFor(() => {
      expect(screen.getByText(/2 requests remaining this week/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Get Suggestions/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Cookbook/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Cookbook/i }));

    await waitFor(() => {
      expect(mockCreateCookbook).toHaveBeenCalledWith({
        name: 'Healthy Dinner Meal Plan',
        description: `Created from meal planner request: ${samplePrompt}`,
      });
      expect(mockAddRecipe).toHaveBeenCalledWith('cookbook-1', 'recipe-1');
    });
  });
});
