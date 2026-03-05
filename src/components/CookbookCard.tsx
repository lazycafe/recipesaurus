import { useState } from 'react';
import { X, User } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';
import { DinoMascot } from './DinoMascot';
import { ConfirmModal } from './ConfirmModal';

interface CookbookCardProps {
  cookbook: Cookbook;
  onClick: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
}

export function CookbookCard({ cookbook, onClick, onDelete, onLeave }: CookbookCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmRemove = () => {
    setShowConfirm(false);
    if (cookbook.isOwner) {
      onDelete?.();
    } else {
      onLeave?.();
    }
  };

  const canRemove = (cookbook.isOwner && onDelete) || (!cookbook.isOwner && onLeave);

  return (
    <article className="cookbook-card" onClick={onClick}>
      {canRemove && (
        <button className="card-delete" onClick={handleRemove} aria-label={cookbook.isOwner ? "Delete cookbook" : "Leave cookbook"}>
          <X size={16} strokeWidth={2} />
        </button>
      )}

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

      {showConfirm && (
        <ConfirmModal
          title={cookbook.isOwner ? "Delete Cookbook" : "Leave Cookbook"}
          message={
            cookbook.isOwner
              ? `Are you sure you want to delete "${cookbook.name}"? Your recipes will not be deleted.`
              : `Are you sure you want to leave "${cookbook.name}"? You'll no longer have access to this cookbook.`
          }
          confirmText={cookbook.isOwner ? "Delete" : "Leave"}
          onConfirm={confirmRemove}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </article>
  );
}
