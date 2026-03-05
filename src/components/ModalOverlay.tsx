import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalOverlayProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function ModalOverlay({ onClose, children, className = '' }: ModalOverlayProps) {
  const mouseDownTarget = useRef<EventTarget | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownTarget.current = e.target;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Only close if both mousedown and mouseup were on the overlay itself
    if (mouseDownTarget.current === e.currentTarget && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownTarget.current = null;
  };

  return createPortal(
    <div
      className={`modal-overlay ${className}`.trim()}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </div>,
    document.body
  );
}
