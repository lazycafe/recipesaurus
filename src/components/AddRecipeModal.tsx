import { useState, useRef } from 'react';
import { X, PenLine, Link, Plus, Loader2, Upload, Image } from 'lucide-react';
import { RecipeFormData } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';

interface AddRecipeModalProps {
  onClose: () => void;
  onSubmit: (data: RecipeFormData) => void;
  onUrlSubmit: (url: string) => void;
}

type TabType = 'manual' | 'url';

export function AddRecipeModal({ onClose, onSubmit, onUrlSubmit }: AddRecipeModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<RecipeFormData>({
    title: '',
    description: '',
    ingredients: '',
    instructions: '',
    tags: '',
    imageUrl: '',
    prepTime: '',
    cookTime: '',
    servings: '',
  });

  const handleInputChange = (field: keyof RecipeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        handleInputChange('imageUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    handleInputChange('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter a recipe title');
      return;
    }
    if (!formData.ingredients.trim()) {
      alert('Please enter at least one ingredient');
      return;
    }
    if (!formData.instructions.trim()) {
      alert('Please enter at least one instruction');
      return;
    }
    onSubmit(formData);
    onClose();
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      alert('Please enter a URL');
      return;
    }
    setIsLoading(true);
    try {
      onUrlSubmit(url);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedTags = [
    'breakfast', 'lunch', 'dinner', 'dessert',
    'vegetarian', 'vegan', 'gluten-free',
    'quick', 'healthy'
  ];

  const addSuggestedTag = (tag: string) => {
    const currentTags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag].join(', ');
      handleInputChange('tags', newTags);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-form" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={2} />
        </button>

        <div className="modal-header">
          <DinoMascot size={40} className="modal-icon" />
          <h2>Add Recipe</h2>
        </div>

        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <PenLine size={16} strokeWidth={2} />
            <span>Manual</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            <Link size={16} strokeWidth={2} />
            <span>From URL</span>
          </button>
        </div>

        {activeTab === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                placeholder="Recipe name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="Brief description"
                rows={2}
              />
            </div>

            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="prepTime">Prep Time</label>
                <input
                  type="text"
                  id="prepTime"
                  value={formData.prepTime}
                  onChange={e => handleInputChange('prepTime', e.target.value)}
                  placeholder="15 mins"
                />
              </div>
              <div className="form-group">
                <label htmlFor="cookTime">Cook Time</label>
                <input
                  type="text"
                  id="cookTime"
                  value={formData.cookTime}
                  onChange={e => handleInputChange('cookTime', e.target.value)}
                  placeholder="30 mins"
                />
              </div>
              <div className="form-group">
                <label htmlFor="servings">Servings</label>
                <input
                  type="text"
                  id="servings"
                  value={formData.servings}
                  onChange={e => handleInputChange('servings', e.target.value)}
                  placeholder="4"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ingredients">Ingredients</label>
              <textarea
                id="ingredients"
                value={formData.ingredients}
                onChange={e => handleInputChange('ingredients', e.target.value)}
                placeholder="One ingredient per line"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="instructions">Instructions</label>
              <textarea
                id="instructions"
                value={formData.instructions}
                onChange={e => handleInputChange('instructions', e.target.value)}
                placeholder="One step per line"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags</label>
              <input
                type="text"
                id="tags"
                value={formData.tags}
                onChange={e => handleInputChange('tags', e.target.value)}
                placeholder="Comma separated"
              />
              <div className="suggested-tags">
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className="suggested-tag"
                    onClick={() => addSuggestedTag(tag)}
                  >
                    <Plus size={12} strokeWidth={2.5} />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input-hidden"
                id="image-upload"
              />

              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
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
                <label htmlFor="image-upload" className="image-upload-area">
                  <Upload size={24} strokeWidth={1.5} />
                  <span>Click to upload image</span>
                  <span className="upload-hint">PNG, JPG up to 5MB</span>
                </label>
              )}
            </div>

            <button type="submit" className="btn-submit">
              Save Recipe
            </button>
          </form>
        ) : (
          <form onSubmit={handleUrlSubmit} className="form">
            <div className="url-notice">
              <Image size={20} strokeWidth={1.5} />
              <div>
                <p>Import a recipe from any URL.</p>
                <p className="notice-subtle">We'll extract the details automatically.</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="url">Recipe URL</label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/recipe"
              />
            </div>

            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={18} strokeWidth={2} className="spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Import Recipe</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
