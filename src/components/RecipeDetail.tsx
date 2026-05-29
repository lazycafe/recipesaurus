import { useState } from 'react';
import { X, Clock, ChefHat, Users, ExternalLink, Trash2, PenLine, Heart, User, Share2, Loader2, Check } from 'lucide-react';
import { Recipe } from '../types/Recipe';
import { Recipe as ClientRecipe } from '../client/types';
import { DinoMascot } from './DinoMascot';
import { ModalOverlay } from './ModalOverlay';
import { ShareRecipeModal } from './ShareRecipeModal';

interface RecipeDetailProps {
  recipe: Recipe | ClientRecipe;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  readOnly?: boolean;
  isPublicView?: boolean;
}

export function RecipeDetail({
  recipe,
  onClose,
  onDelete,
  onEdit,
  onSave,
  isSaving = false,
  isSaved = false,
  readOnly = false,
  isPublicView = false,
}: RecipeDetailProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const handleDelete = () => {
    onDelete?.();
  };

  // Type guard for ClientRecipe with owner info
  const ownerName = 'ownerName' in recipe ? recipe.ownerName : null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-content modal-detail">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={2} />
        </button>

        <div className="detail-header">
          <div className="detail-image">
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.title} />
            ) : (
              <div className="detail-image-placeholder">
                <DinoMascot size={100} />
              </div>
            )}
          </div>

          <div className="detail-info">
            <h2 className="detail-title">{recipe.title}</h2>
            {ownerName && (
              <p className="detail-author">
                <User size={14} />
                by {ownerName}
              </p>
            )}
            <p className="detail-description">{recipe.description}</p>

            <div className="detail-meta">
              {recipe.prepTime && (
                <div className="meta-block">
                  <Clock size={16} strokeWidth={2} />
                  <div>
                    <span className="meta-label">Prep</span>
                    <span className="meta-value">{recipe.prepTime}</span>
                  </div>
                </div>
              )}
              {recipe.cookTime && (
                <div className="meta-block">
                  <ChefHat size={16} strokeWidth={2} />
                  <div>
                    <span className="meta-label">Cook</span>
                    <span className="meta-value">{recipe.cookTime}</span>
                  </div>
                </div>
              )}
              {recipe.servings && (
                <div className="meta-block">
                  <Users size={16} strokeWidth={2} />
                  <div>
                    <span className="meta-label">Serves</span>
                    <span className="meta-value">{recipe.servings}</span>
                  </div>
                </div>
              )}
            </div>

            {recipe.tags.length > 0 && (
              <div className="detail-tags">
                {recipe.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}

            <div className="detail-actions-row">
              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                  <span>View Original</span>
                  <ExternalLink size={14} strokeWidth={2} />
                </a>
              )}
              {!isPublicView && (
                <button className="btn-secondary" onClick={() => setShowShareModal(true)}>
                  <Share2 size={16} strokeWidth={2} />
                  <span>Share</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="detail-body">
          <section className="detail-section">
            <h3>Ingredients</h3>
            <ul className="ingredients-list">
              {recipe.ingredients.map((ingredient, idx) => (
                <li key={idx}>
                  <input type="checkbox" id={`ing-${idx}`} />
                  <label htmlFor={`ing-${idx}`}>{ingredient}</label>
                </li>
              ))}
            </ul>
          </section>

          <section className="detail-section">
            <h3>Instructions</h3>
            <ol className="instructions-list">
              {recipe.instructions.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </section>
        </div>

        {isPublicView && onSave && (
          <div className="detail-footer">
            <button className="btn-primary" onClick={onSave} disabled={isSaving || isSaved}>
              {isSaving ? (
                <Loader2 size={16} strokeWidth={2} className="spin" />
              ) : isSaved ? (
                <Check size={16} strokeWidth={2} />
              ) : (
                <Heart size={16} strokeWidth={2} />
              )}
              <span>{isSaved ? 'Saved to My Recipes' : 'Save to My Recipes'}</span>
            </button>
          </div>
        )}

        {!readOnly && !isPublicView && (onEdit || onDelete) && (
          <div className="detail-footer">
            {onEdit && (
              <button className="btn-secondary" onClick={onEdit}>
                <PenLine size={16} strokeWidth={2} />
                <span>Edit</span>
              </button>
            )}
            {onDelete && (
              <button className="btn-danger" onClick={handleDelete}>
                <Trash2 size={16} strokeWidth={2} />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showShareModal && (
        <ShareRecipeModal
          recipe={recipe}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </ModalOverlay>
  );
}
