import { useState, useRef } from 'react';
import { X, PenLine, Link, Plus, Loader2, Upload, Image } from 'lucide-react';
import { Recipe, RecipeFormData } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';

interface AddRecipeModalProps {
  recipe?: Recipe;
  onClose: () => void;
  onSubmit: (data: RecipeFormData) => void;
}

type TabType = 'manual' | 'url';

// Extract recipe data from HTML content
function extractRecipeFromHtml(html: string, url: string): Partial<RecipeFormData> {
  const result: Partial<RecipeFormData> = { sourceUrl: url };

  // Try to find JSON-LD schema.org Recipe data
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
        const data = JSON.parse(jsonContent);
        const recipes = Array.isArray(data) ? data : data['@graph'] || [data];
        for (const item of recipes) {
          if (item['@type'] === 'Recipe' || item['@type']?.includes('Recipe')) {
            result.title = item.name || '';
            result.description = item.description || '';
            if (item.recipeIngredient) {
              result.ingredients = Array.isArray(item.recipeIngredient)
                ? item.recipeIngredient.join('\n')
                : item.recipeIngredient;
            }
            if (item.recipeInstructions) {
              const instructions = item.recipeInstructions;
              if (Array.isArray(instructions)) {
                result.instructions = instructions
                  .map((i: { text?: string; '@type'?: string } | string) =>
                    typeof i === 'string' ? i : i.text || ''
                  )
                  .filter(Boolean)
                  .join('\n');
              } else if (typeof instructions === 'string') {
                result.instructions = instructions;
              }
            }
            if (item.prepTime) {
              result.prepTime = formatDuration(item.prepTime);
            }
            if (item.cookTime) {
              result.cookTime = formatDuration(item.cookTime);
            }
            if (item.recipeYield) {
              result.servings = Array.isArray(item.recipeYield)
                ? item.recipeYield[0]
                : String(item.recipeYield);
            }
            if (item.image) {
              result.imageUrl = Array.isArray(item.image)
                ? item.image[0]
                : typeof item.image === 'object'
                  ? item.image.url
                  : item.image;
            }
            break;
          }
        }
      } catch {
        // Continue to next match
      }
    }
  }

  // Fallback: try to extract title from meta tags or title element
  if (!result.title) {
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitle) {
      result.title = ogTitle[1];
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        result.title = titleMatch[1].trim();
      }
    }
  }

  // Fallback: try to extract description from meta tags
  if (!result.description) {
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (ogDesc) {
      result.description = ogDesc[1];
    } else {
      const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      if (metaDesc) {
        result.description = metaDesc[1];
      }
    }
  }

  // Fallback: try to extract image from meta tags
  if (!result.imageUrl) {
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImage) {
      result.imageUrl = ogImage[1];
    }
  }

  return result;
}

// Convert ISO 8601 duration to human-readable format
function formatDuration(duration: string): string {
  if (!duration || !duration.startsWith('PT')) return duration;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const parts = [];
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  return parts.join(' ') || duration;
}

export function AddRecipeModal({ recipe, onClose, onSubmit }: AddRecipeModalProps) {
  const isEditing = !!recipe;
  const [activeTab, setActiveTab] = useState<TabType>('url');
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
  });
  const [importError, setImportError] = useState<string | null>(null);

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
    setImportError(null);
    try {
      // Fetch the URL content via our proxy endpoint
      const apiUrl = import.meta.env.VITE_API_URL || 'https://recipesaurus-api.andreay226.workers.dev';
      const response = await fetch(`${apiUrl}/api/proxy-fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch URL' }));
        throw new Error(error.error || 'Failed to fetch recipe');
      }

      const { html } = await response.json();
      const extracted = extractRecipeFromHtml(html, url.trim());

      // Pre-fill the form with extracted data
      setFormData(prev => ({
        ...prev,
        title: extracted.title || prev.title,
        description: extracted.description || prev.description,
        ingredients: extracted.ingredients || prev.ingredients,
        instructions: extracted.instructions || prev.instructions,
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
              />
              {importError && (
                <p className="form-error">{importError}</p>
              )}
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
        ) : null}
      </div>
    </div>
  );
}
