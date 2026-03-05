import { AlertTriangle, Info } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const Icon = variant === 'info' ? Info : AlertTriangle;

  return (
    <ModalOverlay onClose={onCancel} className="confirm-modal-overlay">
      <div className="confirm-modal">
        <div className={`confirm-modal-icon ${variant}`}>
          <Icon size={28} strokeWidth={1.5} />
        </div>

        <h3>{title}</h3>
        <p>{message}</p>

        <div className="confirm-modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
