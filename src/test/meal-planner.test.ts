import { describe, expect, it } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';
import {
  buildFallbackMealPlan,
  buildMealPlannerInstructions,
  type MealPlanRecipeContext,
} from '../../api/src/core/mealPlanner';

describe('AI meal planner API', () => {
  it('uses saved recipes and enforces two requests per rolling week', async () => {
    const harness = await ReactTestHarness.create();
    try {
      const client = harness.getClient();
      await harness.seedUser('planner@example.com', 'Password123', 'Planner');

      const usage = await client.ai.getMealPlanUsage();
      expect(usage.data?.usage.remainingRequests).toBe(2);

      const first = await client.ai.createMealPlan('Plan healthy dinners using recipes I own.');
      expect(first.error).toBeUndefined();
      expect(first.data?.suggestion).toContain('From your recipes');
      expect(first.data?.suggestion).toContain('Herb-Crusted Chicken');
      expect(first.data?.suggestion).not.toContain('AI meal plan draft');
      expect(first.data?.mentionedRecipes).toContainEqual({
        id: expect.any(String),
        title: 'Herb-Crusted Chicken',
      });
      expect(first.data?.cookbookName).toBe('Healthy Dinner Meal Plan');
      expect(first.data?.usage.remainingRequests).toBe(1);

      const second = await client.ai.createMealPlan('Plan two quick lunches.');
      expect(second.error).toBeUndefined();
      expect(second.data?.usage.remainingRequests).toBe(0);

      const third = await client.ai.createMealPlan('Plan one more dinner.');
      expect(third.error).toBe('Weekly AI meal planning limit reached');
      expect(third.status).toBe(402);
    } finally {
      harness.close();
    }
  });

  it('rejects empty requests without spending quota', async () => {
    const harness = await ReactTestHarness.create();
    try {
      const client = harness.getClient();
      await harness.seedUser('empty@example.com', 'Password123', 'Empty Request');

      const result = await client.ai.createMealPlan('   ');
      expect(result.error).toBe('Meal planning request is required and must be 1000 characters or fewer');
      expect(result.status).toBe(400);

      const usage = await client.ai.getMealPlanUsage();
      expect(usage.data?.usage.remainingRequests).toBe(2);
    } finally {
      harness.close();
    }
  });

  it('keeps breakfast and dessert recipes out of lunch and dinner fallback plans', () => {
    const recipes: MealPlanRecipeContext[] = [
      {
        id: 'pancakes',
        title: 'Fluffy Blueberry Pancakes',
        description: 'Weekend breakfast',
        ingredients: ['flour', 'blueberries'],
        tags: ['breakfast', 'sweet'],
      },
      {
        id: 'fondant',
        title: 'Chocolate Fondant',
        description: 'Molten chocolate dessert',
        ingredients: ['chocolate', 'butter'],
        tags: ['dessert'],
      },
      {
        id: 'bowl',
        title: 'Tofu Rice Bowl',
        description: 'Savory weeknight bowl',
        ingredients: ['tofu', 'rice'],
        tags: ['dinner', 'healthy'],
      },
    ];

    const result = buildFallbackMealPlan('Plan lunches and dinners for this week.', recipes);

    expect(result).toContain('Tofu Rice Bowl');
    expect(result).not.toContain('Fluffy Blueberry Pancakes');
    expect(result).not.toContain('Chocolate Fondant');
  });

  it('instructs the model to match recipes to requested meal slots', () => {
    const instructions = buildMealPlannerInstructions();

    expect(instructions).toContain('Match each recipe to the requested meal slot');
    expect(instructions).toContain('avoid breakfast, brunch, sweet, and dessert recipes');
    expect(instructions).toContain('fill the gaps with savory new ideas');
  });
});
