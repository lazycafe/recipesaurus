import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows "No recipes yet" when no filters', () => {
    render(
      <EmptyState
        hasFilters={false}
        onAddRecipe={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByText('No recipes yet')).toBeDefined();
    expect(screen.getByText('Start building your collection.')).toBeDefined();
    expect(screen.getByText('New Recipe')).toBeDefined();
  });

  it('shows "No matches found" when has filters', () => {
    render(
      <EmptyState
        hasFilters={true}
        onAddRecipe={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByText('No matches found')).toBeDefined();
    expect(screen.getByText('Try adjusting your search or filters')).toBeDefined();
    expect(screen.getByText('Clear Filters')).toBeDefined();
  });

  it('calls onAddRecipe when New Recipe clicked', () => {
    const onAddRecipe = vi.fn();
    render(
      <EmptyState
        hasFilters={false}
        onAddRecipe={onAddRecipe}
        onClearFilters={() => {}}
      />
    );

    fireEvent.click(screen.getByText('New Recipe'));
    expect(onAddRecipe).toHaveBeenCalledOnce();
  });

  it('calls onClearFilters when Clear Filters clicked', () => {
    const onClearFilters = vi.fn();
    render(
      <EmptyState
        hasFilters={true}
        onAddRecipe={() => {}}
        onClearFilters={onClearFilters}
      />
    );

    fireEvent.click(screen.getByText('Clear Filters'));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('renders DinoMascot', () => {
    const { container } = render(
      <EmptyState
        hasFilters={false}
        onAddRecipe={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(container.querySelector('svg')).toBeDefined();
  });
});
