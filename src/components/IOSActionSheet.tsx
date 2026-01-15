import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './IOSActionSheet.css';

interface ActionSheetOption {
  value: string;
  label: string;
}

interface IOSActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  options: ActionSheetOption[];
  selectedValue?: string;
  title?: string;
}

/**
 * iOS-style action sheet for selecting from a list of options.
 * Slides up from the bottom with a cancel button.
 */
export function IOSActionSheet({
  isOpen,
  onClose,
  onSelect,
  options,
  selectedValue,
  title,
}: IOSActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  const content = (
    <div className="ios-action-sheet-overlay" onClick={onClose}>
      <div
        className="ios-action-sheet"
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="action-sheet-options">
          {title && <div className="action-sheet-title">{title}</div>}
          {options.map((option) => (
            <button
              key={option.value}
              className={`action-sheet-option ${selectedValue === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
              {selectedValue === option.value && (
                <span className="checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
        <button className="action-sheet-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
