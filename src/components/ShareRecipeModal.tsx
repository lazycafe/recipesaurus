import { useState } from 'react';
import { X, Mail, Link, Copy, Check, Loader2 } from 'lucide-react';
import { Recipe } from '../client/types';
import { Recipe as LocalRecipe } from '../types/Recipe';
import { ModalOverlay } from './ModalOverlay';
import { useClient } from '../client/ClientContext';

interface ShareRecipeModalProps {
  recipe: Recipe | LocalRecipe;
  onClose: () => void;
}

export function ShareRecipeModal({ recipe, onClose }: ShareRecipeModalProps) {
  const client = useClient();
  const [activeTab, setActiveTab] = useState<'email' | 'link'>('link');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [error, setError] = useState('');

  const createShareUrl = async () => {
    if (shareUrl) return shareUrl;

    setIsCreatingLink(true);
    setError('');

    const shareData = {
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      imageUrl: recipe.imageUrl,
      sourceUrl: recipe.sourceUrl || '',
    };

    try {
      const { data, error: apiError } = await client.recipes.createShareLink(shareData);

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

  const handleShareByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const url = await createShareUrl();
      const subject = encodeURIComponent(`Check out this recipe: ${recipe.title}`);
      const body = encodeURIComponent(
        `I wanted to share this recipe with you!\n\n${recipe.title}\n${recipe.description}\n\nView the full recipe here: ${url}`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
      setEmail('');
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

        {activeTab === 'email' ? (
          <div className="share-content">
            <form onSubmit={handleShareByEmail}>
              {error && <div className="form-error">{error}</div>}
              <div className="share-input-group">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  disabled={isCreatingLink}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!email.trim() || isCreatingLink}
                >
                  {isCreatingLink ? <Loader2 size={16} className="spin" /> : 'Share'}
                </button>
              </div>
            </form>
            <p className="share-link-info">
              This will open your email client with a pre-filled message containing the recipe link.
            </p>
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
