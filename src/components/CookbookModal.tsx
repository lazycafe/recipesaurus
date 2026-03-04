import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';

interface CookbookModalProps {
  cookbook?: Cookbook;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => Promise<void>;
}

export function CookbookModal({ cookbook, onClose, onSubmit }: CookbookModalProps) {
  const [name, setName] = useState(cookbook?.name || '');
  const [description, setDescription] = useState(cookbook?.description || '');
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
      await onSubmit(name.trim(), description.trim() || undefined);
      onClose();
    } catch {
      setError('Failed to save cookbook. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} strokeWidth={2} />
        </button>

        <h2>{isEditing ? 'Edit Cookbook' : 'Create Cookbook'}</h2>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

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
              rows={3}
              disabled={isLoading}
            />
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
