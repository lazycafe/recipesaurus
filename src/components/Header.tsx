import { useState, useRef, useEffect } from 'react';
import { Book, Compass, UtensilsCrossed, Plus, ChefHat, Sparkles } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { DinoMascot } from './DinoMascot';
import { useAuth } from '../context/AuthContext';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onCreateRecipe?: () => void;
  onCreateCookbook?: () => void;
}

export function Header({ onCreateRecipe, onCreateCookbook }: HeaderProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if on discover page (for nav highlighting)
  const isDiscoverPage = location.pathname.startsWith('/discover') || location.pathname === '/';

  return (
    <>
      <header className="header">
        <div className="header-content">
          <NavLink to="/discover/recipes" className="logo-section">
            <DinoMascot size={48} className="logo-icon" />
            <div className="logo-text">
              <h1>Recipesaurus</h1>
            </div>
          </NavLink>

          {user && (
            <nav className="header-nav desktop-only">
              <NavLink
                to="/discover/recipes"
                className={() => `nav-tab ${isDiscoverPage ? 'active' : ''}`}
              >
                <Compass size={18} />
                Discover
              </NavLink>
              <NavLink
                to="/my-recipes"
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                <UtensilsCrossed size={18} />
                My Recipes
              </NavLink>
              <NavLink
                to="/meal-planner"
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                <Sparkles size={18} />
                Meal Plan
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
            {user && onCreateRecipe && onCreateCookbook && (
              <div className="create-menu-container" ref={createMenuRef}>
                <button
                  className="btn-create"
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  aria-label="Create new"
                >
                  <Plus size={18} />
                  <span className="desktop-only">Create</span>
                </button>
                {showCreateMenu && (
                  <div className="create-menu">
                    <button
                      className="create-menu-item"
                      onClick={() => {
                        setShowCreateMenu(false);
                        onCreateRecipe();
                      }}
                    >
                      <ChefHat size={16} />
                      New Recipe
                    </button>
                    <button
                      className="create-menu-item"
                      onClick={() => {
                        setShowCreateMenu(false);
                        onCreateCookbook();
                      }}
                    >
                      <Book size={16} />
                      New Cookbook
                    </button>
                  </div>
                )}
              </div>
            )}
            {user && <UserMenu />}
          </div>
        </div>
      </header>

      {user && (
        <nav className="mobile-nav">
          <div className="mobile-nav-container">
            <NavLink
              to="/discover/recipes"
              className={() => `mobile-nav-item ${isDiscoverPage ? 'active' : ''}`}
            >
              <Compass size={20} />
              <span>Discover</span>
            </NavLink>
            <NavLink
              to="/my-recipes"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <UtensilsCrossed size={20} />
              <span>My Recipes</span>
            </NavLink>
            <NavLink
              to="/meal-planner"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Sparkles size={20} />
              <span>Meal Plan</span>
            </NavLink>
            <NavLink
              to="/cookbooks"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Book size={20} />
              <span>Cookbooks</span>
            </NavLink>
          </div>
        </nav>
      )}
    </>
  );
}
