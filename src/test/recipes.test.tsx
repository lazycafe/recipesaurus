import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReactTestHarness } from './ReactTestHarness';
import { useClient } from '../client/ClientContext';
import { useState, useEffect } from 'react';
import type { Recipe } from '../client/types';

// Test component that displays recipes
function RecipeList() {
  const client = useClient();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.recipes.list().then(result => {
      setRecipes(result.data?.recipes || []);
      setLoading(false);
    });
  }, [client]);

  if (loading) return <div>Loading recipes...</div>;
  if (recipes.length === 0) return <div>No recipes found</div>;

  return (
    <ul>
      {recipes.map(recipe => (
        <li key={recipe.id} data-testid={`recipe-${recipe.id}`}>
          {recipe.title}
        </li>
      ))}
    </ul>
  );
}

// Test component for creating recipes
function CreateRecipeForm({ onCreated }: { onCreated: () => void }) {
  const client = useClient();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await client.recipes.create({
      title,
      description: 'Test description',
      ingredients: ['ingredient 1'],
      instructions: ['step 1'],
      tags: [],
    });

    if (result.error) {
      setError(result.error);
    } else {
      setTitle('');
      onCreated();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Recipe title"
        data-testid="recipe-title-input"
      />
      <button type="submit" data-testid="create-recipe-btn">Create</button>
      {error && <div data-testid="error">{error}</div>}
    </form>
  );
}

describe('Recipes with React components', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  describe('RecipeList', () => {
    it('should show unauthorized error when not logged in', async () => {
      const Wrapper = harness.getWrapper();

      render(
        <Wrapper>
          <RecipeList />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No recipes found')).toBeDefined();
      });
    });

    it('should show sample recipe when logged in', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      const Wrapper = harness.getWrapper();

      render(
        <Wrapper>
          <RecipeList />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Classic Pancakes')).toBeDefined();
      });
    });

    it('should show user-created recipes', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      await harness.seedRecipe({ title: 'My Custom Recipe' });
      const Wrapper = harness.getWrapper();

      render(
        <Wrapper>
          <RecipeList />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('My Custom Recipe')).toBeDefined();
      });
    });
  });

  describe('CreateRecipeForm', () => {
    it('should create a recipe when logged in', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      const Wrapper = harness.getWrapper();

      let recipesRefreshed = false;

      render(
        <Wrapper>
          <CreateRecipeForm onCreated={() => { recipesRefreshed = true; }} />
        </Wrapper>
      );

      const input = screen.getByTestId('recipe-title-input');
      const button = screen.getByTestId('create-recipe-btn');

      fireEvent.change(input, { target: { value: 'New Test Recipe' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(recipesRefreshed).toBe(true);
      });

      // Verify recipe was created
      const client = harness.getClient();
      const result = await client.recipes.list();
      expect(result.data?.recipes.some(r => r.title === 'New Test Recipe')).toBe(true);
    });

    it('should fail to create recipe when not logged in', async () => {
      const Wrapper = harness.getWrapper();

      render(
        <Wrapper>
          <CreateRecipeForm onCreated={() => {}} />
        </Wrapper>
      );

      const input = screen.getByTestId('recipe-title-input');
      const button = screen.getByTestId('create-recipe-btn');

      fireEvent.change(input, { target: { value: 'Should Fail' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeDefined();
        expect(screen.getByText('Unauthorized')).toBeDefined();
      });
    });
  });
});
