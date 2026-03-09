import { Book, Compass, UtensilsCrossed } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { DinoMascot } from './DinoMascot';
import { useAuth } from '../context/AuthContext';
import { UserMenu } from './UserMenu';

export function Header() {
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
                to="/my-recipes"
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                <UtensilsCrossed size={18} />
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
            {user && <UserMenu />}
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
              to="/my-recipes"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <UtensilsCrossed size={20} />
              <span>My Recipes</span>
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
