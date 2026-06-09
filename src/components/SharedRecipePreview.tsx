import { useState, useEffect } from 'react';
import { Clock, Users, ExternalLink, ChefHat, Download, Loader2, Heart } from 'lucide-react';
import { DinoMascot } from './DinoMascot';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { downloadRecipePdf } from '../utils/recipePdf';
import { useOptionalClient } from '../client/ClientContext';
import { useOptionalToast } from '../context/ToastContext';

interface PreviewRecipe {
  title: string;
  description?: string | null;
  ingredients: string[];
  instructions: string[];
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
}

interface SharedRecipePreviewProps {
  encodedData?: string;
  shareToken?: string;
  isLoggedIn?: boolean;
  isAuthLoading?: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function SharedRecipePreview({
  encodedData,
  shareToken,
  isLoggedIn = false,
  isAuthLoading = false,
  onSignUp,
}: SharedRecipePreviewProps) {
  const [recipe, setRecipe] = useState<PreviewRecipe | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const client = useOptionalClient();
  const showToast = useOptionalToast()?.showToast ?? null;

  useEffect(() => {
    let cancelled = false;

    const loadRecipe = async () => {
      setIsLoading(true);
      setError(false);

      try {
        if (shareToken) {
          if (!client) {
            throw new Error('Recipe sharing client is unavailable');
          }
          const result = await client.recipes.getShared(shareToken);
          if (!result.data) {
            throw new Error(result.error || 'Share link not found');
          }
          if (!cancelled) {
            setRecipe(result.data.recipe);
          }
        } else if (encodedData) {
          const decompressed = decompressFromEncodedURIComponent(encodedData);
          if (!decompressed) {
            throw new Error('Invalid preview data');
          }
          const data = JSON.parse(decompressed);
          if (!cancelled) {
            setRecipe(data);
          }
        } else {
          throw new Error('Missing preview data');
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setRecipe(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadRecipe();

    return () => {
      cancelled = true;
    };
  }, [encodedData, shareToken, client]);

  // Check for pending save after login
  useEffect(() => {
    if (!isAuthLoading && isLoggedIn && recipe && client) {
      const pendingRecipe = sessionStorage.getItem('pendingSaveRecipe');
      if (pendingRecipe) {
        sessionStorage.removeItem('pendingSaveRecipe');
        handleSaveRecipe();
      }
    }
  }, [isAuthLoading, isLoggedIn, recipe, client]);

  const handleSaveRecipe = async () => {
    if (!recipe) return;

    setSaveError('');

    if (isAuthLoading) {
      return;
    }

    if (!isLoggedIn) {
      // Store pending action and show auth modal
      sessionStorage.setItem('pendingSaveRecipe', JSON.stringify(recipe));
      onSignUp?.();
      return;
    }

    if (!client) {
      setSaveError('Unable to save recipe right now. Please try again.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await client.recipes.saveFromPreview({
        title: recipe.title,
        description: recipe.description || '',
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime || undefined,
        cookTime: recipe.cookTime || undefined,
        servings: recipe.servings || undefined,
        imageUrl: recipe.imageUrl || undefined,
        sourceUrl: recipe.sourceUrl || '',
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setHasSaved(true);
      showToast?.({
        message: 'Saved to My Recipe Collection',
        type: 'success',
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = '/cookbooks';
          },
        },
      });
    } catch (err) {
      console.error('Failed to save recipe:', err);
      const message = err instanceof Error ? err.message : 'Failed to save recipe. Please try again.';
      setSaveError(message);
      showToast?.({
        message,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!recipe) return;
    downloadRecipePdf(recipe);
  };

  if (isLoading) {
    return (
      <div className="shared-view shared-error">
        <Loader2 size={40} className="spin" />
        <h1>Loading Recipe</h1>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="shared-view shared-error">
        <DinoMascot size={120} />
        <h1>Recipe Not Found</h1>
        <p>This preview link may be invalid or expired.</p>
        <a href="/" className="btn-primary">Go to Recipesaurus</a>
      </div>
    );
  }

  return (
    <div className="shared-view shared-recipe-preview">
      <header className="shared-header">
        <div className="shared-header-content">
          <a href="/" className="shared-header-home" aria-label="Recipesaurus home">
            <DinoMascot size={48} />
          </a>
          <div className="shared-header-info">
            <h1>{recipe.title}</h1>
            {recipe.description && <p>{recipe.description}</p>}
          </div>
        </div>
      </header>

      <main className="shared-main">
        <div className="container">
          <div className="recipe-preview-content">
            {recipe.imageUrl && (
              <div className="preview-image">
                <img src={recipe.imageUrl} alt={recipe.title} />
              </div>
            )}

            <div className="preview-meta">
              {recipe.prepTime && (
                <span className="meta-item">
                  <Clock size={16} />
                  Prep: {recipe.prepTime}
                </span>
              )}
              {recipe.cookTime && (
                <span className="meta-item">
                  <Clock size={16} />
                  Cook: {recipe.cookTime}
                </span>
              )}
              {recipe.servings && (
                <span className="meta-item">
                  <Users size={16} />
                  Serves: {recipe.servings}
                </span>
              )}
            </div>

            <div className="preview-sections">
              <section className="preview-section">
                <h3>Ingredients</h3>
                <ul className="ingredients-list">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </section>

              <section className="preview-section">
                <h3>Instructions</h3>
                <ol className="instructions-list">
                  {recipe.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </section>
            </div>

            <div className="preview-actions">
              {saveError && <div className="form-error">{saveError}</div>}
              <button className="btn-secondary" onClick={handleDownloadPDF}>
                <Download size={16} />
                Download PDF
              </button>
              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  <ExternalLink size={16} />
                  View Original
                </a>
              )}
              <button
                className="btn-primary"
                onClick={handleSaveRecipe}
                disabled={isAuthLoading || isSaving || hasSaved}
              >
                {isAuthLoading || isSaving ? (
                  <Loader2 size={16} className="spin" />
                ) : hasSaved ? (
                  <Heart size={16} fill="currentColor" />
                ) : (
                  <ChefHat size={16} />
                )}
                {hasSaved ? 'Saved!' : 'Save to Recipesaurus'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <a href="/" className="footer-link">
          <ChefHat size={16} />
          <span>Recipesaurus</span>
        </a>
      </footer>
    </div>
  );
}
