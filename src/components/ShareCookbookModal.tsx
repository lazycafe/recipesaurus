import { useState, useEffect } from 'react';
import { X, Loader2, Mail, Link, Copy, Check, Trash2 } from 'lucide-react';
import { Cookbook, CookbookShare, CookbookShareLink } from '../types/Cookbook';
import { cookbooksApi } from '../utils/api';
import { ConfirmModal } from './ConfirmModal';

interface ShareCookbookModalProps {
  cookbook: Cookbook;
  onClose: () => void;
}

export function ShareCookbookModal({ cookbook, onClose }: ShareCookbookModalProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'link'>('email');
  const [email, setEmail] = useState('');
  const [shares, setShares] = useState<CookbookShare[]>([]);
  const [links, setLinks] = useState<CookbookShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [removeShareUserId, setRemoveShareUserId] = useState<string | null>(null);
  const [revokeLinkId, setRevokeLinkId] = useState<string | null>(null);

  useEffect(() => {
    fetchShares();
  }, [cookbook.id]);

  const fetchShares = async () => {
    setIsLoading(true);
    const { data } = await cookbooksApi.getShares(cookbook.id);
    if (data) {
      setShares(data.shares);
      setLinks(data.links.filter(l => l.isActive));
    }
    setIsLoading(false);
  };

  const handleShareByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const { data, error: apiError } = await cookbooksApi.shareByEmail(cookbook.id, email.trim());

    if (apiError) {
      setError(apiError);
    } else if (data?.sharedWith) {
      setSuccess(`Shared with ${data.sharedWith.name}`);
      setEmail('');
      fetchShares();
    }

    setIsSubmitting(false);
  };

  const handleRemoveShare = async (userId: string) => {
    setRemoveShareUserId(userId);
  };

  const confirmRemoveShare = async () => {
    if (!removeShareUserId) return;
    const { error: apiError } = await cookbooksApi.removeShare(cookbook.id, removeShareUserId);
    if (!apiError) {
      setShares(prev => prev.filter(s => s.userId !== removeShareUserId));
    }
    setRemoveShareUserId(null);
  };

  const handleCreateLink = async () => {
    setIsSubmitting(true);
    const { data, error: apiError } = await cookbooksApi.createShareLink(cookbook.id);
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
    const { error: apiError } = await cookbooksApi.revokeShareLink(cookbook.id, revokeLinkId);
    if (!apiError) {
      setLinks(prev => prev.filter(l => l.id !== revokeLinkId));
    }
    setRevokeLinkId(null);
  };

  const copyToClipboard = async (token: string, linkId: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} strokeWidth={2} />
        </button>

        <h2>Share "{cookbook.name}"</h2>

        <div className="share-tabs">
          <button
            className={`share-tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={16} />
            Share by Email
          </button>
          <button
            className={`share-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <Link size={16} />
            Share Link
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <Loader2 size={24} className="spin" />
          </div>
        ) : activeTab === 'email' ? (
          <div className="share-content">
            <form onSubmit={handleShareByEmail}>
              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}

              <div className="share-input-group">
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setError('');
                    setSuccess('');
                  }}
                  placeholder="Enter email address"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || !email.trim()}
                >
                  {isSubmitting ? <Loader2 size={16} className="spin" /> : 'Share'}
                </button>
              </div>
            </form>

            {shares.length > 0 && (
              <div className="share-list">
                <h4>Shared with</h4>
                {shares.map(share => (
                  <div key={share.id} className="share-item">
                    <div className="share-item-info">
                      <span className="share-item-name">{share.userName}</span>
                      <span className="share-item-email">{share.userEmail}</span>
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
            <p className="share-link-info">
              Anyone with the link can view this cookbook without signing in.
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
                    <code className="share-link-url">
                      {window.location.origin}/shared/{link.token.slice(0, 8)}...
                    </code>
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
    </div>
  );
}
