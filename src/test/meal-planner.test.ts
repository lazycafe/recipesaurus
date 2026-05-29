import { describe, expect, it } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';

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
      expect(result.error).toBe('Meal planning request is required and must be 2000 characters or fewer');
      expect(result.status).toBe(400);

      const usage = await client.ai.getMealPlanUsage();
      expect(usage.data?.usage.remainingRequests).toBe(2);
    } finally {
      harness.close();
    }
  });
});
