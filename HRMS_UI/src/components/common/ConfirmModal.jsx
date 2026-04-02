import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import './ConfirmModal.css';

/**
 * Reusable Confirmation Modal
 * @param {Boolean} isOpen - Modal visibility
 * @param {String} title - Modal title
 * @param {String} message - Body text
 * @param {Function} onConfirm - Function to run on OK
 * @param {Function} onCancel - Function to run on Cancel
 * @param {String} confirmText - Button text (Default: OK)
 * @param {String} cancelText - Button text (Default: Cancel)
 * @param {Boolean} isDestructive - Styles confirm button red if true
 */
const ConfirmModal = ({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
  isDestructive = false
}) => {

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {isDestructive ? (
            <AlertTriangle size={24} color="#ef4444" />
          ) : (
            <AlertCircle size={24} color="var(--primary-color)" />
          )}
          <h3 className="modal-title">{title}</h3>
        </div>
        
        <p className="modal-message">{message}</p>
        
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`btn-confirm ${isDestructive ? 'destructive' : ''}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
