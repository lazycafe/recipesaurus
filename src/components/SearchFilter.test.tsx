import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchFilter } from './SearchFilter';

describe('SearchFilter', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    selectedTags: [] as string[],
    onTagToggle: vi.fn(),
    allTags: [] as string[],
    onClearFilters: vi.fn(),
  };

  it('renders search input', () => {
    render(<SearchFilter {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search recipes...')).toBeDefined();
  });

  it('calls onSearchChange when typing', () => {
    const onSearchChange = vi.fn();
    render(<SearchFilter {...defaultProps} onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText('Search recipes...');
    fireEvent.change(input, { target: { value: 'pasta' } });

    expect(onSearchChange).toHaveBeenCalledWith('pasta');
  });

  it('shows clear button when has search query', () => {
    render(<SearchFilter {...defaultProps} searchQuery="test" />);
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('shows clear button when has selected tags', () => {
    render(<SearchFilter {...defaultProps} selectedTags={['dinner']} />);
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('hides clear button when no filters', () => {
    render(<SearchFilter {...defaultProps} />);
    expect(screen.queryByText('Clear')).toBeNull();
  });

  it('calls onClearFilters when clear clicked', () => {
    const onClearFilters = vi.fn();
    render(
      <SearchFilter
        {...defaultProps}
        searchQuery="test"
        onClearFilters={onClearFilters}
      />
    );

    fireEvent.click(screen.getByText('Clear'));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('renders tag buttons when allTags provided', () => {
    render(
      <SearchFilter
        {...defaultProps}
        allTags={['breakfast', 'dinner', 'dessert']}
      />
    );

    expect(screen.getByText('breakfast')).toBeDefined();
    expect(screen.getByText('dinner')).toBeDefined();
    expect(screen.getByText('dessert')).toBeDefined();
  });

  it('calls onTagToggle when tag clicked', () => {
    const onTagToggle = vi.fn();
    render(
      <SearchFilter
        {...defaultProps}
        allTags={['breakfast', 'dinner']}
        onTagToggle={onTagToggle}
      />
    );

    fireEvent.click(screen.getByText('breakfast'));
    expect(onTagToggle).toHaveBeenCalledWith('breakfast');
  });

  it('shows check icon on selected tags', () => {
    const { container } = render(
      <SearchFilter
        {...defaultProps}
        allTags={['breakfast', 'dinner']}
        selectedTags={['breakfast']}
      />
    );

    const breakfastBtn = screen.getByText('breakfast').closest('button');
    expect(breakfastBtn?.classList.contains('active')).toBe(true);
  });

  it('hides tags section when no tags', () => {
    const { container } = render(<SearchFilter {...defaultProps} allTags={[]} />);
    expect(container.querySelector('.filter-tags')).toBeNull();
  });
});
