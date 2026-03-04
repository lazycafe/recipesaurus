import { Plus, LogOut, User, Book, ChefHat } from 'lucide-react';
import { DinoMascot } from './DinoMascot';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentView: 'recipes' | 'cookbooks';
  onViewChange: (view: 'recipes' | 'cookbooks') => void;
  onAddRecipe: () => void;
  onAddCookbook: () => void;
}

export function Header({ currentView, onViewChange, onAddRecipe, onAddCookbook }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <DinoMascot size={48} className="logo-icon" />
            <div className="logo-text">
              <h1>Recipesaurus</h1>
            </div>
          </div>

          {user && (
            <nav className="header-nav desktop-only">
              <button
                className={`nav-tab ${currentView === 'recipes' ? 'active' : ''}`}
                onClick={() => onViewChange('recipes')}
              >
                <ChefHat size={18} />
                Recipes
              </button>
              <button
                className={`nav-tab ${currentView === 'cookbooks' ? 'active' : ''}`}
                onClick={() => onViewChange('cookbooks')}
              >
                <Book size={18} />
                Cookbooks
              </button>
            </nav>
          )}

          <div className="header-actions">
            {user && (
              <>
                <div className="user-info">
                  <div className="user-avatar">
                    <User size={16} strokeWidth={2} />
                  </div>
                  <span className="user-name">{user.name}</span>
                </div>

                {currentView === 'recipes' ? (
                  <button className="btn-primary" onClick={onAddRecipe}>
                    <Plus size={18} strokeWidth={2.5} />
                    <span className="btn-text">New Recipe</span>
                  </button>
                ) : (
                  <button className="btn-primary" onClick={onAddCookbook}>
                    <Plus size={18} strokeWidth={2.5} />
                    <span className="btn-text">New Cookbook</span>
                  </button>
                )}

                <button className="btn-icon" onClick={logout} aria-label="Sign out">
                  <LogOut size={18} strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav className="mobile-nav">
          <button
            className={`mobile-nav-item ${currentView === 'recipes' ? 'active' : ''}`}
            onClick={() => onViewChange('recipes')}
          >
            <ChefHat size={22} />
            <span>Recipes</span>
          </button>
          <button
            className={`mobile-nav-item ${currentView === 'cookbooks' ? 'active' : ''}`}
            onClick={() => onViewChange('cookbooks')}
          >
            <Book size={22} />
            <span>Cookbooks</span>
          </button>
        </nav>
      )}
    </>
  );
}
