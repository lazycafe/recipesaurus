import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModalOverlay } from './ModalOverlay';

describe('ModalOverlay', () => {
  it('renders children', () => {
    render(
      <ModalOverlay onClose={vi.fn()}>
        <div>Test Content</div>
      </ModalOverlay>
    );
    expect(screen.getByText('Test Content')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ModalOverlay onClose={vi.fn()} className="custom-class">
        <div>Content</div>
      </ModalOverlay>
    );
    expect(container.querySelector('.modal-overlay.custom-class')).toBeDefined();
  });

  it('closes on mousedown + mouseup on overlay', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalOverlay onClose={onClose}>
        <div>Content</div>
      </ModalOverlay>
    );

    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when mousedown inside and mouseup outside', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalOverlay onClose={onClose}>
        <div data-testid="inner">Content</div>
      </ModalOverlay>
    );

    const inner = screen.getByTestId('inner');
    const overlay = container.querySelector('.modal-overlay')!;

    fireEvent.mouseDown(inner);
    fireEvent.mouseUp(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when mousedown outside and mouseup inside', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalOverlay onClose={onClose}>
        <div data-testid="inner">Content</div>
      </ModalOverlay>
    );

    const inner = screen.getByTestId('inner');
    const overlay = container.querySelector('.modal-overlay')!;

    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(inner);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(
      <ModalOverlay onClose={onClose}>
        <div>Content</div>
      </ModalOverlay>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close on other keys', () => {
    const onClose = vi.fn();
    render(
      <ModalOverlay onClose={onClose}>
        <div>Content</div>
      </ModalOverlay>
    );

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
