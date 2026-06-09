import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  const mockGetMealPlanHistory = vi.fn();
  const mockCreateMealPlan = vi.fn();
  const mockCreateCookbook = vi.fn();
  const mockAddRecipe = vi.fn();
  const mockRefreshRecipes = vi.fn();
  const mockRefreshCookbooks = vi.fn();
  const mockCreateCheckoutSession = vi.fn();
  const mockCreatePortalSession = vi.fn();
  const mockOpen = vi.fn();
  const originalOpen = window.open;

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
    mockGetMealPlanHistory.mockResolvedValue({ data: { history: [] } });
    mockCreateMealPlan.mockResolvedValue({
      data: {
        id: 'meal-plan-1',
        prompt: samplePrompt,
        suggestion: 'Monday: From your recipes: Herb-Crusted Chicken',
        mentionedRecipes: [{ id: 'recipe-1', title: 'Herb-Crusted Chicken' }],
        cookbookName: 'Healthy Dinner Meal Plan',
        createdAt: Date.now(),
        usage: usage(1),
        recipeCount: 3,
      },
    });
    mockCreateCookbook.mockResolvedValue('cookbook-1');
    mockAddRecipe.mockResolvedValue({ data: { success: true } });
    mockRefreshCookbooks.mockResolvedValue(undefined);
    mockCreateCheckoutSession.mockResolvedValue({ data: { url: 'https://checkout.stripe.test/session' } });
    mockCreatePortalSession.mockResolvedValue({ data: { url: 'https://billing.stripe.test/session' } });
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });

    vi.mocked(ClientContext.useClient).mockReturnValue({
      ai: {
        getMealPlanUsage: mockGetMealPlanUsage,
        getMealPlanHistory: mockGetMealPlanHistory,
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
      refreshRecipes: mockRefreshRecipes,
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

  afterEach(() => {
    Object.defineProperty(window, 'open', {
      value: originalOpen,
      writable: true,
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
      expect(mockRefreshRecipes).toHaveBeenCalled();
      expect(screen.getAllByText(/Herb-Crusted Chicken/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { name: 'Suggestions' }).closest('section')?.className).toContain('is-highlighted');
    expect(screen.getAllByRole('button', { name: 'Herb-Crusted Chicken' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Create Cookbook/i })).toBeDefined();
    expect(screen.queryByText('AI meal plan draft')).toBeNull();
  });

  it('keeps previous meal planning responses collapsed until opened', async () => {
    mockGetMealPlanHistory.mockResolvedValue({
      data: {
        history: [
          {
            id: 'history-1',
            prompt: 'Plan easy dinners for next week.',
            suggestion: 'Request: Plan easy dinners for next week.\n\nTuesday: From your recipes: Herb-Crusted Chicken',
            mentionedRecipes: [{ id: 'recipe-1', title: 'Herb-Crusted Chicken' }],
            cookbookName: 'Easy Dinner Meal Plan',
            createdAt: new Date('2026-05-01T12:00:00Z').getTime(),
            recipeCount: 1,
          },
        ],
      },
    });

    renderMealPlanner();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /expand history/i })).toBeDefined();
      expect(screen.getByText('Your previous meal planning questions and responses.')).toBeDefined();
    });

    const historySection = screen.getByLabelText('Meal planning history');
    const historyButton = screen.getByRole('button', { name: /expand history/i });
    expect(historyButton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Plan easy dinners for next week.')).toBeNull();

    fireEvent.click(historyButton);

    expect(historyButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /collapse history/i })).toBeDefined();
    expect(screen.getByText('Plan easy dinners for next week.')).toBeDefined();
    expect(screen.getByText('May 1, 2026')).toBeDefined();
    expect(screen.queryByText(/Tuesday:/)).toBeNull();
    expect(within(historySection).queryByText(/saved recipe/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Plan easy dinners for next week/i }));

    expect(screen.queryByText(/^Request:/)).toBeNull();
    expect(screen.getByText(/Tuesday:/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Herb-Crusted Chicken' })).toBeDefined();
  });

  it('paginates meal planning history at five items per page', async () => {
    mockGetMealPlanHistory.mockResolvedValue({
      data: {
        history: Array.from({ length: 6 }, (_, index) => ({
          id: `history-${index + 1}`,
          prompt: `History prompt ${index + 1}`,
          suggestion: `Suggestion ${index + 1}`,
          mentionedRecipes: [],
          cookbookName: `Meal Plan ${index + 1}`,
          createdAt: new Date(`2026-05-${String(index + 1).padStart(2, '0')}T12:00:00Z`).getTime(),
          recipeCount: index + 1,
        })),
      },
    });

    renderMealPlanner();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /expand history/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /expand history/i }));

    expect(screen.getByText('History prompt 1')).toBeDefined();
    expect(screen.getByText('History prompt 5')).toBeDefined();

    expect(screen.queryByText('History prompt 6')).toBeNull();
    expect(screen.getByText('Page 1 of 2')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Next page'));

    expect(screen.getByText('History prompt 6')).toBeDefined();
    expect(screen.queryByText('History prompt 1')).toBeNull();
  });

  it('keeps the submit button disabled while planning', async () => {
    let resolveMealPlan: ((value: unknown) => void) | undefined;
    mockCreateMealPlan.mockImplementation(() => new Promise(resolve => {
      resolveMealPlan = resolve;
    }));

    renderMealPlanner();

    await waitFor(() => {
      expect(screen.getByText(/2 requests remaining this week/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Get Suggestions/i }));

    await waitFor(() => {
      const planningButton = screen.getByRole('button', { name: /Planning/i }) as HTMLButtonElement;
      expect(planningButton.disabled).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: /Planning/i }));
    expect(mockCreateMealPlan).toHaveBeenCalledTimes(1);

    resolveMealPlan?.({
      data: {
        id: 'meal-plan-1',
        prompt: samplePrompt,
        suggestion: 'Monday: From your recipes: Herb-Crusted Chicken',
        mentionedRecipes: [{ id: 'recipe-1', title: 'Herb-Crusted Chicken' }],
        cookbookName: 'Healthy Dinner Meal Plan',
        createdAt: Date.now(),
        usage: usage(1),
        recipeCount: 3,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get Suggestions/i })).toBeDefined();
    });
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

  it('links toolbar status items to recipes and settings', async () => {
    mockGetMealPlanUsage.mockResolvedValue({
      data: {
        usage: {
          ...usage(2),
          isPaid: true,
          planName: 'Meal Planner Plus',
          weeklyLimit: 50,
        },
      },
    });

    renderMealPlanner();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /1 saved recipes available/i })).toBeDefined();
    });

    const recipesLink = screen.getByRole('link', { name: /1 saved recipes available/i }) as HTMLAnchorElement;
    const planLink = screen.getByRole('link', { name: /Meal Planner Plus: 2 requests remaining this week/i }) as HTMLAnchorElement;

    expect(recipesLink.getAttribute('href')).toBe('/my-recipes');
    expect(planLink.getAttribute('href')).toBe('/settings');
    expect(screen.queryByRole('button', { name: /Manage billing/i })).toBeNull();
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
