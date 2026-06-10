import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Clock, BookPlus, X } from 'lucide-react';
import { Recipe } from '../client/types';
import { DinoMascot } from './DinoMascot';
import { useSwipeActions } from '../hooks/useSwipeActions';

interface RecipeCardCompactProps {
  recipe: Recipe;
  onClick: () => void;
  onDelete?: () => void;
  onAddToCookbook?: () => void;
  showActions?: boolean;
}

export function RecipeCardCompact({
  recipe,
  onClick,
  onDelete,
  onAddToCookbook,
  showActions = true,
}: RecipeCardCompactProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const hasActions = showActions && Boolean(onAddToCookbook || onDelete);
  const { swipeHandlers, shouldIgnoreSwipeClick } = useSwipeActions<HTMLElement>({
    enabled: hasActions,
    onSwipeLeft: () => setIsActionsOpen(true),
  });

  const handleAction = (e: MouseEvent, action: () => void) => {
    e.stopPropagation();
    setIsActionsOpen(false);
    action();
  };

  const handleClick = (e: MouseEvent<HTMLElement>) => {
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
      className={`recipe-card-compact ${isActionsOpen ? 'swipe-actions-open' : ''}`.trim()}
      onClick={handleClick}
      {...swipeHandlers}
    >
      <div className="compact-card-image">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} loading="lazy" />
        ) : (
          <div className="compact-card-placeholder">
            <DinoMascot size={32} />
          </div>
        )}
        {hasActions && (
          <div className="compact-card-actions">
            {onAddToCookbook && (
              <button
                className="compact-action"
                onClick={(e) => handleAction(e, onAddToCookbook)}
                aria-label="Add to cookbook"
              >
                <BookPlus size={14} />
              </button>
            )}
            {onDelete && (
              <button
                className="compact-action compact-delete"
                onClick={(e) => handleAction(e, onDelete)}
                aria-label="Delete"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="compact-card-body">
        <h3 className="compact-card-title">{recipe.title}</h3>
        {recipe.prepTime && (
          <span className="compact-card-meta">
            <Clock size={12} />
            {recipe.prepTime}
          </span>
        )}
      </div>
    </article>
  );
}
