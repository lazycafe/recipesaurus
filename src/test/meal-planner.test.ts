import { describe, expect, it } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';
import {
  MEAL_PLAN_INVALID_REQUEST_CODE,
  MEAL_PLAN_LIMIT_CODE,
  MEAL_PLAN_OPENAI_AUTHENTICATION_FAILED_CODE,
  MEAL_PLAN_OPENAI_BAD_REQUEST_CODE,
  MEAL_PLAN_OPENAI_INSUFFICIENT_QUOTA_CODE,
  MEAL_PLAN_OPENAI_MODEL_UNAVAILABLE_CODE,
  MEAL_PLAN_OPENAI_PERMISSION_DENIED_CODE,
  MEAL_PLAN_OPENAI_RATE_LIMITED_CODE,
  MEAL_PLAN_OPENAI_SERVER_ERROR_CODE,
  buildMealPlanGeneratedRecipeDrafts,
  buildFallbackMealPlan,
  buildMealPlannerContinuationInput,
  buildMealPlannerInstructions,
  getOpenAIResponseId,
  getMealPlanOpenAIErrorResponseCode,
  shouldContinueOpenAIResponse,
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
      expect(first.data?.mentionedRecipes).toContainEqual({
        id: expect.any(String),
        title: 'Vegetable Stir-Fry',
      });
      expect(first.data?.cookbookName).toBe('Healthy Dinner Meal Plan');
      expect(first.data?.usage.remainingRequests).toBe(1);

      const recipesAfterPlan = await client.recipes.list();
      expect(recipesAfterPlan.data?.recipes.find(recipe => recipe.title === 'Vegetable Stir-Fry')).toBeUndefined();

      const generatedMention = first.data?.mentionedRecipes.find(recipe => recipe.title === 'Vegetable Stir-Fry');
      const generatedRecipe = await client.discover.getRecipe(generatedMention?.id || '');
      expect(generatedRecipe.data?.recipe).toMatchObject({
        title: 'Vegetable Stir-Fry',
        ownerName: 'Recipesaurus',
        isPublic: true,
        imageUrl: expect.stringContaining('images.unsplash.com'),
      });
      expect(generatedRecipe.data?.recipe.description).not.toMatch(/ai meal planner/i);
      expect(generatedRecipe.data?.recipe.instructions.join(' ')).not.toMatch(/ai meal planner/i);
      expect(generatedRecipe.data?.recipe.tags.join(' ')).not.toMatch(/ai meal planner/i);
      expect(generatedRecipe.data?.recipe.tags.join(' ')).not.toMatch(/recipesaurus starter/i);
      expect(generatedRecipe.data?.recipe.tags.every(tag => tag === tag.toLowerCase())).toBe(true);

      const second = await client.ai.createMealPlan('Plan two quick lunches.');
      expect(second.error).toBeUndefined();
      expect(second.data?.usage.remainingRequests).toBe(0);

      const history = await client.ai.getMealPlanHistory();
      expect(history.error).toBeUndefined();
      expect(history.data?.history).toHaveLength(2);
      expect(history.data?.history[0]).toMatchObject({
        prompt: 'Plan two quick lunches.',
        suggestion: expect.stringContaining('Suggested starting point'),
      });

      const third = await client.ai.createMealPlan('Plan one more dinner.');
      expect(third.error).toBe('Weekly AI meal planning limit reached');
      expect(third.status).toBe(402);
      expect(third.code).toBe(MEAL_PLAN_LIMIT_CODE);
    } finally {
      harness.close();
    }
  });

  it('uses exact public recipe matches before creating Recipesaurus starter recipes', async () => {
    const harness = await ReactTestHarness.create();
    try {
      const publicClient = harness.createClient();
      await publicClient.auth.register('chef@example.com', 'Community Chef', 'Password123');
      const publicRecipe = await publicClient.recipes.create({
        title: 'Vegetable Stir-Fry',
        description: 'Crisp vegetables tossed in a savory sauce.',
        ingredients: ['Mixed vegetables', 'Soy sauce', 'Cooked rice'],
        instructions: ['Cook vegetables in a hot skillet.', 'Toss with sauce and serve over rice.'],
        tags: ['dinner', 'healthy', 'asian'],
        imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80',
        prepTime: '10 mins',
        cookTime: '15 mins',
        servings: '4',
        isPublic: true,
      });

      const client = harness.getClient();
      await harness.seedUser('public-planner@example.com', 'Password123', 'Public Planner');

      const result = await client.ai.createMealPlan('Plan healthy dinners with a stir fry.');
      expect(result.error).toBeUndefined();
      expect(result.data?.suggestion).toContain('From Recipesaurus: Vegetable Stir-Fry');
      expect(result.data?.suggestion).not.toContain('New idea: Vegetable Stir-Fry');
      expect(result.data?.mentionedRecipes).toContainEqual({
        id: publicRecipe.data?.id,
        title: 'Vegetable Stir-Fry',
      });

      const recipesAfterPlan = await client.recipes.list();
      expect(recipesAfterPlan.data?.recipes.find(recipe => recipe.title === 'Vegetable Stir-Fry')).toBeUndefined();

      const discoverRecipes = await client.discover.recipes({ limit: 20 });
      const matchingPublicRecipes = discoverRecipes.data?.recipes.filter(recipe => recipe.title === 'Vegetable Stir-Fry') || [];
      expect(matchingPublicRecipes).toHaveLength(1);
      expect(matchingPublicRecipes[0]).toMatchObject({
        id: publicRecipe.data?.id,
        ownerName: 'Community Chef',
        isPublic: true,
      });
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
      expect(result.code).toBe(MEAL_PLAN_INVALID_REQUEST_CODE);

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
    expect(instructions).toContain('public Recipesaurus recipes');
    expect(instructions).toContain('From Recipesaurus');
    expect(instructions).toContain('avoid breakfast, brunch, sweet, and dessert recipes');
    expect(instructions).toContain('fill the gaps with savory new ideas');
    expect(instructions).toContain('Do not use "New idea" for a recipe title that already appears exactly');
    expect(instructions).toContain('New idea: <specific recipe title>');
  });

  it('builds starter recipe drafts for new meal ideas only', () => {
    const drafts = buildMealPlanGeneratedRecipeDrafts(
      'Plan easy dinners.',
      [
        '1. From your recipes: Tofu Rice Bowl',
        '2. New idea: Vegetable Stir-Fry - fast vegetables and rice',
        '3. New idea: Tofu Rice Bowl - already saved',
      ].join('\n'),
      [{
        id: 'bowl',
        title: 'Tofu Rice Bowl',
        description: 'Saved bowl',
        ingredients: ['tofu', 'rice'],
        tags: ['dinner'],
      }]
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: 'Vegetable Stir-Fry',
      imageUrl: expect.stringContaining('images.unsplash.com'),
      prepTime: '15 minutes',
      cookTime: '25 minutes',
      servings: '4',
    });
    expect(drafts[0].ingredients).toContain('1/4 cup soy sauce or tamari');
    expect(drafts[0].instructions).toContain('Whisk soy sauce, rice vinegar, ginger, and 2 tbsp water in a small bowl.');
    expect(drafts[0].instructions).toContain('Serve over rice or noodles with scallions, sesame seeds, or chili crisp.');
    expect(drafts[0].tags.join(' ')).not.toMatch(/recipesaurus starter/i);
    expect(drafts[0].tags.every(tag => tag === tag.toLowerCase())).toBe(true);
    expect(drafts[0].description).not.toMatch(/ai meal planner/i);
    expect(drafts[0].instructions.join(' ')).not.toMatch(/ai meal planner/i);
  });

  it('uses cropped, unique images for starter recipes in the same meal plan', () => {
    const drafts = buildMealPlanGeneratedRecipeDrafts(
      'Plan easy healthy dinners.',
      [
        '1. New idea: Flexible Grain Bowl - vegetables, grains, and sauce',
        '2. New idea: Sheet-Pan Vegetable Dinner - roasted vegetables and protein',
        '3. New idea: Lentil Soup - cozy weeknight soup',
        '4. New idea: Pasta Primavera - fast pasta with vegetables',
      ].join('\n'),
      []
    );

    const imageUrls = drafts.map(draft => draft.imageUrl);
    expect(drafts).toHaveLength(4);
    expect(new Set(imageUrls).size).toBe(imageUrls.length);
    imageUrls.forEach(imageUrl => {
      expect(imageUrl).toContain('images.unsplash.com');
      expect(imageUrl).toContain('fit=crop');
      expect(imageUrl).toContain('w=900');
      expect(imageUrl).toContain('h=650');
    });
  });

  it('detects OpenAI responses that need continuation', () => {
    const incompleteResponse = {
      id: 'resp_123',
      status: 'incomplete',
      incomplete_details: {
        reason: 'max_output_tokens',
      },
    };

    expect(getOpenAIResponseId(incompleteResponse)).toBe('resp_123');
    expect(shouldContinueOpenAIResponse(incompleteResponse)).toBe(true);
    expect(shouldContinueOpenAIResponse({
      status: 'incomplete',
      incomplete_details: { reason: 'content_filter' },
    })).toBe(false);
    expect(buildMealPlannerContinuationInput('Plan dinners')).toContain('Continue the meal planning answer');
  });

  it('maps OpenAI insufficient quota failures to a Recipesaurus error code', () => {
    const errorBody = JSON.stringify({
      error: {
        message: 'You exceeded your current quota',
        type: 'insufficient_quota',
        code: 'insufficient_quota',
      },
    });

    expect(getMealPlanOpenAIErrorResponseCode(429, errorBody)).toBe(
      MEAL_PLAN_OPENAI_INSUFFICIENT_QUOTA_CODE
    );
  });

  it('maps other OpenAI meal planner failures to Recipesaurus error codes', () => {
    const errorBody = (code: string | null, message = 'OpenAI error', param?: string) => JSON.stringify({
      error: {
        code,
        message,
        param,
      },
    });

    expect(getMealPlanOpenAIErrorResponseCode(401, errorBody('invalid_api_key'))).toBe(
      MEAL_PLAN_OPENAI_AUTHENTICATION_FAILED_CODE
    );
    expect(getMealPlanOpenAIErrorResponseCode(403, errorBody('permission_denied'))).toBe(
      MEAL_PLAN_OPENAI_PERMISSION_DENIED_CODE
    );
    expect(getMealPlanOpenAIErrorResponseCode(429, errorBody('rate_limit_exceeded'))).toBe(
      MEAL_PLAN_OPENAI_RATE_LIMITED_CODE
    );
    expect(getMealPlanOpenAIErrorResponseCode(404, errorBody('model_not_found'))).toBe(
      MEAL_PLAN_OPENAI_MODEL_UNAVAILABLE_CODE
    );
    expect(getMealPlanOpenAIErrorResponseCode(400, errorBody(null, 'Invalid model', 'model'))).toBe(
      MEAL_PLAN_OPENAI_MODEL_UNAVAILABLE_CODE
    );
    expect(getMealPlanOpenAIErrorResponseCode(400, errorBody('invalid_request_error'))).toBe(
      MEAL_PLAN_OPENAI_BAD_REQUEST_CODE
    );
    expect(getMealPlanOpenAIErrorResponseCode(503, errorBody('server_error'))).toBe(
      MEAL_PLAN_OPENAI_SERVER_ERROR_CODE
    );
    expect(getMealPlanOpenAIErrorResponseCode(418, errorBody('unknown'))).toBeNull();
  });
});
