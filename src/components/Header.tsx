import { Plus, Book, ChefHat } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { DinoMascot } from './DinoMascot';
import { useAuth } from '../context/AuthContext';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  currentView: 'recipes' | 'cookbooks';
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
                <ChefHat size={18} />
                Recipes
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

                <UserMenu />
              </>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav className="mobile-nav">
          <NavLink
            to="/"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            end
          >
            <ChefHat size={22} />
            <span>Recipes</span>
          </NavLink>
          <NavLink
            to="/cookbooks"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Book size={22} />
            <span>Cookbooks</span>
          </NavLink>
        </nav>
      )}
    </>
  );
}
