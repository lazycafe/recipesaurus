import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link2, Download, Share2, Loader2, ChefHat, ArrowRight, Sparkles, Users, Book } from 'lucide-react';
import { DinoMascot } from './DinoMascot';
import { RecipeDetail } from './RecipeDetail';
import { fetchAndExtractRecipe } from '../utils/recipeExtractor';
import { downloadRecipePdf } from '../utils/recipePdf';
import { useOptionalClient } from '../client/ClientContext';
import { defaultClient } from '../client/defaultClient';
import type { Recipe } from '../client/types';
import { SAMPLE_RECIPES } from '../data/sampleRecipes';

interface ExtractedRecipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  imageUrl?: string;
  sourceUrl: string;
}

interface PublicHomePageProps {
  onSignUp: () => void;
  onSignIn: () => void;
}

const DISCOVER_PREVIEW_LIMIT = 6;

function buildDiscoverPreview(apiRecipes: Recipe[]): Recipe[] {
  const seen = new Set(apiRecipes.map(recipe => recipe.id));
  const fallbackRecipes = SAMPLE_RECIPES.filter(recipe => !seen.has(recipe.id));
  return [...apiRecipes, ...fallbackRecipes].slice(0, DISCOVER_PREVIEW_LIMIT);
}

export function PublicHomePage({ onSignUp, onSignIn }: PublicHomePageProps) {
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [discoverRecipes, setDiscoverRecipes] = useState<Recipe[]>(() => buildDiscoverPreview([]));
  const [selectedDiscoverRecipe, setSelectedDiscoverRecipe] = useState<Recipe | null>(null);
  const providedClient = useOptionalClient();
  const client = providedClient ?? defaultClient;

  useEffect(() => {
    if (!providedClient) return;

    let isMounted = true;

    providedClient.discover.recipes({ limit: DISCOVER_PREVIEW_LIMIT, offset: 0 })
      .then(result => {
        const apiRecipes = result.data?.recipes;
        if (!isMounted || !Array.isArray(apiRecipes) || apiRecipes.length === 0) return;
        setDiscoverRecipes(buildDiscoverPreview(apiRecipes));
      })
      .catch(() => {
        // Keep the curated sample recipes when the public API is unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, [providedClient]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsExtracting(true);
    setError(null);
    setExtractedRecipe(null);
    setShareLink(null);

    try {
      const extracted = await fetchAndExtractRecipe(url.trim());

      // Convert to ExtractedRecipe format
      const recipe: ExtractedRecipe = {
        title: extracted.title || 'Untitled Recipe',
        description: extracted.description || '',
        ingredients: extracted.ingredients || [],
        instructions: extracted.instructions || [],
        prepTime: extracted.prepTime,
        cookTime: extracted.cookTime,
        servings: extracted.servings,
        imageUrl: extracted.imageUrl,
        sourceUrl: extracted.sourceUrl,
      };

      // Validate that we got meaningful data
      if (!recipe.title && !recipe.ingredients.length && !recipe.instructions.length) {
        throw new Error('Could not find recipe data on this page. Try a different URL.');
      }

      setExtractedRecipe(recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract recipe. Please check the URL and try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!extractedRecipe) return;
    downloadRecipePdf(extractedRecipe);
  };

  const handleShareLink = async () => {
    if (!extractedRecipe) return;

    setIsSharing(true);
    setError(null);

    try {
      const { data, error: apiError } = await client.recipes.createShareLink(extractedRecipe);
      if (!data) {
        throw new Error(apiError || 'Unable to create share link');
      }

      const link = `${window.location.origin}/shared-recipe/${data.token}`;
      setShareLink(link);
      navigator.clipboard.writeText(link).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create share link');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDiscoverRecipeKeyDown = (event: KeyboardEvent<HTMLElement>, recipe: Recipe) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedDiscoverRecipe(recipe);
    }
  };

  const handleSaveDiscoverRecipe = () => {
    setSelectedDiscoverRecipe(null);
    onSignUp();
  };

  return (
    <div className="public-home">
      {/* Header */}
      <header className="public-header">
        <div className="public-header-content">
          <a href="/" className="public-header-logo" aria-label="Recipesaurus home">
            <DinoMascot size={36} />
            <span>Recipesaurus</span>
          </a>
          <nav className="public-header-nav">
            <button className="btn-text" onClick={onSignIn}>
              Sign In
            </button>
            <button className="btn-primary" onClick={onSignUp}>
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <DinoMascot size={100} className="hero-mascot" />
          <h1>Save Recipes from Anywhere</h1>
          <p className="hero-subtitle">
            Paste any recipe URL and instantly extract, save, and organize your favorite recipes.
            No more scattered bookmarks or lost recipes.
          </p>

          {/* URL Extraction Form */}
          <form className="url-extract-form" onSubmit={handleExtract}>
            <div className="url-input-wrapper">
              <Link2 size={20} />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a recipe URL..."
                required
              />
              <button
                type="submit"
                className="extract-btn"
                disabled={isExtracting || !url.trim()}
              >
                {isExtracting ? (
                  <Loader2 size={18} className="spin" />
                ) : (
                  <>
                    <Sparkles size={18} />
                    Extract
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <p className="extract-error">{error}</p>
          )}
        </div>
      </section>

      {/* Extracted Recipe Preview */}
      {extractedRecipe && (
        <section className="extracted-preview">
          <div className="preview-card">
            <div className="preview-header">
              <ChefHat size={24} />
              <h2>{extractedRecipe.title}</h2>
            </div>

            <p className="preview-description">{extractedRecipe.description}</p>

            <div className="preview-meta">
              {extractedRecipe.prepTime && (
                <span>Prep: {extractedRecipe.prepTime}</span>
              )}
              {extractedRecipe.cookTime && (
                <span>Cook: {extractedRecipe.cookTime}</span>
              )}
              {extractedRecipe.servings && (
                <span>Serves: {extractedRecipe.servings}</span>
              )}
            </div>

            <div className="preview-sections">
              <div className="preview-section">
                <h4>Ingredients</h4>
                <ul>
                  {extractedRecipe.ingredients.slice(0, 5).map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                  {extractedRecipe.ingredients.length > 5 && (
                    <li className="more">+{extractedRecipe.ingredients.length - 5} more...</li>
                  )}
                </ul>
              </div>

              <div className="preview-section">
                <h4>Instructions</h4>
                <ol>
                  {extractedRecipe.instructions.slice(0, 3).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                  {extractedRecipe.instructions.length > 3 && (
                    <li className="more">+{extractedRecipe.instructions.length - 3} more steps...</li>
                  )}
                </ol>
              </div>
            </div>

            <div className="preview-actions">
              <button className="btn-secondary" onClick={handleDownloadPDF}>
                <Download size={16} />
                Download
              </button>
              <button className="btn-secondary" onClick={handleShareLink} disabled={isSharing}>
                {isSharing ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
                Share Link
              </button>
              <button className="btn-primary" onClick={onSignUp}>
                <ArrowRight size={16} />
                Save to Collection
              </button>
            </div>

            {shareLink && (
              <div className="share-link-result">
                <input type="text" value={shareLink} readOnly />
                <span>Link copied!</span>
              </div>
            )}
          </div>

          <div className="signup-prompt">
            <h3>Want to save this recipe?</h3>
            <p>Create a free account to save, organize, and share your recipes.</p>
            <div className="prompt-actions">
              <button className="btn-primary btn-lg" onClick={onSignUp}>
                Get Started Free
              </button>
              <button className="btn-text" onClick={onSignIn}>
                Already have an account? Sign In
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Discover Section */}
      <section className="public-discover-section" aria-labelledby="public-discover-title">
        <div className="public-section-header">
          <span className="public-section-kicker">
            <Sparkles size={16} />
            Community favorites
          </span>
          <h2 id="public-discover-title">Discover Recipes</h2>
          <p>Browse a few public recipes, peek at the details, then create an account to save the ones you love.</p>
        </div>

        <div className="public-discover-grid">
          {discoverRecipes.map(recipe => (
            <article
              key={recipe.id}
              className="public-discover-card"
              onClick={() => setSelectedDiscoverRecipe(recipe)}
              onKeyDown={(event) => handleDiscoverRecipeKeyDown(event, recipe)}
              tabIndex={0}
              role="button"
              aria-label={`View ${recipe.title}`}
            >
              <div className="public-discover-card-image">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.title} loading="lazy" />
                ) : (
                  <div className="public-discover-card-placeholder">
                    <DinoMascot size={48} />
                  </div>
                )}
              </div>
              <div className="public-discover-card-body">
                <h3>{recipe.title}</h3>
                {recipe.ownerName && <p>by {recipe.ownerName}</p>}
                {recipe.tags.length > 0 && (
                  <div className="public-discover-card-tags">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag-sm">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Why Recipesaurus?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Link2 size={28} />
            </div>
            <h3>Extract from Any URL</h3>
            <p>Paste a link from your favorite food blog or website and we'll extract the recipe automatically.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Book size={28} />
            </div>
            <h3>Organize in Cookbooks</h3>
            <p>Create collections to organize your recipes by cuisine, occasion, or however you like.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Users size={28} />
            </div>
            <h3>Share with Friends</h3>
            <p>Share cookbooks with family and friends. Collaborate on meal planning together.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Sparkles size={28} />
            </div>
            <h3>Discover New Recipes</h3>
            <p>Explore public recipes shared by our community and save your favorites.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <DinoMascot size={80} />
        <h2>Ready to organize your recipes?</h2>
        <p>Join thousands of home cooks who use Recipesaurus to save and share their favorite recipes.</p>
        <div className="cta-actions">
          <button className="btn-primary btn-lg" onClick={onSignUp}>
            Get Started Free
          </button>
          <button className="btn-secondary btn-lg" onClick={onSignIn}>
            Sign In
          </button>
        </div>
      </section>

      {selectedDiscoverRecipe && (
        <RecipeDetail
          recipe={selectedDiscoverRecipe}
          onClose={() => setSelectedDiscoverRecipe(null)}
          onSave={handleSaveDiscoverRecipe}
          saveLabel="Save Recipe"
          isPublicView={true}
        />
      )}
    </div>
  );
}
