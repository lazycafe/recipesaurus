import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Camera, ChefHat, Edit3, Loader2, UserPlus, Users, X, Check, UserMinus, BookOpen, CheckCircle } from 'lucide-react';
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
  const [friendEmail, setFriendEmail] = useState('');
  const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState<ProfileUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendRequestSuccessName, setFriendRequestSuccessName] = useState<string | null>(null);

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
      showToast({ message: friendsError, type: 'error' });
    }
    setIsLoadingFriends(false);
  };

  const openFriends = async () => {
    setShowFriends(true);
    await loadFriends();
  };

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    const result = await updateProfile({
      name: draftName,
      avatarUrl: draftAvatarUrl.trim() || null,
    });
    setIsSavingProfile(false);

    if (result.success) {
      setIsEditing(false);
      await loadProfile();
      showToast({ message: 'Profile updated', type: 'success' });
    } else {
      showToast({ message: result.error || 'Profile update failed', type: 'error' });
    }
  };

  const handleAddFriendByEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!friendEmail.trim()) return;

    setIsFriendActionLoading(true);
    const { data, error: friendError } = await client.profile.addFriend({ email: friendEmail.trim() });
    setIsFriendActionLoading(false);

    if (data?.friend) {
      setFriendEmail('');
      await loadProfile();
      if (showFriends) {
        await loadFriends();
      }
      setFriendRequestSuccessName(data.friend.name);
    } else {
      showToast({ message: friendError || 'Could not add friend', type: 'error' });
    }
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

    await loadProfile();
    if (profile.isFriend) {
      showToast({ message: 'Friend removed', type: 'success' });
    } else {
      setFriendRequestSuccessName(profile.user.name);
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

  const cookbooks = profile.cookbooks.map(mapCookbook);

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
              <button className="btn-secondary profile-action-btn" onClick={() => setIsEditing(true)}>
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

      {profile.recipes.length > 0 ? (
        <Carousel title="Recipes">
          {profile.recipes.map(recipe => (
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
          <h2>No recipes yet</h2>
        </section>
      )}

      {cookbooks.length > 0 ? (
        <Carousel title="Cookbooks">
          {cookbooks.map(cookbook => (
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
          <h2>No cookbooks yet</h2>
        </section>
      )}

      {isEditing && (
        <ModalOverlay onClose={() => setIsEditing(false)}>
          <div className="modal-content profile-edit-modal">
            <button className="modal-close" onClick={() => setIsEditing(false)} aria-label="Close">
              <X size={20} />
            </button>
            <form onSubmit={handleSaveProfile}>
              <div className="profile-edit-header">
                <UserAvatar name={draftName || profile.user.name} avatarUrl={draftAvatarUrl} size="lg" />
                <h2>Edit Profile</h2>
              </div>

              <label className="profile-form-field">
                <span>Display name</span>
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={80}
                  required
                />
              </label>

              <label className="profile-form-field">
                <span>Profile picture URL</span>
                <div className="profile-input-row">
                  <Camera size={18} />
                  <input
                    type="url"
                    value={draftAvatarUrl}
                    onChange={(event) => setDraftAvatarUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </label>

              <div className="profile-edit-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
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
                    onChange={(event) => setFriendEmail(event.target.value)}
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

            {isLoadingFriends ? (
              <div className="friends-modal-loading">
                <Loader2 size={24} className="spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="friends-modal-empty">No friends yet</div>
            ) : (
              <div className="friends-list">
                {friends.map(friend => (
                  <Link
                    key={friend.id}
                    to={`/profiles/${friend.id}`}
                    className="friend-list-item"
                    onClick={() => setShowFriends(false)}
                  >
                    <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} size="sm" />
                    <span>{friend.name}</span>
                  </Link>
                ))}
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

      {friendRequestSuccessName && (
        <ModalOverlay onClose={() => setFriendRequestSuccessName(null)} className="friend-request-success-overlay">
          <div className="friend-request-success-modal">
            <div className="friend-request-success-icon">
              <CheckCircle size={32} strokeWidth={1.8} />
            </div>
            <h3>Friend Request Sent</h3>
            <p>{`Friend request sent to ${friendRequestSuccessName}`}</p>
            <button className="btn-primary" onClick={() => setFriendRequestSuccessName(null)}>
              <Check size={16} />
              Done
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
