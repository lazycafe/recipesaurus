import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublicHomePage } from './PublicHomePage';

// Mock HTML with JSON-LD recipe data
const mockHtmlWithRecipe = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Recipe</title>
  <script type="application/ld+json">
  {
    "@type": "Recipe",
    "name": "Test Recipe",
    "description": "A test recipe description",
    "recipeIngredient": ["1 cup flour", "2 eggs"],
    "recipeInstructions": [{"text": "Mix ingredients"}, {"text": "Bake"}],
    "prepTime": "PT15M",
    "cookTime": "PT30M",
    "recipeYield": "4 servings"
  }
  </script>
</head>
<body></body>
</html>
`;

describe('PublicHomePage', () => {
  const mockOnSignUp = vi.fn();
  const mockOnSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for recipe extraction
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html: mockHtmlWithRecipe }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders hero section with title', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    expect(screen.getByText('Save Recipes from Anywhere')).toBeDefined();
  });

  it('renders URL input', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    expect(screen.getByPlaceholderText('Paste a recipe URL...')).toBeDefined();
  });

  it('renders extract button', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    expect(screen.getByText('Extract')).toBeDefined();
  });

  it('renders features section', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    expect(screen.getByText('Why Recipesaurus?')).toBeDefined();
    expect(screen.getByText('Extract from Any URL')).toBeDefined();
    expect(screen.getByText('Organize in Cookbooks')).toBeDefined();
    expect(screen.getByText('Share with Friends')).toBeDefined();
    expect(screen.getByText('Discover New Recipes')).toBeDefined();
  });

  it('renders CTA section', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    expect(screen.getByText('Ready to organize your recipes?')).toBeDefined();
  });

  it('renders Get Started Free buttons', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    const getStartedButtons = screen.getAllByText('Get Started Free');
    expect(getStartedButtons.length).toBeGreaterThan(0);
  });

  it('calls onSignUp when Get Started Free clicked', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    const getStartedButtons = screen.getAllByText('Get Started Free');
    fireEvent.click(getStartedButtons[0]);
    expect(mockOnSignUp).toHaveBeenCalledTimes(1);
  });

  it('calls onSignIn when Sign In clicked', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    const signInButtons = screen.getAllByText('Sign In');
    fireEvent.click(signInButtons[0]);
    expect(mockOnSignIn).toHaveBeenCalledTimes(1);
  });

  it('disables extract button when URL is empty', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);
    const extractButton = screen.getByText('Extract').closest('button');
    expect(extractButton?.disabled).toBe(true);
  });

  it('enables extract button when URL is entered', () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);

    const input = screen.getByPlaceholderText('Paste a recipe URL...');
    fireEvent.change(input, { target: { value: 'https://example.com/recipe' } });

    const extractButton = screen.getByText('Extract').closest('button');
    expect(extractButton?.disabled).toBe(false);
  });

  it('shows loading state when extracting', async () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);

    const input = screen.getByPlaceholderText('Paste a recipe URL...');
    fireEvent.change(input, { target: { value: 'https://example.com/recipe' } });

    const form = screen.getByPlaceholderText('Paste a recipe URL...').closest('form')!;
    fireEvent.submit(form);

    // Should show loading state
    expect(screen.queryByText('Extract')).toBeNull();
  });

  it('shows extracted recipe after extraction', async () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);

    const input = screen.getByPlaceholderText('Paste a recipe URL...');
    fireEvent.change(input, { target: { value: 'https://example.com/recipe' } });

    const form = screen.getByPlaceholderText('Paste a recipe URL...').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeDefined();
    }, { timeout: 3000 });
  });

  it('shows Download and Share buttons after extraction', async () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);

    const input = screen.getByPlaceholderText('Paste a recipe URL...');
    fireEvent.change(input, { target: { value: 'https://example.com/recipe' } });

    const form = screen.getByPlaceholderText('Paste a recipe URL...').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Download')).toBeDefined();
      expect(screen.getByText('Share Link')).toBeDefined();
    }, { timeout: 3000 });
  });

  it('shows Save to Collection button after extraction', async () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);

    const input = screen.getByPlaceholderText('Paste a recipe URL...');
    fireEvent.change(input, { target: { value: 'https://example.com/recipe' } });

    const form = screen.getByPlaceholderText('Paste a recipe URL...').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Save to Collection')).toBeDefined();
    }, { timeout: 3000 });
  });

  it('calls onSignUp when Save to Collection clicked', async () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);

    const input = screen.getByPlaceholderText('Paste a recipe URL...');
    fireEvent.change(input, { target: { value: 'https://example.com/recipe' } });

    const form = screen.getByPlaceholderText('Paste a recipe URL...').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Save to Collection')).toBeDefined();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Save to Collection'));
    expect(mockOnSignUp).toHaveBeenCalledTimes(1);
  });

  it('shows signup prompt after extraction', async () => {
    render(<PublicHomePage onSignUp={mockOnSignUp} onSignIn={mockOnSignIn} />);

    const input = screen.getByPlaceholderText('Paste a recipe URL...');
    fireEvent.change(input, { target: { value: 'https://example.com/recipe' } });

    const form = screen.getByPlaceholderText('Paste a recipe URL...').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Want to save this recipe?')).toBeDefined();
    }, { timeout: 3000 });
  });
});
