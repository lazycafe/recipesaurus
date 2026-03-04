import { X, Clock, ChefHat, Users, ExternalLink, Trash2 } from 'lucide-react';
import { Recipe } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onDelete: () => void;
}

export function RecipeDetail({ recipe, onClose, onDelete }: RecipeDetailProps) {
  const handleDelete = () => {
    if (confirm('Delete this recipe?')) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-detail" onClick={e => e.stopPropagation()}>
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

            {recipe.sourceUrl && (
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                <span>View Original</span>
                <ExternalLink size={14} strokeWidth={2} />
              </a>
            )}
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

        <div className="detail-footer">
          <button className="btn-danger" onClick={handleDelete}>
            <Trash2 size={16} strokeWidth={2} />
            <span>Delete Recipe</span>
          </button>
        </div>
      </div>
    </div>
  );
}
