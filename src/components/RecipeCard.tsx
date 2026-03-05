import { useState } from 'react';
import { Clock, Users, X, BookPlus } from 'lucide-react';
import { Recipe } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';
import { ConfirmModal } from './ConfirmModal';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onDelete?: () => void;
  onAddToCookbook?: () => void;
}

export function RecipeCard({ recipe, onClick, onDelete, onAddToCookbook }: RecipeCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.();
  };

  const handleAddToCookbook = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCookbook?.();
  };

  return (
    <article className="recipe-card" onClick={onClick}>
      {(onAddToCookbook || onDelete) && (
        <div className="card-actions">
          {onAddToCookbook && (
            <button className="card-action" onClick={handleAddToCookbook} aria-label="Add to cookbook">
              <BookPlus size={16} strokeWidth={2} />
            </button>
          )}
          {onDelete && (
            <button className="card-action card-delete" onClick={handleDelete} aria-label="Delete recipe">
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      <div className="card-image">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} />
        ) : (
          <div className="card-image-placeholder">
            <DinoMascot size={64} />
          </div>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title">{recipe.title}</h3>
        <p className="card-description">{recipe.description}</p>

        <div className="card-meta">
          {recipe.prepTime && (
            <span className="meta-item">
              <Clock size={14} strokeWidth={2} />
              {recipe.prepTime}
            </span>
          )}
          {recipe.servings && (
            <span className="meta-item">
              <Users size={14} strokeWidth={2} />
              {recipe.servings}
            </span>
          )}
        </div>

        {recipe.tags.length > 0 && (
          <div className="card-tags">
            {recipe.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="tag tag-more">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Recipe"
          message={`Are you sure you want to delete "${recipe.title}"?`}
          confirmText="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </article>
  );
}
