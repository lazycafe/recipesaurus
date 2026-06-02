import { useEffect, useState } from 'react';
import { X, Link, Copy, Check, Loader2, Users } from 'lucide-react';
import { ProfileUser, Recipe, RecipeSharePayload } from '../client/types';
import { Recipe as LocalRecipe } from '../types/Recipe';
import { ModalOverlay } from './ModalOverlay';
import { useClient } from '../client/ClientContext';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface ShareRecipeModalProps {
  recipe: Recipe | LocalRecipe;
  onClose: () => void;
}

export function ShareRecipeModal({ recipe, onClose }: ShareRecipeModalProps) {
  const client = useClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'link'>('user');
  const [friends, setFriends] = useState<ProfileUser[]>([]);
  const [pendingShareUserIds, setPendingShareUserIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [sharingUserId, setSharingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getSharePayload = (): RecipeSharePayload => ({
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl || '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadFriends = async () => {
      setIsLoadingFriends(true);
      if (!user) {
        if (isMounted) {
          setFriends([]);
          setError('Sign in to share with users');
          setIsLoadingFriends(false);
        }
        return;
      }

      const { data, error: friendsError } = await client.profile.listFriends(user.id);
      if (!isMounted) return;

      if (data?.friends) {
        setFriends(data.friends);
        setError('');
      } else if (friendsError) {
        setError(friendsError);
      }
      setIsLoadingFriends(false);
    };

    loadFriends();

    return () => {
      isMounted = false;
    };
  }, [client, user]);

  const createShareUrl = async () => {
    if (shareUrl) return shareUrl;

    setIsCreatingLink(true);
    setError('');

    try {
      const { data, error: apiError } = await client.recipes.createShareLink(getSharePayload());

      if (!data) {
        const message = apiError || 'Unable to create share link';
        setError(message);
        throw new Error(message);
      }

      const url = `${window.location.origin}/shared-recipe/${data.token}`;
      setShareUrl(url);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create share link';
      setError(message);
      throw err;
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleShareWithUser = async (friend: ProfileUser) => {
    if (sharingUserId) return;

    setSharingUserId(friend.id);
    setError('');
    setSuccess('');

    const { data, error: apiError } = await client.recipes.shareWithUser(getSharePayload(), friend.id);
    if (apiError) {
      setError(apiError);
    } else if (data?.sharedWith) {
      setSuccess(`Shared with ${data.sharedWith.name}`);
      setPendingShareUserIds(current => new Set(current).add(friend.id));
      if (data.shareLink?.token) {
        setShareUrl(`${window.location.origin}/shared-recipe/${data.shareLink.token}`);
      }
    }

    setSharingUserId(null);
  };

  const handleCopyLink = async () => {
    try {
      const url = await createShareUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Error state is set by createShareUrl.
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-content share-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} strokeWidth={2} />
        </button>

        <h2>Share "{recipe.title}"</h2>

        <div className="share-tabs">
          <button
            className={`share-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('user');
              setError('');
              setSuccess('');
            }}
          >
            <Users size={16} />
            Share with User
          </button>
          <button
            className={`share-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('link');
              setError('');
              setSuccess('');
            }}
          >
            <Link size={16} />
            Share Link
          </button>
        </div>

        {activeTab === 'user' ? (
          <div className="share-content">
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}

            <p className="share-link-info">
              Choose one of your Recipesaurus friends to send this recipe.
            </p>

            {isLoadingFriends ? (
              <div className="loading-state">
                <Loader2 size={24} className="spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="share-empty-state">Add friends before sharing recipes with users.</div>
            ) : (
              <div className="share-friend-list">
                {friends.map(friend => {
                  const isPending = pendingShareUserIds.has(friend.id);
                  const isSharing = sharingUserId === friend.id;

                  return (
                    <div key={friend.id} className="share-friend-item">
                      <div className="share-friend-info">
                        <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} size="sm" />
                        <div>
                          <span className="share-item-name">{friend.name}</span>
                          <span className="share-item-email">{isPending ? 'Shared' : 'Friend'}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary share-friend-action"
                        onClick={() => handleShareWithUser(friend)}
                        disabled={Boolean(sharingUserId) || isPending}
                      >
                        {isSharing ? <Loader2 size={16} className="spin" /> : isPending ? <Check size={16} /> : null}
                        {isPending ? 'Shared' : 'Share'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="share-content">
            {error && <div className="form-error">{error}</div>}

            <p className="share-link-info">
              Anyone with the link can view this recipe without signing in.
            </p>

            <div className="share-link-item">
              <code className="share-link-url">
                {shareUrl || 'Click copy to generate a share link'}
              </code>
              <div className="share-link-actions">
                <button
                  className="btn-icon"
                  onClick={handleCopyLink}
                  title="Copy link"
                  disabled={isCreatingLink}
                >
                  {isCreatingLink ? (
                    <Loader2 size={16} className="spin" />
                  ) : copied ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>

            {copied && (
              <p className="share-copied-message">Link copied to clipboard!</p>
            )}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
