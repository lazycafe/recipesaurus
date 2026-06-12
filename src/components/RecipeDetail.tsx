import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Clock, ChefHat, Users, ExternalLink, Trash2, PenLine, Heart, User, Share2, Download, Loader2, Check } from 'lucide-react';
import { Recipe } from '../types/Recipe';
import { Recipe as ClientRecipe } from '../client/types';
import { DinoMascot } from './DinoMascot';
import { ModalOverlay } from './ModalOverlay';
import { ShareRecipeModal } from './ShareRecipeModal';
import { downloadRecipePdf } from '../utils/recipePdf';
import { useSwipeActions } from '../hooks/useSwipeActions';
import {
  LEGACY_RECIPE_DETAIL_ROUTE_PARAM,
  RECIPE_DETAIL_ROUTE_PARAM,
  clearRecipeDetailRouteParams,
} from '../utils/recipeDetailRoute';

const RECIPE_DETAIL_HISTORY_KEY = 'recipesaurusRecipeDetailModal';

interface RecipeDetailProps {
  recipe: Recipe | ClientRecipe;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  saveLabel?: string;
  readOnly?: boolean;
  isPublicView?: boolean;
}

export function RecipeDetail({
  recipe,
  onClose,
  onDelete,
  onEdit,
  onSave,
  isSaving = false,
  isSaved = false,
  saveLabel = 'Save Recipe',
  readOnly = false,
  isPublicView = false,
}: RecipeDetailProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const navigate = useNavigate();
  const publicSaveLabel = isSaved ? 'Saved to My Recipes' : saveLabel;
  const onCloseRef = useRef(onClose);
  const modalHistoryIdRef = useRef(`recipe-detail-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const modalRouteWasPushedRef = useRef(false);
  const modalBaseUrlRef = useRef<string | null>(null);
  const hasSaveAction = Boolean(onSave) && (isPublicView || ('isOwner' in recipe && recipe.isOwner === false));
  const { swipeHandlers: closeSwipeHandlers } = useSwipeActions<HTMLDivElement>({
    onSwipeDown: requestClose,
  });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const modalHistoryId = modalHistoryIdRef.current;
    const currentUrl = new URL(window.location.href);
    const baseUrl = new URL(currentUrl.href);
    baseUrl.search = clearRecipeDetailRouteParams(baseUrl.searchParams).toString();
    modalBaseUrlRef.current = `${baseUrl.pathname}${baseUrl.search}${baseUrl.hash}`;

    const nextUrl = new URL(currentUrl.href);
    nextUrl.searchParams.set(RECIPE_DETAIL_ROUTE_PARAM, recipe.id);
    nextUrl.searchParams.delete(LEGACY_RECIPE_DETAIL_ROUTE_PARAM);
    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    const currentRecipeRouteId = currentUrl.searchParams.get(RECIPE_DETAIL_ROUTE_PARAM);
    const legacyRecipeRouteId = currentUrl.searchParams.get(LEGACY_RECIPE_DETAIL_ROUTE_PARAM);
    const currentPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    const isAlreadyOnRecipeRoute = currentRecipeRouteId === recipe.id || legacyRecipeRouteId === recipe.id;
    const currentState = window.history.state;

    if (!isAlreadyOnRecipeRoute) {
      modalRouteWasPushedRef.current = true;
      window.history.pushState(
        {
          ...(currentState && typeof currentState === 'object' ? currentState : {}),
          [RECIPE_DETAIL_HISTORY_KEY]: modalHistoryId,
        },
        '',
        nextPath
      );
    } else if (currentState?.[RECIPE_DETAIL_HISTORY_KEY] !== modalHistoryId || currentPath !== nextPath) {
      window.history.replaceState(
        {
          ...(currentState && typeof currentState === 'object' ? currentState : {}),
          [RECIPE_DETAIL_HISTORY_KEY]: modalHistoryId,
        },
        '',
        nextPath
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.[RECIPE_DETAIL_HISTORY_KEY] !== modalHistoryId) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      const activeUrl = new URL(window.location.href);
      if (
        activeUrl.searchParams.get(RECIPE_DETAIL_ROUTE_PARAM) === recipe.id &&
        window.history.state?.[RECIPE_DETAIL_HISTORY_KEY] === modalHistoryId &&
        modalBaseUrlRef.current
      ) {
        const cleanupState = window.history.state && typeof window.history.state === 'object'
          ? { ...window.history.state }
          : {};
        delete cleanupState[RECIPE_DETAIL_HISTORY_KEY];
        window.history.replaceState(cleanupState, '', modalBaseUrlRef.current);
      }
    };
  }, [recipe.id]);

  function requestClose() {
    if (
      modalRouteWasPushedRef.current &&
      window.history.state?.[RECIPE_DETAIL_HISTORY_KEY] === modalHistoryIdRef.current
    ) {
      window.history.back();
      return;
    }

    if (modalBaseUrlRef.current) {
      const currentState = window.history.state;
      const nextState = currentState && typeof currentState === 'object'
        ? { ...currentState }
        : {};
      delete nextState[RECIPE_DETAIL_HISTORY_KEY];
      window.history.replaceState(nextState, '', modalBaseUrlRef.current);
    }

    onClose();
  }

  const handleDelete = () => {
    onDelete?.();
  };

  // Type guard for ClientRecipe with owner info
  const ownerName = 'ownerName' in recipe ? recipe.ownerName : null;
  const ownerId = 'ownerId' in recipe ? recipe.ownerId : null;

  return (
    <ModalOverlay onClose={requestClose}>
      <div className="modal-content modal-detail">
        <button className="modal-close" onClick={requestClose} aria-label="Close">
          <X size={20} strokeWidth={2} />
        </button>

        <div className="detail-header swipe-close-region" {...closeSwipeHandlers}>
          <div className="detail-image">
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.title} />
            ) : (
              <div className="detail-image-placeholder">
                <DinoMascot size={100} />
              </div>
            )}
          </div>

          <div className="detail-info">
            <h2 className="detail-title">{recipe.title}</h2>
            {ownerName && (
              <button
                className="detail-author"
                onClick={() => {
                  if (ownerId) {
                    onClose();
                    navigate(`/profiles/${ownerId}`);
                  }
                }}
                disabled={!ownerId}
              >
                <User size={14} />
                by {ownerName}
              </button>
            )}
            <p className="detail-description">{recipe.description}</p>

            <div className="detail-meta">
              {recipe.prepTime && (
                <div className="meta-block">
                  <Clock size={16} strokeWidth={2} />
                  <div>
                    <span className="meta-label">Prep</span>
                    <span className="meta-value">{recipe.prepTime}</span>
                  </div>
                </div>
              )}
              {recipe.cookTime && (
                <div className="meta-block">
                  <ChefHat size={16} strokeWidth={2} />
                  <div>
                    <span className="meta-label">Cook</span>
                    <span className="meta-value">{recipe.cookTime}</span>
                  </div>
                </div>
              )}
              {recipe.servings && (
                <div className="meta-block">
                  <Users size={16} strokeWidth={2} />
                  <div>
                    <span className="meta-label">Serves</span>
                    <span className="meta-value">{recipe.servings}</span>
                  </div>
                </div>
              )}
            </div>

            {recipe.tags.length > 0 && (
              <div className="detail-tags">
                {recipe.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}

            <div className="detail-actions-row">
              <button
                className="btn-secondary detail-icon-action"
                onClick={() => setShowShareModal(true)}
                aria-label="Share"
                title="Share"
              >
                <Share2 size={16} strokeWidth={2} />
                <span>Share</span>
              </button>
              {hasSaveAction && onSave ? (
                <button
                  className="btn-primary detail-icon-action"
                  onClick={onSave}
                  disabled={isSaving || isSaved}
                  aria-label={publicSaveLabel}
                  title={publicSaveLabel}
                >
                  {isSaving ? (
                    <Loader2 size={16} strokeWidth={2} className="spin" />
                  ) : isSaved ? (
                    <Check size={16} strokeWidth={2} />
                  ) : (
                    <Heart size={16} strokeWidth={2} />
                  )}
                  <span>{publicSaveLabel}</span>
                </button>
              ) : null}
              <button
                className="btn-secondary detail-icon-action"
                onClick={() => downloadRecipePdf(recipe)}
                aria-label="Download PDF"
                title="Download PDF"
              >
                <Download size={16} strokeWidth={2} />
                <span>Download PDF</span>
              </button>
              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                  <span>View Original</span>
                  <ExternalLink size={14} strokeWidth={2} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="detail-body">
          <section className="detail-section">
            <h3>Ingredients</h3>
            <ul className="ingredients-list">
              {recipe.ingredients.map((ingredient, idx) => (
                <li key={idx}>
                  <input type="checkbox" id={`ing-${idx}`} />
                  <label htmlFor={`ing-${idx}`}>{ingredient}</label>
                </li>
              ))}
            </ul>
          </section>

          <section className="detail-section">
            <h3>Instructions</h3>
            <ol className="instructions-list">
              {recipe.instructions.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </section>
        </div>

        {!readOnly && !isPublicView && (onEdit || onDelete) && (
          <div className="detail-footer">
            {onEdit && (
              <button className="btn-secondary" onClick={onEdit}>
                <PenLine size={16} strokeWidth={2} />
                <span>Edit</span>
              </button>
            )}
            {onDelete && (
              <button className="btn-danger" onClick={handleDelete}>
                <Trash2 size={16} strokeWidth={2} />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showShareModal && (
        <ShareRecipeModal
          recipe={recipe}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </ModalOverlay>
  );
}
