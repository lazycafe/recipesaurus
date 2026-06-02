import { useEffect, useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

export function UserAvatar({ name, avatarUrl, size = 'md', className = '' }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getInitials(name);
  const showImage = !!avatarUrl && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  return (
    <div className={`profile-avatar profile-avatar-${size} ${className}`.trim()}>
      {showImage ? (
        <img src={avatarUrl} alt={name} onError={() => setImageFailed(true)} />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User size={size === 'xl' ? 40 : size === 'lg' ? 28 : 18} strokeWidth={2} />
      )}
    </div>
  );
}
