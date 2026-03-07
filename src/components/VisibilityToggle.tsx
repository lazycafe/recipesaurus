import { Globe, Lock } from 'lucide-react';

interface VisibilityToggleProps {
  isPublic: boolean;
  onChange: (isPublic: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function VisibilityToggle({
  isPublic,
  onChange,
  disabled = false,
  size = 'md',
  showLabel = true,
}: VisibilityToggleProps) {
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <button
      type="button"
      className={`visibility-toggle ${isPublic ? 'public' : 'private'} ${size} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onChange(!isPublic)}
      disabled={disabled}
      aria-label={isPublic ? 'Make private' : 'Make public'}
    >
      <span className="visibility-toggle-track">
        <span className="visibility-toggle-thumb">
          {isPublic ? <Globe size={iconSize} /> : <Lock size={iconSize} />}
        </span>
      </span>
      {showLabel && (
        <span className="visibility-toggle-label">
          {isPublic ? 'Public' : 'Private'}
        </span>
      )}
    </button>
  );
}

interface VisibilityBadgeProps {
  isPublic: boolean;
  size?: 'sm' | 'md';
}

export function VisibilityBadge({ isPublic, size = 'sm' }: VisibilityBadgeProps) {
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span className={`visibility-badge ${isPublic ? 'public' : 'private'} ${size}`}>
      {isPublic ? <Globe size={iconSize} /> : <Lock size={iconSize} />}
      {isPublic ? 'Public' : 'Private'}
    </span>
  );
}
