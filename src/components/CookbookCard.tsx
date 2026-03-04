import { Book, X, User } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';

interface CookbookCardProps {
  cookbook: Cookbook;
  onClick: () => void;
  onDelete?: () => void;
}

export function CookbookCard({ cookbook, onClick, onDelete }: CookbookCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this cookbook? Recipes will not be deleted.')) {
      onDelete?.();
    }
  };

  return (
    <article className="cookbook-card" onClick={onClick}>
      {cookbook.isOwner && onDelete && (
        <button className="card-delete" onClick={handleDelete} aria-label="Delete cookbook">
          <X size={16} strokeWidth={2} />
        </button>
      )}

      <div className="cookbook-card-icon">
        <Book size={32} strokeWidth={1.5} />
      </div>

      <div className="card-body">
        <h3 className="card-title">{cookbook.name}</h3>
        {cookbook.description && (
          <p className="card-description">{cookbook.description}</p>
        )}

        <div className="card-meta">
          <span className="meta-item">
            {cookbook.recipeCount} recipe{cookbook.recipeCount !== 1 ? 's' : ''}
          </span>
          {!cookbook.isOwner && cookbook.ownerName && (
            <span className="meta-item cookbook-owner">
              <User size={14} strokeWidth={2} />
              {cookbook.ownerName}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
