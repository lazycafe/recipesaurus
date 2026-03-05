import { useState } from 'react';
import { X, Loader2, Book, Image } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';
import { DinoMascot } from './DinoMascot';

interface CookbookModalProps {
  cookbook?: Cookbook;
  onClose: () => void;
  onSubmit: (name: string, description?: string, coverImage?: string) => Promise<void>;
}

export function CookbookModal({ cookbook, onClose, onSubmit }: CookbookModalProps) {
  const [name, setName] = useState(cookbook?.name || '');
  const [description, setDescription] = useState(cookbook?.description || '');
  const [coverImage, setCoverImage] = useState(cookbook?.coverImage || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!cookbook;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Cookbook name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSubmit(name.trim(), description.trim() || undefined, coverImage.trim() || undefined);
      onClose();
    } catch {
      setError('Failed to save cookbook. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-form cookbook-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} strokeWidth={2} />
        </button>

        <div className="modal-header">
          <Book size={28} strokeWidth={1.5} className="modal-icon" />
          <h2>{isEditing ? 'Edit Cookbook' : 'Create Cookbook'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {error && <div className="form-error">{error}</div>}

          <div className="cookbook-cover-preview">
            <div className="cookbook-book-preview">
              <div className="cookbook-spine-preview">
                <span>{name || 'Cookbook'}</span>
              </div>
              <div className="cookbook-cover-preview-inner">
                {coverImage ? (
                  <img src={coverImage} alt="Cover preview" />
                ) : (
                  <div className="cookbook-cover-preview-placeholder">
                    <DinoMascot size={40} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cookbook-name">Name</label>
            <input
              id="cookbook-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Favorite Recipes"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cookbook-description">Description (optional)</label>
            <textarea
              id="cookbook-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A collection of..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cookbook-cover">
              <Image size={16} strokeWidth={2} />
              Cover Image URL (optional)
            </label>
            <input
              id="cookbook-cover"
              type="url"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={isLoading}
            />
            <p className="form-hint">Add a photo to personalize your cookbook cover</p>
          </div>

          <button type="submit" className="btn-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Create Cookbook'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
