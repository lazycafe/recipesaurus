import { Plus, Book, ChefHat, Compass } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { DinoMascot } from './DinoMascot';
import { useAuth } from '../context/AuthContext';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  currentView: 'recipes' | 'cookbooks' | 'discover';
  onAddRecipe: () => void;
  onAddCookbook: () => void;
}

export function Header({ currentView, onAddRecipe, onAddCookbook }: HeaderProps) {
  const { user } = useAuth();

  return (
    <>
      <header className="header">
        <div className="header-content">
          <NavLink to="/" className="logo-section">
            <DinoMascot size={48} className="logo-icon" />
            <div className="logo-text">
              <h1>Recipesaurus</h1>
            </div>
          </NavLink>

          {user && (
            <nav className="header-nav desktop-only">
              <NavLink
                to="/"
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
                end
              >
                <Compass size={18} />
                Discover
              </NavLink>
              <NavLink
                to="/recipes"
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                <ChefHat size={18} />
                My Recipes
              </NavLink>
              <NavLink
                to="/cookbooks"
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                <Book size={18} />
                Cookbooks
              </NavLink>
            </nav>
          )}

          <div className="header-actions">
            {user && (
              <>
                <div className="header-action-button">
                  {currentView === 'recipes' && (
                    <button className="btn-primary" onClick={onAddRecipe}>
                      <Plus size={18} strokeWidth={2.5} />
                      <span className="btn-text">New Recipe</span>
                    </button>
                  )}
                  {currentView === 'cookbooks' && (
                    <button className="btn-primary" onClick={onAddCookbook}>
                      <Plus size={18} strokeWidth={2.5} />
                      <span className="btn-text">New Cookbook</span>
                    </button>
                  )}
                </div>

                <UserMenu />
              </>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav className="mobile-nav">
          <div className="mobile-nav-container">
            <NavLink
              to="/"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              end
            >
              <Compass size={20} />
              <span>Discover</span>
            </NavLink>
            <NavLink
              to="/recipes"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <ChefHat size={20} />
              <span>Recipes</span>
            </NavLink>
            <NavLink
              to="/cookbooks"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Book size={20} />
              <span>Books</span>
            </NavLink>
          </div>
        </nav>
      )}
    </>
  );
}
