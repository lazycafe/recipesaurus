import { CSSProperties } from 'react';

interface DinoMascotProps {
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export function DinoMascot({ size = 120, style, className }: DinoMascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={style}
      className={className}
    >
      {/* Tail */}
      <path
        d="M 78 55 Q 92 50 95 58 Q 92 62 85 58"
        fill="currentColor"
        opacity="0.85"
      />

      {/* Tail spikes (thagomizer) */}
      <ellipse cx="92" cy="48" rx="4" ry="8" fill="currentColor" opacity="0.9" transform="rotate(-30 92 48)"/>
      <ellipse cx="96" cy="54" rx="3" ry="7" fill="currentColor" opacity="0.9" transform="rotate(-10 96 54)"/>
      <ellipse cx="94" cy="62" rx="3" ry="7" fill="currentColor" opacity="0.9" transform="rotate(20 94 62)"/>
      <ellipse cx="88" cy="66" rx="3" ry="6" fill="currentColor" opacity="0.9" transform="rotate(40 88 66)"/>

      {/* Body - large and round with arched back */}
      <ellipse cx="52" cy="58" rx="30" ry="22" fill="currentColor" opacity="0.9"/>

      {/* Belly */}
      <ellipse cx="52" cy="64" rx="20" ry="14" fill="currentColor" opacity="0.5"/>

      {/* Back plates - diamond shaped, in a row */}
      <path d="M 28 42 L 34 28 L 40 42 L 34 48 Z" fill="currentColor" opacity="0.8"/>
      <path d="M 40 38 L 48 20 L 56 38 L 48 48 Z" fill="currentColor" opacity="0.85"/>
      <path d="M 54 38 L 62 22 L 70 38 L 62 46 Z" fill="currentColor" opacity="0.8"/>
      <path d="M 66 44 L 72 32 L 78 44 L 72 50 Z" fill="currentColor" opacity="0.75"/>

      {/* Neck */}
      <ellipse cx="28" cy="52" rx="12" ry="14" fill="currentColor" opacity="0.88"/>

      {/* Head - small and cute */}
      <ellipse cx="18" cy="44" rx="14" ry="12" fill="currentColor" opacity="0.9"/>

      {/* Snout - beak-like */}
      <ellipse cx="10" cy="48" rx="8" ry="6" fill="currentColor" opacity="0.85"/>

      {/* Eye white */}
      <ellipse cx="20" cy="42" rx="6" ry="7" fill="white"/>

      {/* Pupil */}
      <circle cx="21" cy="41" r="3.5" fill="#1a1a1a"/>

      {/* Eye shine */}
      <circle cx="22.5" cy="39.5" r="1.5" fill="white"/>

      {/* Nostril */}
      <circle cx="6" cy="47" r="1.5" fill="currentColor" opacity="0.5"/>

      {/* Smile */}
      <path
        d="M 8 52 Q 12 56 18 54"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Blush */}
      <ellipse cx="24" cy="50" rx="4" ry="2.5" fill="currentColor" opacity="0.4"/>

      {/* Front legs - shorter */}
      <ellipse cx="36" cy="78" rx="7" ry="10" fill="currentColor" opacity="0.85"/>
      <ellipse cx="36" cy="86" rx="8" ry="5" fill="currentColor" opacity="0.85"/>

      {/* Back legs - taller */}
      <ellipse cx="68" cy="74" rx="9" ry="14" fill="currentColor" opacity="0.85"/>
      <ellipse cx="68" cy="86" rx="10" ry="5" fill="currentColor" opacity="0.85"/>

      {/* Toes */}
      <circle cx="30" cy="88" r="2" fill="currentColor" opacity="0.6"/>
      <circle cx="36" cy="89" r="2" fill="currentColor" opacity="0.6"/>
      <circle cx="42" cy="88" r="2" fill="currentColor" opacity="0.6"/>

      <circle cx="60" cy="88" r="2.5" fill="currentColor" opacity="0.6"/>
      <circle cx="68" cy="89" r="2.5" fill="currentColor" opacity="0.6"/>
      <circle cx="76" cy="88" r="2.5" fill="currentColor" opacity="0.6"/>
    </svg>
  );
}
