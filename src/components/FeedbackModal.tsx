'use client';

import { useState, useTransition, useEffect } from 'react';
import { sendFeedbackEmail, type FeedbackCategory } from '@/actions/feedback';
import './FeedbackModal.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'bug', label: 'Bug', emoji: '🐛' },
  { value: 'feature', label: 'Feature', emoji: '💡' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'other', label: 'Other', emoji: '💬' },
];

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setCategory(null);
      setSubject('');
      setDescription('');
      setIsSuccess(false);
      setError(null);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = () => {
    if (!category || !description.trim()) return;

    setError(null);

    startTransition(async () => {
      const result = await sendFeedbackEmail({
        category,
        subject: subject.trim(),
        description: description.trim(),
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsSuccess(true);

      // Auto-close after showing success
      setTimeout(() => {
        onClose();
      }, 2000);
    });
  };

  const handleClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  const canSubmit = category && description.trim() && !isPending;

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay" onClick={handleClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        {isSuccess ? (
          <div className="feedback-success">
            <div className="success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3>Thanks for your feedback!</h3>
            <p>We&apos;ll review it and get back to you if needed.</p>
          </div>
        ) : (
          <>
            <div className="feedback-header">
              <h2>Send Feedback</h2>
              <button className="feedback-close-btn" onClick={handleClose} disabled={isPending}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="feedback-body">
              {error && (
                <div className="feedback-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {error}
                </div>
              )}

              <p className="feedback-intro">
                We&apos;re actively improving Seatify and your feedback helps shape what we build next.
              </p>

              <div className="feedback-form-group">
                <label>What type of feedback?</label>
                <div className="feedback-categories">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`feedback-category ${category === cat.value ? 'selected' : ''}`}
                      onClick={() => setCategory(cat.value)}
                      disabled={isPending}
                    >
                      <span className="category-emoji">{cat.emoji}</span>
                      <span className="category-label">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="feedback-form-group">
                <label htmlFor="feedback-subject">Subject</label>
                <input
                  id="feedback-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your feedback"
                  disabled={isPending}
                />
              </div>

              <div className="feedback-form-group">
                <label htmlFor="feedback-description">Description</label>
                <textarea
                  id="feedback-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us more... What happened? What did you expect?"
                  disabled={isPending}
                  rows={5}
                />
              </div>
            </div>

            <div className="feedback-footer">
              <button
                type="button"
                className="feedback-btn feedback-btn-secondary"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="feedback-btn feedback-btn-primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {isPending ? (
                  <>
                    <svg
                      className="feedback-spinner"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M8.76 15.24l-2.83 2.83m11.31 0l-2.83-2.83M8.76 8.76L5.93 5.93" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
