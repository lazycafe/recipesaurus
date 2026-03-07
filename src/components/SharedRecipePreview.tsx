import { useState, useEffect } from 'react';
import { Clock, Users, ExternalLink, ChefHat, Download, Loader2, Heart } from 'lucide-react';
import { DinoMascot } from './DinoMascot';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { jsPDF } from 'jspdf';
import { useClient } from '../client/ClientContext';
import { useToast } from '../context/ToastContext';

interface PreviewRecipe {
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

interface SharedRecipePreviewProps {
  encodedData: string;
  isLoggedIn?: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function SharedRecipePreview({ encodedData, isLoggedIn, onSignUp }: SharedRecipePreviewProps) {
  const [recipe, setRecipe] = useState<PreviewRecipe | null>(null);
  const [error, setError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // These will only be available when rendered within the logged-in app context
  let client: ReturnType<typeof useClient> | null = null;
  let showToast: ReturnType<typeof useToast>['showToast'] | null = null;

  try {
    client = useClient();
  } catch {
    // Not in a ClientProvider - this is expected for unauthenticated preview
  }

  try {
    const toast = useToast();
    showToast = toast.showToast;
  } catch {
    // Not in a ToastProvider
  }

  useEffect(() => {
    try {
      const decompressed = decompressFromEncodedURIComponent(encodedData);
      if (decompressed) {
        const data = JSON.parse(decompressed);
        setRecipe(data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, [encodedData]);

  // Check for pending save after login
  useEffect(() => {
    if (isLoggedIn && recipe && client) {
      const pendingRecipe = sessionStorage.getItem('pendingSaveRecipe');
      if (pendingRecipe) {
        sessionStorage.removeItem('pendingSaveRecipe');
        handleSaveRecipe();
      }
    }
  }, [isLoggedIn, recipe, client]);

  const handleSaveRecipe = async () => {
    if (!recipe) return;

    if (!isLoggedIn) {
      // Store pending action and show auth modal
      sessionStorage.setItem('pendingSaveRecipe', JSON.stringify(recipe));
      onSignUp?.();
      return;
    }

    if (!client) return;

    setIsSaving(true);
    try {
      const result = await client.recipes.saveFromPreview({
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        imageUrl: recipe.imageUrl,
        sourceUrl: recipe.sourceUrl,
      });

      if (result.data) {
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
      }
    } catch (err) {
      console.error('Failed to save recipe:', err);
      showToast?.({
        message: 'Failed to save recipe. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!recipe) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPos = 20;

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(recipe.title, maxWidth);
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * 10 + 5;

    // Description
    if (recipe.description) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      const descLines = doc.splitTextToSize(recipe.description, maxWidth);
      doc.text(descLines, margin, yPos);
      yPos += descLines.length * 6 + 10;
    }

    // Meta info
    doc.setTextColor(0);
    doc.setFontSize(10);
    const meta = [];
    if (recipe.prepTime) meta.push(`Prep: ${recipe.prepTime}`);
    if (recipe.cookTime) meta.push(`Cook: ${recipe.cookTime}`);
    if (recipe.servings) meta.push(`Servings: ${recipe.servings}`);
    if (meta.length > 0) {
      doc.text(meta.join('  |  '), margin, yPos);
      yPos += 15;
    }

    // Ingredients
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ingredients', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    recipe.ingredients.forEach(ing => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const lines = doc.splitTextToSize(`• ${ing}`, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 5 + 2;
    });

    yPos += 10;

    // Instructions
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructions', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    recipe.instructions.forEach((step, i) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const lines = doc.splitTextToSize(`${i + 1}. ${step}`, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 5 + 4;
    });

    // Source
    yPos += 10;
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Source: ${recipe.sourceUrl}`, margin, yPos);
    yPos += 10;
    doc.text('Generated by Recipesaurus', margin, yPos);

    // Download
    const filename = recipe.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    doc.save(`${filename}_Recipe.pdf`);
  };

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
          <DinoMascot size={48} />
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
                disabled={isSaving || hasSaved}
              >
                {isSaving ? (
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
