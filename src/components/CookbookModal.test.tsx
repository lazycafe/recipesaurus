import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CookbookModal } from './CookbookModal';
import type { Cookbook } from '../types/Cookbook';
import { fileToCompressedDataUrl } from '../utils/imageUpload';

vi.mock('../utils/imageUpload', () => ({
  COOKBOOK_COVER_IMAGE_OPTIONS: {
    maxFileSizeBytes: 5 * 1024 * 1024,
    maxDataUrlLength: 750_000,
    maxWidth: 900,
    maxHeight: 900,
    quality: 0.82,
  },
  fileToCompressedDataUrl: vi.fn(),
}));

describe('CookbookModal', () => {
  const coverImage = 'data:image/jpeg;base64,compressed-cover';
  const cookbook: Cookbook = {
    id: 'cookbook-1',
    name: 'Family Dinners',
    description: 'Weeknight favorites',
    coverImage: 'data:image/jpeg;base64,existing-cover',
    recipeCount: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isOwner: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileToCompressedDataUrl).mockResolvedValue(coverImage);
  });

  it('submits the prepared cover image after upload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <CookbookModal onSubmit={onSubmit} onClose={onClose} />
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Dinner Binder' },
    });

    const input = document.querySelector('#cookbook-cover-upload') as HTMLInputElement;
    const file = new File(['image-bytes'], 'cover.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(fileToCompressedDataUrl).toHaveBeenCalledWith(file, expect.any(Object));
    });

    const form = screen.getByRole('button', { name: 'Create Cookbook' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Dinner Binder',
        description: undefined,
        coverImage,
        isPublic: false,
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not submit while the selected cover image is still processing', async () => {
    let finishUpload: (value: string) => void = () => {};
    vi.mocked(fileToCompressedDataUrl).mockReturnValue(
      new Promise(resolve => {
        finishUpload = resolve;
      })
    );
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CookbookModal onSubmit={onSubmit} onClose={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Dinner Binder' },
    });
    const input = document.querySelector('#cookbook-cover-upload') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(['image-bytes'], 'cover.png', { type: 'image/png' })],
      },
    });

    const preparingButton = await screen.findByRole('button', { name: 'Preparing image...' });
    expect((preparingButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(preparingButton.closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();

    finishUpload(coverImage);
    await screen.findByRole('button', { name: 'Create Cookbook' });
  });

  it('submits null when an existing cover image is removed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CookbookModal cookbook={cookbook} onSubmit={onSubmit} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByLabelText('Remove image'));
    const form = screen.getByRole('button', { name: 'Save Changes' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Family Dinners',
        description: 'Weeknight favorites',
        coverImage: null,
        isPublic: false,
      });
    });
  });

  it('shows an error instead of closing when save fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Failed to save cookbook. Please try again.'));
    const onClose = vi.fn();
    render(<CookbookModal onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Dinner Binder' },
    });
    const form = screen.getByRole('button', { name: 'Create Cookbook' }).closest('form')!;
    fireEvent.submit(form);

    expect(await screen.findByText('Failed to save cookbook. Please try again.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });
});
