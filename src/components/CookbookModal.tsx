import { useState, useRef } from 'react';
import { X, Loader2, Book, Upload } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';
import { DinoMascot } from './DinoMascot';
import { ModalOverlay } from './ModalOverlay';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCoverImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    <ModalOverlay onClose={onClose}>
      <div className="modal-content modal-form cookbook-modal">
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
            <label>Cover Image (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input-hidden"
              id="cookbook-cover-upload"
              disabled={isLoading}
            />

            {coverImage ? (
              <div className="image-preview">
                <img src={coverImage} alt="Cover preview" />
                <button
                  type="button"
                  className="image-remove"
                  onClick={handleRemoveImage}
                  aria-label="Remove image"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <label htmlFor="cookbook-cover-upload" className="image-upload-area">
                <Upload size={24} strokeWidth={1.5} />
                <span>Click to upload image</span>
                <span className="upload-hint">PNG, JPG up to 5MB</span>
              </label>
            )}
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
    </ModalOverlay>
  );
}
