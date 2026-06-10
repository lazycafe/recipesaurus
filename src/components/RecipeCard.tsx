import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Clock, Users, X, BookPlus, User } from 'lucide-react';
import { Recipe } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';
import { useSwipeActions } from '../hooks/useSwipeActions';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onDelete?: () => void;
  onAddToCookbook?: () => void;
  addedByUserName?: string | null;
}

export function RecipeCard({ recipe, onClick, onDelete, onAddToCookbook, addedByUserName }: RecipeCardProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const hasActions = Boolean(onAddToCookbook || onDelete);
  const { swipeHandlers, shouldIgnoreSwipeClick } = useSwipeActions<HTMLElement>({
    enabled: hasActions,
    onSwipeLeft: () => setIsActionsOpen(true),
  });

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    setIsActionsOpen(false);
    onDelete?.();
  };

  const handleAddToCookbook = (e: MouseEvent) => {
    e.stopPropagation();
    setIsActionsOpen(false);
    onAddToCookbook?.();
  };

  const handleCardClick = (e: MouseEvent<HTMLElement>) => {
    if (shouldIgnoreSwipeClick()) {
      e.stopPropagation();
      return;
    }

    if (isActionsOpen) {
      setIsActionsOpen(false);
      e.stopPropagation();
      return;
    }

    onClick();
  };

  return (
    <article
      className={`recipe-card ${isActionsOpen ? 'swipe-actions-open' : ''}`.trim()}
      onClick={handleCardClick}
      {...swipeHandlers}
    >
      {hasActions && (
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

      {addedByUserName && (
        <div className="card-footer">
          <User size={12} />
          <span>Added by {addedByUserName}</span>
        </div>
      )}
    </article>
  );
}
