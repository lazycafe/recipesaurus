import { useState } from 'react';
import { X, Mail, Link, Copy, Check } from 'lucide-react';
import { compressToEncodedURIComponent } from 'lz-string';
import { Recipe } from '../client/types';
import { Recipe as LocalRecipe } from '../types/Recipe';
import { ModalOverlay } from './ModalOverlay';

interface ShareRecipeModalProps {
  recipe: Recipe | LocalRecipe;
  onClose: () => void;
}

export function ShareRecipeModal({ recipe, onClose }: ShareRecipeModalProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'link'>('link');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
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
    const encoded = compressToEncodedURIComponent(JSON.stringify(shareData));
    return `${window.location.origin}/preview/${encoded}`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const url = getShareUrl();
    const subject = encodeURIComponent(`Check out this recipe: ${recipe.title}`);
    const body = encodeURIComponent(
      `I wanted to share this recipe with you!\n\n${recipe.title}\n${recipe.description}\n\nView the full recipe here: ${url}`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    setEmail('');
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
              <div className="share-input-group">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email address"
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!email.trim()}
                >
                  Share
                </button>
              </div>
            </form>
            <p className="share-link-info">
              This will open your email client with a pre-filled message containing the recipe link.
            </p>
          </div>
        ) : (
          <div className="share-content">
            <p className="share-link-info">
              Anyone with the link can view this recipe without signing in.
            </p>

            <div className="share-link-item">
              <code className="share-link-url">
                {getShareUrl().slice(0, 50)}...
              </code>
              <div className="share-link-actions">
                <button
                  className="btn-icon"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
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
