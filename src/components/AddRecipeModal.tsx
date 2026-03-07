import { useState, useRef } from 'react';
import { X, PenLine, Link, Loader2, Upload, Image, Sparkles } from 'lucide-react';
import { Recipe, RecipeFormData } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';
import { ModalOverlay } from './ModalOverlay';
import { ConfirmModal } from './ConfirmModal';
import { TagInput } from './TagInput';
import { VisibilityToggle } from './VisibilityToggle';
import { fetchAndExtractRecipe } from '../utils/recipeExtractor';

interface AddRecipeModalProps {
  recipe?: Recipe;
  onClose: () => void;
  onSubmit: (data: RecipeFormData) => void;
}

type TabType = 'manual' | 'url';

export function AddRecipeModal({ recipe, onClose, onSubmit }: AddRecipeModalProps) {
  const isEditing = !!recipe;
  const [activeTab, setActiveTab] = useState<TabType>(isEditing ? 'manual' : 'url');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(recipe?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<RecipeFormData>({
    title: recipe?.title || '',
    description: recipe?.description || '',
    ingredients: recipe?.ingredients.join('\n') || '',
    instructions: recipe?.instructions.join('\n') || '',
    tags: recipe?.tags.join(', ') || '',
    imageUrl: recipe?.imageUrl || '',
    prepTime: recipe?.prepTime || '',
    cookTime: recipe?.cookTime || '',
    servings: recipe?.servings || '',
    sourceUrl: recipe?.sourceUrl || '',
    isPublic: recipe?.isPublic || false,
  });
  const [importError, setImportError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Check if form has unsaved changes
  const hasChanges =
    url !== '' ||
    formData.title !== (recipe?.title || '') ||
    formData.description !== (recipe?.description || '') ||
    formData.ingredients !== (recipe?.ingredients.join('\n') || '') ||
    formData.instructions !== (recipe?.instructions.join('\n') || '') ||
    formData.tags !== (recipe?.tags.join(', ') || '') ||
    formData.imageUrl !== (recipe?.imageUrl || '') ||
    formData.prepTime !== (recipe?.prepTime || '') ||
    formData.cookTime !== (recipe?.cookTime || '') ||
    formData.servings !== (recipe?.servings || '') ||
    formData.sourceUrl !== (recipe?.sourceUrl || '') ||
    formData.isPublic !== (recipe?.isPublic || false);

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleInputChange = (field: keyof RecipeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image must be less than 5MB');
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
      setFormError('Please enter a recipe title');
      return;
    }
    if (!formData.ingredients.trim()) {
      setFormError('Please enter at least one ingredient');
      return;
    }
    if (!formData.instructions.trim()) {
      setFormError('Please enter at least one instruction');
      return;
    }
    onSubmit(formData);
    onClose();
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setImportError('Please enter a URL');
      return;
    }
    setIsLoading(true);
    setImportError(null);
    try {
      const extracted = await fetchAndExtractRecipe(url.trim());

      // Pre-fill the form with extracted data (convert arrays to newline-separated strings)
      setFormData(prev => ({
        ...prev,
        title: extracted.title || prev.title,
        description: extracted.description || prev.description,
        ingredients: extracted.ingredients?.join('\n') || prev.ingredients,
        instructions: extracted.instructions?.join('\n') || prev.instructions,
        imageUrl: extracted.imageUrl || prev.imageUrl,
        prepTime: extracted.prepTime || prev.prepTime,
        cookTime: extracted.cookTime || prev.cookTime,
        servings: extracted.servings || prev.servings,
        sourceUrl: extracted.sourceUrl || url.trim(),
      }));

      // Show extracted image in preview
      if (extracted.imageUrl) {
        setImagePreview(extracted.imageUrl);
      }

      // Switch to manual tab for user to review/edit
      setActiveTab('manual');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedTags = [
    'breakfast', 'lunch', 'dinner', 'dessert',
    'vegetarian', 'vegan', 'gluten-free',
    'quick', 'healthy', 'appetizer', 'soup',
    'salad', 'side-dish', 'snack', 'beverage'
  ];

  // Convert comma-separated string to array
  const tagsArray = formData.tags
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  const handleTagsChange = (newTags: string[]) => {
    handleInputChange('tags', newTags.join(', '));
  };

  return (
    <ModalOverlay onClose={handleClose}>
      <div className="modal-content modal-form">
        <button className="modal-close" onClick={handleClose} aria-label="Close">
          <X size={20} strokeWidth={2} />
        </button>

        <div className="modal-header">
          <DinoMascot size={40} className="modal-icon" />
          <h2>{isEditing ? 'Edit Recipe' : 'Add Recipe'}</h2>
        </div>

        {!isEditing && (
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
        )}

        {activeTab === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="form">
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                placeholder="Recipe name"
                autoFocus
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
              <label>Tags</label>
              <TagInput
                tags={tagsArray}
                onChange={handleTagsChange}
                suggestedTags={suggestedTags}
                placeholder="Type and press Enter to add..."
                disabled={isLoading}
              />
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

            <div className="form-group visibility-section">
              <label>Visibility</label>
              <div className="visibility-control">
                <VisibilityToggle
                  isPublic={formData.isPublic}
                  onChange={(isPublic) => setFormData(prev => ({ ...prev, isPublic }))}
                />
                <p className="visibility-hint">
                  {formData.isPublic
                    ? 'This recipe will be visible in Discover and can be saved by others.'
                    : 'Only you can see this recipe.'}
                </p>
              </div>
            </div>

            <button type="submit" className="btn-submit">
              {isEditing ? 'Update Recipe' : 'Save Recipe'}
            </button>
          </form>
        ) : !isEditing ? (
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
                autoFocus
              />
              {importError && (
                <p className="form-error">{importError}</p>
              )}
            </div>

            <button type="submit" className="btn-submit extract-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={18} strokeWidth={2} className="spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Extract Recipe</span>
                </>
              )}
            </button>
          </form>
        ) : null}

        {showDiscardConfirm && (
          <ConfirmModal
            title="Discard Changes"
            message="You have unsaved changes. Are you sure you want to discard them?"
            confirmText="Discard"
            onConfirm={() => {
              setShowDiscardConfirm(false);
              onClose();
            }}
            onCancel={() => setShowDiscardConfirm(false)}
          />
        )}
      </div>
    </ModalOverlay>
  );
}
