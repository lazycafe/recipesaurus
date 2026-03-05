import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CookbookCard } from './CookbookCard';
import type { Cookbook } from '../types/Cookbook';

describe('CookbookCard', () => {
  const mockCookbook: Cookbook = {
    id: '1',
    name: 'My Cookbook',
    description: 'A collection of favorites',
    recipeCount: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isOwner: true,
  };

  it('renders cookbook name', () => {
    render(<CookbookCard cookbook={mockCookbook} onClick={() => {}} />);
    // Name appears in spine and cover
    expect(screen.getAllByText('My Cookbook').length).toBeGreaterThan(0);
  });

  it('renders description when provided', () => {
    render(<CookbookCard cookbook={mockCookbook} onClick={() => {}} />);
    expect(screen.getByText('A collection of favorites')).toBeDefined();
  });

  it('renders recipe count with correct pluralization', () => {
    render(<CookbookCard cookbook={mockCookbook} onClick={() => {}} />);
    expect(screen.getByText('5 recipes')).toBeDefined();
  });

  it('renders singular "recipe" for count of 1', () => {
    const singleRecipe = { ...mockCookbook, recipeCount: 1 };
    render(<CookbookCard cookbook={singleRecipe} onClick={() => {}} />);
    expect(screen.getByText('1 recipe')).toBeDefined();
  });

  it('calls onClick when card clicked', () => {
    const onClick = vi.fn();
    render(<CookbookCard cookbook={mockCookbook} onClick={onClick} />);

    fireEvent.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows owner name for shared cookbooks', () => {
    const sharedCookbook: Cookbook = {
      ...mockCookbook,
      isOwner: false,
      ownerName: 'Jane Doe',
    };
    render(<CookbookCard cookbook={sharedCookbook} onClick={() => {}} />);

    expect(screen.getByText('Jane Doe')).toBeDefined();
  });

  it('hides owner name for owned cookbooks', () => {
    const ownedWithOwnerName = { ...mockCookbook, ownerName: 'Self' };
    render(<CookbookCard cookbook={ownedWithOwnerName} onClick={() => {}} />);

    expect(screen.queryByText('Self')).toBeNull();
  });

  it('renders cover image when provided', () => {
    const withImage = { ...mockCookbook, coverImage: 'https://example.com/cover.jpg' };
    render(<CookbookCard cookbook={withImage} onClick={() => {}} />);

    const img = screen.getByAltText('My Cookbook');
    expect(img.getAttribute('src')).toBe('https://example.com/cover.jpg');
  });

  it('renders placeholder when no cover image', () => {
    const { container } = render(
      <CookbookCard cookbook={mockCookbook} onClick={() => {}} />
    );

    expect(container.querySelector('.cookbook-cover-placeholder')).toBeDefined();
  });
});
