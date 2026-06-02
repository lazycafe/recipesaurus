import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChefHat, Edit3, Loader2, UserPlus, Users, X, Check, UserMinus, BookOpen, Upload, Trash2 } from 'lucide-react';
import { useClient } from '../client/ClientContext';
import type { Cookbook as ClientCookbook, ProfileUser, Recipe, UserProfile } from '../client/types';
import type { Cookbook } from '../types/Cookbook';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Carousel } from './Carousel';
import { CookbookCard } from './CookbookCard';
import { DinoMascot } from './DinoMascot';
import { ModalOverlay } from './ModalOverlay';
import { RecipeCardCompact } from './RecipeCardCompact';
import { RecipeDetail } from './RecipeDetail';
import { UserAvatar } from './UserAvatar';

function mapCookbook(cookbook: ClientCookbook): Cookbook {
  return {
    ...cookbook,
    description: cookbook.description || undefined,
    coverImage: cookbook.coverImage || undefined,
    ownerId: cookbook.ownerId,
    ownerName: cookbook.ownerName,
  };
}

type ModalFeedback = {
  type: 'success' | 'error';
  message: string;
};

const PROFILE_AVATAR_MAX_BYTES = 1024 * 1024;
const PROFILE_AVATAR_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const client = useClient();
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const targetUserId = userId || user?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileEditFeedback, setProfileEditFeedback] = useState<ModalFeedback | null>(null);
  const [friendEmail, setFriendEmail] = useState('');
  const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState<ProfileUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);
  const [friendsModalFeedback, setFriendsModalFeedback] = useState<ModalFeedback | null>(null);

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;

    setIsLoading(true);
    setError(null);
    const { data, error: profileError } = await client.profile.get(targetUserId);

    if (data?.profile) {
      setProfile(data.profile);
      setDraftName(data.profile.user.name);
      setDraftAvatarUrl(data.profile.user.avatarUrl || '');
    } else {
      setProfile(null);
      setError(profileError || 'Profile not found');
    }

    setIsLoading(false);
  }, [client, targetUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadFriends = async () => {
    if (!profile) return;
    setIsLoadingFriends(true);
    const { data, error: friendsError } = await client.profile.listFriends(profile.user.id);
    if (data?.friends) {
      setFriends(data.friends);
    } else if (friendsError) {
      setFriendsModalFeedback({
        type: 'error',
        message: friendsError,
      });
    }
    setIsLoadingFriends(false);
  };

  const openFriends = async () => {
    setFriendsModalFeedback(null);
    setShowFriends(true);
    await loadFriends();
  };

  const resetProfileDraft = () => {
    if (!profile) return;
    setDraftName(profile.user.name);
    setDraftAvatarUrl(profile.user.avatarUrl || '');
  };

  const openEditProfile = () => {
    resetProfileDraft();
    setProfileEditFeedback(null);
    setIsEditing(true);
  };

  const closeEditProfile = () => {
    resetProfileDraft();
    setProfileEditFeedback(null);
    setIsEditing(false);
  };

  const setProfileEditError = (message: string) => {
    setProfileEditFeedback({
      type: 'error',
      message,
    });
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) return;

    if (!PROFILE_AVATAR_ALLOWED_TYPES.has(file.type)) {
      setProfileEditError('Profile picture must be a PNG, JPG, WebP, or GIF image');
      return;
    }

    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
      setProfileEditError('Profile picture must be less than 1MB');
      return;
    }

    setProfileEditFeedback(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setDraftAvatarUrl(reader.result);
      } else {
        setProfileEditError('Could not read profile picture. Please try again.');
      }
    };
    reader.onerror = () => {
      setProfileEditError('Could not read profile picture. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileEditFeedback(null);
    const result = await updateProfile({
      name: draftName,
      avatarUrl: draftAvatarUrl.trim() || null,
    });
    setIsSavingProfile(false);

    if (result.success) {
      setIsEditing(false);
      setProfileEditFeedback(null);
      await loadProfile();
      showToast({ message: 'Profile updated', type: 'success' });
    } else {
      setProfileEditError(result.error || 'Profile update failed');
    }
  };

  const handleAddFriendByEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!friendEmail.trim()) return;

    setIsFriendActionLoading(true);
    setFriendsModalFeedback(null);
    const { data, error: friendError } = await client.profile.addFriend({ email: friendEmail.trim() });
    setIsFriendActionLoading(false);

    if (data?.friend) {
      setFriendEmail('');
      setFriendsModalFeedback({
        type: 'success',
        message: `Friend request sent to ${data.friend.name}`,
      });
    } else {
      setFriendsModalFeedback({
        type: 'error',
        message: friendError || 'Could not add friend',
      });
    }
  };

  const getFriendRemovalTarget = (friend: ProfileUser): ProfileUser | null => {
    if (!profile || !user) return null;
    if (profile.isCurrentUser) return friend;
    if (profile.isFriend && friend.id === user.id) return profile.user;
    return null;
  };

  const handleRemoveFriendFromModal = async (friend: ProfileUser) => {
    const removalTarget = getFriendRemovalTarget(friend);
    if (!removalTarget) return;

    setRemovingFriendId(friend.id);
    setFriendsModalFeedback(null);
    const { error: removeError } = await client.profile.removeFriend(removalTarget.id);
    setRemovingFriendId(null);

    if (removeError) {
      setFriendsModalFeedback({
        type: 'error',
        message: removeError || 'Could not remove friend',
      });
      return;
    }

    setFriends(current => current.filter(item => item.id !== friend.id));
    setProfile(current => current
      ? {
          ...current,
          friendCount: Math.max(0, current.friendCount - 1),
          isFriend: current.isCurrentUser ? current.isFriend : false,
        }
      : current
    );
    setFriendsModalFeedback({
      type: 'success',
      message: `${removalTarget.name} removed from friends`,
    });
  };

  const handleToggleFriend = async () => {
    if (!profile) return;

    setIsFriendActionLoading(true);
    const result = profile.isFriend
      ? await client.profile.removeFriend(profile.user.id)
      : await client.profile.addFriend({ userId: profile.user.id });
    setIsFriendActionLoading(false);

    if (result.error) {
      showToast({ message: result.error, type: 'error' });
      return;
    }

    if (profile.isFriend) {
      await loadProfile();
      showToast({ message: 'Friend removed', type: 'success' });
    } else {
      setProfile(current => current ? { ...current, hasPendingFriendRequest: true } : current);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page profile-loading">
        <Loader2 size={32} className="spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-page profile-empty">
        <DinoMascot size={84} />
        <h1>Profile not found</h1>
        <button className="btn-secondary" onClick={() => navigate('/discover/recipes')}>
          <ChefHat size={16} />
          Discover recipes
        </button>
      </div>
    );
  }

  const publicRecipes = profile.recipes.filter(recipe => recipe.isPublic);
  const publicCookbooks = profile.cookbooks.filter(cookbook => cookbook.isPublic).map(mapCookbook);

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <UserAvatar
          name={profile.user.name}
          avatarUrl={profile.user.avatarUrl}
          size="xl"
          className="profile-hero-avatar"
        />

        <div className="profile-hero-main">
          <div className="profile-title-row">
            <h1>{profile.user.name}</h1>
            {profile.isCurrentUser ? (
              <button className="btn-secondary profile-action-btn" onClick={openEditProfile}>
                <Edit3 size={16} />
                Edit
              </button>
            ) : (
              <button
                className={`btn-secondary profile-action-btn ${profile.isFriend ? 'friend' : ''}`}
                onClick={handleToggleFriend}
                disabled={isFriendActionLoading || profile.hasPendingFriendRequest}
              >
                {isFriendActionLoading ? (
                  <Loader2 size={16} className="spin" />
                ) : profile.isFriend ? (
                  <UserMinus size={16} />
                ) : profile.hasPendingFriendRequest ? (
                  <Check size={16} />
                ) : (
                  <UserPlus size={16} />
                )}
                {profile.isFriend ? 'Remove Friend' : profile.hasPendingFriendRequest ? 'Request Sent' : 'Add Friend'}
              </button>
            )}
          </div>

          <div className="profile-stats">
            <button className="profile-stat profile-stat-button" onClick={openFriends}>
              <strong>{profile.friendCount}</strong>
              <span>Friends</span>
            </button>
            <div className="profile-stat">
              <strong>{profile.recipeCount}</strong>
              <span>Recipes</span>
            </div>
            <div className="profile-stat">
              <strong>{profile.cookbookCount}</strong>
              <span>Cookbooks</span>
            </div>
          </div>
        </div>
      </section>

      {publicRecipes.length > 0 ? (
        <Carousel title="Public Recipes">
          {publicRecipes.map(recipe => (
            <RecipeCardCompact
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipe(recipe)}
              showActions={false}
            />
          ))}
        </Carousel>
      ) : (
        <section className="profile-section-empty">
          <ChefHat size={24} />
          <h2>No public recipes yet</h2>
        </section>
      )}

      {publicCookbooks.length > 0 ? (
        <Carousel title="Public Cookbooks">
          {publicCookbooks.map(cookbook => (
            <CookbookCard
              key={cookbook.id}
              cookbook={cookbook}
              onClick={() => navigate(cookbook.isPublic && !cookbook.isOwner ? `/discover/cookbooks/${cookbook.id}` : `/cookbooks/${cookbook.id}`)}
            />
          ))}
        </Carousel>
      ) : (
        <section className="profile-section-empty">
          <BookOpen size={24} />
          <h2>No public cookbooks yet</h2>
        </section>
      )}

      {isEditing && (
        <ModalOverlay onClose={closeEditProfile}>
          <div className="modal-content profile-edit-modal">
            <button className="modal-close" onClick={closeEditProfile} aria-label="Close">
              <X size={20} />
            </button>
            <form onSubmit={handleSaveProfile}>
              <div className="profile-edit-header">
                <h2>Edit Profile</h2>
              </div>

              <label className="profile-form-field">
                <span>Display name</span>
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    setProfileEditFeedback(null);
                  }}
                  maxLength={80}
                  required
                />
              </label>

              <div className="profile-form-field">
                <span>Profile picture</span>
                <div className="profile-avatar-upload">
                  <div className="profile-avatar-upload-preview">
                    <UserAvatar name={draftName || profile.user.name} avatarUrl={draftAvatarUrl} size="lg" />
                    <div>
                      <p>Upload a square image for the best crop.</p>
                      <span className="upload-hint">PNG, JPG, WebP, or GIF up to 1MB</span>
                    </div>
                  </div>
                  <div className="profile-avatar-upload-actions">
                    <input
                      id="profile-avatar-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleAvatarUpload}
                      className="file-input-hidden"
                      aria-label="Upload profile picture"
                    />
                    <label htmlFor="profile-avatar-upload" className="btn-secondary profile-avatar-upload-button">
                      <Upload size={16} />
                      Upload Photo
                    </label>
                    {draftAvatarUrl && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setDraftAvatarUrl('');
                          setProfileEditFeedback(null);
                        }}
                      >
                        <Trash2 size={16} />
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {profileEditFeedback && (
                <div
                  className={`profile-modal-feedback ${profileEditFeedback.type}`}
                  role={profileEditFeedback.type === 'error' ? 'alert' : 'status'}
                >
                  {profileEditFeedback.type === 'success' ? <Check size={16} /> : <X size={16} />}
                  <span>{profileEditFeedback.message}</span>
                </div>
              )}

              <div className="profile-edit-actions">
                <button type="button" className="btn-secondary" onClick={closeEditProfile}>
                  <X size={16} />
                  Cancel
                </button>
                <button className="btn-primary" disabled={isSavingProfile}>
                  {isSavingProfile ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {showFriends && (
        <ModalOverlay onClose={() => setShowFriends(false)}>
          <div className="modal-content friends-modal">
            <button className="modal-close" onClick={() => setShowFriends(false)} aria-label="Close">
              <X size={20} />
            </button>
            <div className="friends-modal-header">
              <Users size={20} />
              <h2>{profile.user.name}'s Friends</h2>
            </div>

            {profile.isCurrentUser && (
              <form className="friends-modal-add" onSubmit={handleAddFriendByEmail}>
                <div className="profile-input-row">
                  <Users size={18} />
                  <input
                    type="email"
                    value={friendEmail}
                    onChange={(event) => {
                      setFriendEmail(event.target.value);
                      setFriendsModalFeedback(null);
                    }}
                    placeholder="friend@example.com"
                    aria-label="Friend email"
                  />
                </div>
                <button className="btn-primary" disabled={isFriendActionLoading || !friendEmail.trim()}>
                  {isFriendActionLoading ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
                  Add Friend
                </button>
              </form>
            )}

            {friendsModalFeedback && (
              <div
                className={`friends-modal-feedback ${friendsModalFeedback.type}`}
                role={friendsModalFeedback.type === 'error' ? 'alert' : 'status'}
              >
                {friendsModalFeedback.type === 'success' ? <Check size={16} /> : <X size={16} />}
                <span>{friendsModalFeedback.message}</span>
              </div>
            )}

            {isLoadingFriends ? (
              <div className="friends-modal-loading">
                <Loader2 size={24} className="spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="friends-modal-empty">No friends yet</div>
            ) : (
              <div className="friends-list">
                {friends.map(friend => {
                  const removalTarget = getFriendRemovalTarget(friend);

                  return (
                    <div key={friend.id} className="friend-list-item">
                      <Link
                        to={`/profiles/${friend.id}`}
                        className="friend-list-link"
                        onClick={() => setShowFriends(false)}
                      >
                        <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} size="sm" />
                        <span>{friend.name}</span>
                      </Link>
                      {removalTarget && (
                        <button
                          type="button"
                          className="friend-remove-button"
                          onClick={() => handleRemoveFriendFromModal(friend)}
                          disabled={removingFriendId === friend.id}
                          aria-label={`Remove ${removalTarget.name}`}
                          title={`Remove ${removalTarget.name}`}
                        >
                          {removingFriendId === friend.id ? (
                            <Loader2 size={16} className="spin" />
                          ) : (
                            <UserMinus size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ModalOverlay>
      )}

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          readOnly={!profile.isCurrentUser}
          isPublicView={!selectedRecipe.isOwner}
        />
      )}
    </div>
  );
}
