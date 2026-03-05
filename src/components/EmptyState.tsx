import { Plus, Search } from 'lucide-react';
import { DinoMascot } from './DinoMascot';

interface EmptyStateProps {
  hasFilters: boolean;
  onAddRecipe: () => void;
  onClearFilters: () => void;
}

export function EmptyState({ hasFilters, onAddRecipe, onClearFilters }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <DinoMascot size={120} className="empty-icon" />
      {hasFilters ? (
        <>
          <h3>No matches found</h3>
          <p>Try adjusting your search or filters</p>
          <button className="btn-secondary" onClick={onClearFilters}>
            <Search size={16} strokeWidth={2} />
            <span>Clear Filters</span>
          </button>
        </>
      ) : (
        <>
          <h3>No recipes yet</h3>
          <p>Start building your collection.</p>
          <button className="btn-primary" onClick={onAddRecipe}>
            <Plus size={18} strokeWidth={2.5} />
            <span>New Recipe</span>
          </button>
        </>
      )}
    </div>
  );
}
