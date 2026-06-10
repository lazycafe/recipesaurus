import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCookbooks } from '../context/CookbookContext';
import { CookbookCard } from './CookbookCard';
import { DinoMascot } from './DinoMascot';

interface CookbookListProps {
  onCreateCookbook: () => void;
}

export function CookbookList({ onCreateCookbook }: CookbookListProps) {
  const { ownedCookbooks, sharedCookbooks } = useCookbooks();
  const navigate = useNavigate();

  // Filter out system cookbooks (like "My Recipe Collection")
  const filteredOwned = ownedCookbooks.filter(c => !c.isSystem);
  const filteredShared = sharedCookbooks.filter(c => !c.isSystem);
  const cookbooks = [...filteredOwned, ...filteredShared].sort((a, b) => b.updatedAt - a.updatedAt);
  const openCookbook = (cookbookId: string) => {
    navigate(`/cookbooks/${cookbookId}`);
  };
  const handleCookbookKeyDown = (event: KeyboardEvent<HTMLDivElement>, cookbookId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    openCookbook(cookbookId);
  };

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
            <div
              key={cookbook.id}
              className="cookbook-card-link"
              role="link"
              tabIndex={0}
              data-href={`/cookbooks/${cookbook.id}`}
              onClick={() => openCookbook(cookbook.id)}
              onKeyDown={(event) => handleCookbookKeyDown(event, cookbook.id)}
            >
              <CookbookCard cookbook={cookbook} />
            </div>
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
