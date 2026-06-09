import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Link, Copy, Check, Trash2, Users } from 'lucide-react';
import { Cookbook, CookbookShare, CookbookShareLink } from '../types/Cookbook';
import type { ProfileUser } from '../client/types';
import { useClient } from '../client/ClientContext';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';
import { ModalOverlay } from './ModalOverlay';
import { UserAvatar } from './UserAvatar';

interface ShareCookbookModalProps {
  cookbook: Cookbook;
  onClose: () => void;
}

export function ShareCookbookModal({ cookbook, onClose }: ShareCookbookModalProps) {
  const client = useClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'link'>('user');
  const [friends, setFriends] = useState<ProfileUser[]>([]);
  const [pendingInviteUserIds, setPendingInviteUserIds] = useState<Set<string>>(new Set());
  const [shares, setShares] = useState<CookbookShare[]>([]);
  const [links, setLinks] = useState<CookbookShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharingUserId, setSharingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [removeShareUserId, setRemoveShareUserId] = useState<string | null>(null);
  const [revokeLinkId, setRevokeLinkId] = useState<string | null>(null);

  const getShareUrl = (token: string) => `${window.location.origin}/shared/${token}`;
  const formatExpiry = (expiresAt: number) => new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(expiresAt));

  const fetchShareData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const sharesResult = await client.cookbooks.getShares(cookbook.id);
    if (sharesResult.data) {
      setShares(sharesResult.data.shares);
      setLinks(sharesResult.data.links.filter(l => l.isActive && (!l.expiresAt || l.expiresAt > Date.now())));
    } else if (sharesResult.error) {
      setError(sharesResult.error);
    }

    if (user) {
      const friendsResult = await client.profile.listFriends(user.id);
      if (friendsResult.data) {
        setFriends(friendsResult.data.friends);
      } else if (friendsResult.error) {
        setError(friendsResult.error);
      }
    } else {
      setFriends([]);
      setError('Sign in to share with users');
    }

    setIsLoading(false);
  }, [client, cookbook.id, user]);

  useEffect(() => {
    fetchShareData();
  }, [fetchShareData]);

  const handleTabChange = (tab: 'user' | 'link') => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  const handleShareWithUser = async (friend: ProfileUser) => {
    if (sharingUserId) return;

    setSharingUserId(friend.id);
    setError('');
    setSuccess('');

    const { data, error: apiError } = await client.cookbooks.shareWithUser(cookbook.id, friend.id);

    if (apiError) {
      setError(apiError);
    } else if (data?.sharedWith) {
      setSuccess(`Invite sent to ${data.sharedWith.name}`);
      setPendingInviteUserIds(current => new Set(current).add(friend.id));
    }

    setSharingUserId(null);
  };

  const handleRemoveShare = async (userId: string) => {
    setRemoveShareUserId(userId);
  };

  const confirmRemoveShare = async () => {
    if (!removeShareUserId) return;
    const { error: apiError } = await client.cookbooks.removeShare(cookbook.id, removeShareUserId);
    if (!apiError) {
      setShares(prev => prev.filter(s => s.userId !== removeShareUserId));
    }
    setRemoveShareUserId(null);
  };

  const handleCreateLink = async () => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const { data, error: apiError } = await client.cookbooks.createShareLink(cookbook.id);
    if (data) {
      setLinks(prev => [data, ...prev]);
    } else if (apiError) {
      setError(apiError);
    }
    setIsSubmitting(false);
  };

  const handleRevokeLink = async (linkId: string) => {
    setRevokeLinkId(linkId);
  };

  const confirmRevokeLink = async () => {
    if (!revokeLinkId) return;
    const { error: apiError } = await client.cookbooks.revokeShareLink(cookbook.id, revokeLinkId);
    if (!apiError) {
      setLinks(prev => prev.filter(l => l.id !== revokeLinkId));
    }
    setRevokeLinkId(null);
  };

  const copyToClipboard = async (token: string, linkId: string) => {
    const url = getShareUrl(token);
    await navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const sharedUserIds = new Set(shares.map(share => share.userId));

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-content share-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} strokeWidth={2} />
        </button>

        <h2>Share "{cookbook.name}"</h2>

        <div className="share-tabs">
          <button
            className={`share-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => handleTabChange('user')}
          >
            <Users size={16} />
            Share with User
          </button>
          <button
            className={`share-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => handleTabChange('link')}
          >
            <Link size={16} />
            Share Link
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <Loader2 size={24} className="spin" />
          </div>
        ) : activeTab === 'user' ? (
          <div className="share-content">
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}

            <p className="share-link-info">
              Choose one of your Recipesaurus friends to send a cookbook invitation.
            </p>

            {friends.length === 0 ? (
              <div className="share-empty-state">Add friends before sharing cookbooks with users.</div>
            ) : (
              <div className="share-friend-list">
                {friends.map(friend => {
                  const isShared = sharedUserIds.has(friend.id);
                  const isPending = pendingInviteUserIds.has(friend.id);
                  const isSharing = sharingUserId === friend.id;

                  return (
                    <div key={friend.id} className="share-friend-item">
                      <div className="share-friend-info">
                        <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} size="sm" />
                        <div>
                          <span className="share-item-name">{friend.name}</span>
                          <span className="share-item-email">
                            {isShared ? 'Already has access' : isPending ? 'Invite pending' : 'Friend'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary share-friend-action"
                        onClick={() => handleShareWithUser(friend)}
                        disabled={Boolean(sharingUserId) || isShared || isPending}
                      >
                        {isSharing ? <Loader2 size={16} className="spin" /> : isShared || isPending ? <Check size={16} /> : null}
                        {isShared ? 'Shared' : isPending ? 'Sent' : 'Share'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {shares.length > 0 && (
              <div className="share-list">
                <h4>Shared with</h4>
                {shares.map(share => (
                  <div key={share.id} className="share-item">
                    <div className="share-item-info">
                      <span className="share-item-name">{share.userName}</span>
                      <span className="share-item-email">Has access</span>
                    </div>
                    <button
                      className="share-item-remove"
                      onClick={() => handleRemoveShare(share.userId)}
                      title="Remove access"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="share-content">
            {error && <div className="form-error">{error}</div>}

            <p className="share-link-info">
              Anyone with the link can view this cookbook without signing in. Links expire after 30 days.
            </p>

            <button
              className="btn-secondary create-link-btn"
              onClick={handleCreateLink}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 size={16} className="spin" /> : <Link size={16} />}
              Generate New Link
            </button>

            {links.length > 0 && (
              <div className="share-links-list">
                <h4>Active Links</h4>
                {links.map(link => (
                  <div key={link.id} className="share-link-item">
                    <code className="share-link-url" title={getShareUrl(link.token)}>
                      {getShareUrl(link.token)}
                    </code>
                    {link.expiresAt && (
                      <span className="share-link-expiry">Expires {formatExpiry(link.expiresAt)}</span>
                    )}
                    <div className="share-link-actions">
                      <button
                        className="btn-icon"
                        onClick={() => copyToClipboard(link.token, link.id)}
                        title="Copy link"
                      >
                        {copiedLinkId === link.id ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <button
                        className="btn-icon btn-danger-icon"
                        onClick={() => handleRevokeLink(link.id)}
                        title="Revoke link"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {removeShareUserId && (
          <ConfirmModal
            title="Remove Access"
            message="Are you sure you want to remove access for this user?"
            confirmText="Remove"
            onConfirm={confirmRemoveShare}
            onCancel={() => setRemoveShareUserId(null)}
          />
        )}

        {revokeLinkId && (
          <ConfirmModal
            title="Revoke Link"
            message="Are you sure you want to revoke this share link? Anyone with this link will no longer be able to access the cookbook."
            confirmText="Revoke"
            onConfirm={confirmRevokeLink}
            onCancel={() => setRevokeLinkId(null)}
          />
        )}
      </div>
    </ModalOverlay>
  );
}
