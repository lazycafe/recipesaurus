import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCookbooks } from '../context/CookbookContext';
import { CookbookCard } from './CookbookCard';
import { DinoMascot } from './DinoMascot';

interface CookbookListProps {
  onCreateCookbook: () => void;
}

export function CookbookList({ onCreateCookbook }: CookbookListProps) {
  const { ownedCookbooks, sharedCookbooks } = useCookbooks();

  // Filter out system cookbooks (like "My Recipe Collection")
  const filteredOwned = ownedCookbooks.filter(c => !c.isSystem);
  const filteredShared = sharedCookbooks.filter(c => !c.isSystem);
  const cookbooks = [...filteredOwned, ...filteredShared].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="cookbook-list">
      <div className="page-header">
        <div className="page-header-title">
          <h1>Cookbooks</h1>
          <p className="page-subtitle">Organize recipes into private, public, shared, and meal-planning collections</p>
        </div>
        <button className="btn-primary" onClick={onCreateCookbook}>
          <Plus size={18} strokeWidth={2.5} />
          <span>New Cookbook</span>
        </button>
      </div>

      {cookbooks.length > 0 ? (
        <div className="cookbook-grid">
          {cookbooks.map(cookbook => (
            <Link key={cookbook.id} to={`/cookbooks/${cookbook.id}`} className="cookbook-card-link">
              <CookbookCard cookbook={cookbook} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <DinoMascot size={120} />
          <h2>No cookbooks yet</h2>
          <p>Create a cookbook to organize recipes, plan meals, and share favorites. Shared cookbooks will appear here too.</p>
        </div>
      )}
    </div>
  );
}
