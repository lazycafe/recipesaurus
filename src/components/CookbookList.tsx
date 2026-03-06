import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Book } from 'lucide-react';
import { useCookbooks } from '../context/CookbookContext';
import { CookbookCard } from './CookbookCard';
import { DinoMascot } from './DinoMascot';

interface CookbookListProps {
  onCreateCookbook: () => void;
}

export function CookbookList({ onCreateCookbook }: CookbookListProps) {
  const { ownedCookbooks, sharedCookbooks } = useCookbooks();
  const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');

  const cookbooks = activeTab === 'owned' ? ownedCookbooks : sharedCookbooks;
  const hasShared = sharedCookbooks.length > 0;

  return (
    <div className="cookbook-list">
      {hasShared && (
        <div className="cookbook-header">
          <div className="cookbook-tabs">
            <button
              className={`cookbook-tab ${activeTab === 'owned' ? 'active' : ''}`}
              onClick={() => setActiveTab('owned')}
            >
              <Book size={16} />
              My Cookbooks
              <span className="tab-count">{ownedCookbooks.length}</span>
            </button>
            <button
              className={`cookbook-tab ${activeTab === 'shared' ? 'active' : ''}`}
              onClick={() => setActiveTab('shared')}
            >
              Shared with Me
              <span className="tab-count">{sharedCookbooks.length}</span>
            </button>
          </div>
        </div>
      )}

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
          <h2>
            {activeTab === 'owned'
              ? 'No cookbooks yet'
              : 'No shared cookbooks'}
          </h2>
          <p>
            {activeTab === 'owned'
              ? 'Organize your recipes into cookbooks.'
              : 'When someone shares a cookbook with you, it will appear here.'}
          </p>
          {activeTab === 'owned' && (
            <button className="btn-primary" onClick={onCreateCookbook}>
              <Plus size={18} strokeWidth={2} />
              New Cookbook
            </button>
          )}
        </div>
      )}
    </div>
  );
}
