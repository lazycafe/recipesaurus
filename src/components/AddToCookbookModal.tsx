import { useState } from 'react';
import { X, Loader2, Plus, Check, Book } from 'lucide-react';
import { useCookbooks } from '../context/CookbookContext';
import { Recipe } from '../types/Recipe';

interface AddToCookbookModalProps {
  recipe: Recipe;
  onClose: () => void;
  onCreateCookbook: () => void;
}

export function AddToCookbookModal({ recipe, onClose, onCreateCookbook }: AddToCookbookModalProps) {
  const { ownedCookbooks, addRecipeToCookbook } = useCookbooks();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  const handleAddToCookbook = async (cookbookId: string) => {
    setAddingTo(cookbookId);
    const success = await addRecipeToCookbook(cookbookId, recipe.id);
    if (success) {
      setAddedTo(prev => new Set([...prev, cookbookId]));
    }
    setAddingTo(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-to-cookbook-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} strokeWidth={2} />
        </button>

        <h2>Add to Cookbook</h2>
        <p className="modal-subtitle">Add "{recipe.title}" to a cookbook</p>

        {ownedCookbooks.length > 0 ? (
          <div className="cookbook-checkbox-list">
            {ownedCookbooks.map(cookbook => {
              const isAdding = addingTo === cookbook.id;
              const isAdded = addedTo.has(cookbook.id);

              return (
                <button
                  key={cookbook.id}
                  className={`cookbook-checkbox-item ${isAdded ? 'added' : ''}`}
                  onClick={() => !isAdded && handleAddToCookbook(cookbook.id)}
                  disabled={isAdding || isAdded}
                >
                  <div className="cookbook-checkbox-icon">
                    <Book size={20} />
                  </div>
                  <div className="cookbook-checkbox-info">
                    <span className="cookbook-checkbox-name">{cookbook.name}</span>
                    <span className="cookbook-checkbox-count">
                      {cookbook.recipeCount} recipe{cookbook.recipeCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="cookbook-checkbox-status">
                    {isAdding ? (
                      <Loader2 size={18} className="spin" />
                    ) : isAdded ? (
                      <Check size={18} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="no-cookbooks-message">
            <p>You don't have any cookbooks yet.</p>
          </div>
        )}

        <button
          className="btn-secondary create-cookbook-btn"
          onClick={() => {
            onClose();
            onCreateCookbook();
          }}
        >
          <Plus size={16} />
          Create New Cookbook
        </button>
      </div>
    </div>
  );
}
