import { User } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';
import { DinoMascot } from './DinoMascot';

interface CookbookCardProps {
  cookbook: Cookbook;
  onClick?: () => void;
}

export function CookbookCard({ cookbook, onClick }: CookbookCardProps) {
  return (
    <article className="cookbook-card" onClick={onClick}>

      <div className="cookbook-book">
        <div className="cookbook-spine">
          <span className="cookbook-spine-title">{cookbook.name}</span>
        </div>
        <div className="cookbook-cover">
          {cookbook.coverImage ? (
            <img src={cookbook.coverImage} alt={cookbook.name} className="cookbook-cover-image" />
          ) : (
            <div className="cookbook-cover-placeholder">
              <DinoMascot size={48} />
            </div>
          )}
          <div className="cookbook-cover-overlay">
            <h3 className="cookbook-cover-title">{cookbook.name}</h3>
            {cookbook.description && (
              <p className="cookbook-cover-subtitle">{cookbook.description}</p>
            )}
          </div>
        </div>
        <div className="cookbook-pages"></div>
      </div>

      <div className="cookbook-info">
        <span className="cookbook-recipe-count">
          {cookbook.recipeCount} recipe{cookbook.recipeCount !== 1 ? 's' : ''}
        </span>
        {!cookbook.isOwner && cookbook.ownerName && (
          <span className="cookbook-owner">
            <User size={12} strokeWidth={2} />
            {cookbook.ownerName}
          </span>
        )}
      </div>

    </article>
  );
}
