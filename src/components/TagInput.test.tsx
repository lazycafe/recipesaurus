import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagInput } from './TagInput';

describe('TagInput', () => {
  it('renders with placeholder when no tags', () => {
    render(<TagInput tags={[]} onChange={() => {}} placeholder="Add tags..." />);
    expect(screen.getByPlaceholderText('Add tags...')).toBeDefined();
  });

  it('renders existing tags as chips', () => {
    render(<TagInput tags={['breakfast', 'healthy']} onChange={() => {}} />);
    expect(screen.getByText('breakfast')).toBeDefined();
    expect(screen.getByText('healthy')).toBeDefined();
  });

  it('adds tag on Enter key', () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'dinner' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['dinner']);
  });

  it('adds tag on comma', () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'lunch,' } });

    expect(onChange).toHaveBeenCalledWith(['lunch']);
  });

  it('removes tag when chip remove button clicked', () => {
    const onChange = vi.fn();
    render(<TagInput tags={['breakfast', 'healthy']} onChange={onChange} />);

    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(['healthy']);
  });

  it('removes last tag on Backspace when input is empty', () => {
    const onChange = vi.fn();
    render(<TagInput tags={['breakfast', 'healthy']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['breakfast']);
  });

  it('does not add duplicate tags', () => {
    const onChange = vi.fn();
    render(<TagInput tags={['breakfast']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'breakfast' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('normalizes tags to lowercase', () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'DINNER' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['dinner']);
  });

  it('renders suggested tags', () => {
    render(
      <TagInput
        tags={[]}
        onChange={() => {}}
        suggestedTags={['breakfast', 'lunch']}
      />
    );

    expect(screen.getByText('breakfast')).toBeDefined();
    expect(screen.getByText('lunch')).toBeDefined();
  });

  it('adds tag when suggestion clicked', () => {
    const onChange = vi.fn();
    render(
      <TagInput
        tags={[]}
        onChange={onChange}
        suggestedTags={['breakfast', 'lunch']}
      />
    );

    fireEvent.click(screen.getByText('breakfast'));
    expect(onChange).toHaveBeenCalledWith(['breakfast']);
  });

  it('hides already selected tags from suggestions', () => {
    render(
      <TagInput
        tags={['breakfast']}
        onChange={() => {}}
        suggestedTags={['breakfast', 'lunch']}
      />
    );

    // breakfast appears as chip, not as suggestion
    const breakfastElements = screen.getAllByText('breakfast');
    expect(breakfastElements.length).toBe(1); // Only the chip
    expect(screen.getByText('lunch')).toBeDefined(); // Still suggested
  });

  it('disables input when disabled prop is true', () => {
    render(<TagInput tags={['test']} onChange={() => {}} disabled />);

    const input = screen.getByRole('textbox');
    expect(input.hasAttribute('disabled')).toBe(true);
  });

  it('does not show remove buttons when disabled', () => {
    render(<TagInput tags={['test']} onChange={() => {}} disabled />);

    const removeButtons = screen.queryAllByRole('button', { name: /Remove/i });
    expect(removeButtons.length).toBe(0);
  });
});
