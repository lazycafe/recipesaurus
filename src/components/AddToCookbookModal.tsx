import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Check, Book } from 'lucide-react';
import { useCookbooks } from '../context/CookbookContext';
import { useClient } from '../client/ClientContext';
import { Recipe } from '../types/Recipe';
import { ModalOverlay } from './ModalOverlay';

interface AddToCookbookModalProps {
  recipe: Recipe;
  onClose: () => void;
  onCreateCookbook: () => void;
}

export function AddToCookbookModal({ recipe, onClose, onCreateCookbook }: AddToCookbookModalProps) {
  const client = useClient();
  const { ownedCookbooks, sharedCookbooks, addRecipeToCookbook, removeRecipeFromCookbook } = useCookbooks();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [removedFrom, setRemovedFrom] = useState<Set<string>>(new Set());
  const [existingCookbookIds, setExistingCookbookIds] = useState<Set<string>>(new Set());
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  // Fetch cookbooks that already contain this recipe
  useEffect(() => {
    async function fetchExistingCookbooks() {
      setIsLoadingExisting(true);
      const { data } = await client.recipes.getCookbooksForRecipe(recipe.id);
      if (data) {
        setExistingCookbookIds(new Set(data.cookbookIds));
      }
      setIsLoadingExisting(false);
    }
    fetchExistingCookbooks();
  }, [client, recipe.id]);

  // Combine owned and shared cookbooks
  const allCookbooks = [...ownedCookbooks, ...sharedCookbooks];

  // Check if recipe is currently in cookbook (considering adds and removes during this session)
  const isInCookbook = (cookbookId: string) => {
    if (removedFrom.has(cookbookId)) return false;
    if (addedTo.has(cookbookId)) return true;
    return existingCookbookIds.has(cookbookId);
  };

  const handleToggleCookbook = async (cookbookId: string) => {
    setProcessingId(cookbookId);

    if (isInCookbook(cookbookId)) {
      // Remove from cookbook
      const success = await removeRecipeFromCookbook(cookbookId, recipe.id);
      if (success) {
        setRemovedFrom(prev => new Set([...prev, cookbookId]));
        setAddedTo(prev => {
          const next = new Set(prev);
          next.delete(cookbookId);
          return next;
        });
      }
    } else {
      // Add to cookbook
      const success = await addRecipeToCookbook(cookbookId, recipe.id);
      if (success) {
        setAddedTo(prev => new Set([...prev, cookbookId]));
        setRemovedFrom(prev => {
          const next = new Set(prev);
          next.delete(cookbookId);
          return next;
        });
      }
    }

    setProcessingId(null);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-content add-to-cookbook-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} strokeWidth={2} />
        </button>

        <h2>Add to Cookbook</h2>
        <p className="modal-subtitle">Add "{recipe.title}" to a cookbook</p>

        {isLoadingExisting ? (
          <div className="cookbook-checkbox-loading">
            <Loader2 size={24} className="spin" />
          </div>
        ) : allCookbooks.length > 0 ? (
          <div className="cookbook-checkbox-list">
            {allCookbooks.map(cookbook => {
              const isProcessing = processingId === cookbook.id;
              const inCookbook = isInCookbook(cookbook.id);

              return (
                <button
                  key={cookbook.id}
                  className={`cookbook-checkbox-item ${inCookbook ? 'added' : ''}`}
                  onClick={() => handleToggleCookbook(cookbook.id)}
                  disabled={isProcessing}
                >
                  <div className="cookbook-checkbox-icon">
                    <Book size={20} />
                  </div>
                  <div className="cookbook-checkbox-info">
                    <span className="cookbook-checkbox-name">{cookbook.name}</span>
                    <span className="cookbook-checkbox-count">
                      {cookbook.recipeCount} recipe{cookbook.recipeCount !== 1 ? 's' : ''}
                      {!cookbook.isOwner && cookbook.ownerName && ` · Shared by ${cookbook.ownerName}`}
                    </span>
                  </div>
                  <div className="cookbook-checkbox-status">
                    {isProcessing ? (
                      <Loader2 size={18} className="spin" />
                    ) : inCookbook ? (
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
    </ModalOverlay>
  );
}
