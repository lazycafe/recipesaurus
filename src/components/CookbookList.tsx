import { useState } from 'react';
import { Plus, Book } from 'lucide-react';
import { useCookbooks } from '../context/CookbookContext';
import { CookbookCard } from './CookbookCard';
import { Cookbook } from '../types/Cookbook';
import { DinoMascot } from './DinoMascot';

interface CookbookListProps {
  onCreateCookbook: () => void;
  onSelectCookbook: (cookbook: Cookbook) => void;
}

export function CookbookList({ onCreateCookbook, onSelectCookbook }: CookbookListProps) {
  const { ownedCookbooks, sharedCookbooks, deleteCookbook } = useCookbooks();
  const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');

  const cookbooks = activeTab === 'owned' ? ownedCookbooks : sharedCookbooks;
  const hasShared = sharedCookbooks.length > 0;

  return (
    <div className="cookbook-list">
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
          {hasShared && (
            <button
              className={`cookbook-tab ${activeTab === 'shared' ? 'active' : ''}`}
              onClick={() => setActiveTab('shared')}
            >
              Shared with Me
              <span className="tab-count">{sharedCookbooks.length}</span>
            </button>
          )}
        </div>

        {activeTab === 'owned' && (
          <button className="btn-primary" onClick={onCreateCookbook}>
            <Plus size={18} strokeWidth={2} />
            New Cookbook
          </button>
        )}
      </div>

      {cookbooks.length > 0 ? (
        <div className="cookbook-grid">
          {cookbooks.map(cookbook => (
            <CookbookCard
              key={cookbook.id}
              cookbook={cookbook}
              onClick={() => onSelectCookbook(cookbook)}
              onDelete={cookbook.isOwner ? () => deleteCookbook(cookbook.id) : undefined}
            />
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
              ? 'Create a cookbook to organize your favorite recipes.'
              : 'When someone shares a cookbook with you, it will appear here.'}
          </p>
          {activeTab === 'owned' && (
            <button className="btn-primary" onClick={onCreateCookbook}>
              <Plus size={18} strokeWidth={2} />
              Create Your First Cookbook
            </button>
          )}
        </div>
      )}
    </div>
  );
}
