'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getEmailStatus,
  sendInvitations,
  sendSingleInvitation,
  sendSingleReminder,
  sendBulkReminders,
  type EmailStatusSummary,
} from '@/actions/emailInvitations';
import { useSubscription } from '@/hooks/useSubscription';
import { showToast } from './toastStore';
import './EmailInvitationsPanel.css';

interface EmailInvitationsPanelProps {
  eventId: string;
}

export function EmailInvitationsPanel({ eventId }: EmailInvitationsPanelProps) {
  const { isPro, isFree } = useSubscription();
  const [emailStatus, setEmailStatus] = useState<EmailStatusSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendingGuestId, setSendingGuestId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'send' | 'reminder';
    target: 'selected' | 'all' | 'pending' | 'no-email' | 'bulk-reminder';
    count: number;
  } | null>(null);

  const loadEmailStatus = useCallback(async () => {
    const result = await getEmailStatus(eventId);
    if ('error' in result) {
      showToast(result.error, 'error');
    } else {
      setEmailStatus(result);
    }
    setIsLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (isPro) {
      loadEmailStatus();
    } else {
      setIsLoading(false);
    }
  }, [isPro, loadEmailStatus]);

  const handleToggleGuest = (guestId: string) => {
    setSelectedGuests((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!emailStatus) return;
    const guestsWithEmail = emailStatus.guestStatuses.filter((g) => g.email);
    if (selectedGuests.size === guestsWithEmail.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(guestsWithEmail.map((g) => g.guestId)));
    }
  };

  const handleSendConfirm = async () => {
    if (!confirmAction) return;

    setIsSending(true);
    setShowConfirmDialog(false);

    try {
      if (confirmAction.type === 'reminder' && confirmAction.target === 'bulk-reminder') {
        const result = await sendBulkReminders(eventId);
        if (result.success && result.result) {
          showToast(
            `Sent ${result.result.sent} reminder${result.result.sent !== 1 ? 's' : ''}`,
            'success'
          );
        } else {
          showToast(result.error || 'Failed to send reminders', 'error');
        }
      } else if (confirmAction.type === 'send') {
        let guestSelection: string[] | 'all' | 'pending' | 'no-email';
        if (confirmAction.target === 'selected') {
          guestSelection = Array.from(selectedGuests);
        } else if (confirmAction.target === 'all' || confirmAction.target === 'pending' || confirmAction.target === 'no-email') {
          guestSelection = confirmAction.target;
        } else {
          // Should not reach here, but handle it gracefully
          guestSelection = 'all';
        }

        const result = await sendInvitations(eventId, guestSelection);
        if (result.success && result.result) {
          showToast(
            `Sent ${result.result.sent} invitation${result.result.sent !== 1 ? 's' : ''}${result.result.failed > 0 ? ` (${result.result.failed} failed)` : ''}`,
            result.result.failed > 0 ? 'warning' : 'success'
          );
          setSelectedGuests(new Set());
        } else {
          showToast(result.error || 'Failed to send invitations', 'error');
        }
      }

      await loadEmailStatus();
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsSending(false);
      setConfirmAction(null);
    }
  };

  const handleSendToSelected = () => {
    if (selectedGuests.size === 0) return;
    setConfirmAction({
      type: 'send',
      target: 'selected',
      count: selectedGuests.size,
    });
    setShowConfirmDialog(true);
  };

  const handleSendToAll = () => {
    if (!emailStatus) return;
    const count = emailStatus.guestStatuses.filter((g) => g.email).length;
    setConfirmAction({
      type: 'send',
      target: 'all',
      count,
    });
    setShowConfirmDialog(true);
  };

  // Note: handleSendToPending is available but not currently used in the UI
  // It can be enabled when RSVP status is available in this component
  const _handleSendToPending = () => {
    if (!emailStatus) return;
    const pending = emailStatus.guestStatuses.filter(
      (g) => g.email && g.invitationsSent > 0 && g.lastStatus !== 'bounced'
    );
    setConfirmAction({
      type: 'send',
      target: 'pending',
      count: pending.length,
    });
    setShowConfirmDialog(true);
  };

  const handleSendToNoEmail = () => {
    if (!emailStatus) return;
    const count = emailStatus.guestStatuses.filter(
      (g) => g.email && g.invitationsSent === 0
    ).length;
    setConfirmAction({
      type: 'send',
      target: 'no-email',
      count,
    });
    setShowConfirmDialog(true);
  };

  const handleBulkReminder = () => {
    setConfirmAction({
      type: 'reminder',
      target: 'bulk-reminder',
      count: emailStatus?.guestStatuses.filter((g) => g.invitationsSent > 0).length || 0,
    });
    setShowConfirmDialog(true);
  };

  const handleSendSingle = async (guestId: string) => {
    setSendingGuestId(guestId);
    const result = await sendSingleInvitation(eventId, guestId);
    if (result.success) {
      showToast('Invitation sent', 'success');
      await loadEmailStatus();
    } else {
      showToast(result.error || 'Failed to send', 'error');
    }
    setSendingGuestId(null);
  };

  const handleSendReminder = async (guestId: string) => {
    setSendingGuestId(guestId);
    const result = await sendSingleReminder(eventId, guestId);
    if (result.success) {
      showToast('Reminder sent', 'success');
      await loadEmailStatus();
    } else {
      showToast(result.error || 'Failed to send', 'error');
    }
    setSendingGuestId(null);
  };

  // Pro gating
  if (isFree) {
    return (
      <div className="email-invitations-panel">
        <div className="pro-upgrade-prompt">
          <div className="upgrade-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h3>Email Invitations</h3>
          <p>Send personalized RSVP invitations and automated reminders directly to your guests.</p>
          <ul className="feature-list">
            <li>Personalized email invitations with direct RSVP links</li>
            <li>Automated reminders before deadline</li>
            <li>Track email delivery and open status</li>
            <li>Bulk send to all guests at once</li>
          </ul>
          <a href="/settings/billing" className="upgrade-btn">
            Upgrade to Pro
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="email-invitations-panel">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading email status...</p>
        </div>
      </div>
    );
  }

  if (!emailStatus) {
    return (
      <div className="email-invitations-panel">
        <div className="error-state">
          <p>Failed to load email status.</p>
          <button onClick={loadEmailStatus}>Retry</button>
        </div>
      </div>
    );
  }

  const guestsWithEmail = emailStatus.guestStatuses.filter((g) => g.email);
  const guestsWithoutInvitation = guestsWithEmail.filter((g) => g.invitationsSent === 0);

  return (
    <div className="email-invitations-panel">
      {/* Status Summary */}
      <div className="email-status-summary">
        <div className="status-card">
          <span className="status-value">{emailStatus.sent + emailStatus.delivered + emailStatus.opened}</span>
          <span className="status-label">Sent</span>
        </div>
        <div className="status-card success">
          <span className="status-value">{emailStatus.delivered + emailStatus.opened}</span>
          <span className="status-label">Delivered</span>
        </div>
        <div className="status-card info">
          <span className="status-value">{emailStatus.opened}</span>
          <span className="status-label">Opened</span>
        </div>
        <div className="status-card warning">
          <span className="status-value">{emailStatus.bounced + emailStatus.failed}</span>
          <span className="status-label">Failed</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="email-actions">
        <h4>Send Invitations</h4>
        <div className="action-buttons">
          {guestsWithoutInvitation.length > 0 && (
            <button
              className="action-btn primary"
              onClick={handleSendToNoEmail}
              disabled={isSending}
            >
              Send to New ({guestsWithoutInvitation.length})
            </button>
          )}
          <button
            className="action-btn secondary"
            onClick={handleSendToAll}
            disabled={isSending || guestsWithEmail.length === 0}
          >
            Send to All ({guestsWithEmail.length})
          </button>
          <button
            className="action-btn secondary"
            onClick={handleBulkReminder}
            disabled={isSending}
          >
            Send Reminders
          </button>
        </div>
      </div>

      {/* Guest List with Selection */}
      <div className="email-guest-list">
        <div className="guest-list-header">
          <label className="select-all">
            <input
              type="checkbox"
              checked={selectedGuests.size === guestsWithEmail.length && guestsWithEmail.length > 0}
              onChange={handleSelectAll}
            />
            <span>Select All</span>
          </label>
          {selectedGuests.size > 0 && (
            <button
              className="send-selected-btn"
              onClick={handleSendToSelected}
              disabled={isSending}
            >
              Send to Selected ({selectedGuests.size})
            </button>
          )}
        </div>

        <div className="guest-items">
          {emailStatus.guestStatuses.map((guest) => (
            <div key={guest.guestId} className={`guest-item ${!guest.email ? 'no-email' : ''}`}>
              <div className="guest-select">
                {guest.email && (
                  <input
                    type="checkbox"
                    checked={selectedGuests.has(guest.guestId)}
                    onChange={() => handleToggleGuest(guest.guestId)}
                  />
                )}
              </div>
              <div className="guest-info">
                <span className="guest-name">{guest.guestName}</span>
                <span className="guest-email">{guest.email || 'No email'}</span>
              </div>
              <div className="guest-email-status">
                {guest.invitationsSent > 0 ? (
                  <span className={`status-badge ${guest.lastStatus}`}>
                    {guest.lastStatus === 'opened' && 'Opened'}
                    {guest.lastStatus === 'delivered' && 'Delivered'}
                    {guest.lastStatus === 'sent' && 'Sent'}
                    {guest.lastStatus === 'bounced' && 'Bounced'}
                    {guest.lastStatus === 'failed' && 'Failed'}
                    {guest.lastStatus === 'pending' && 'Pending'}
                  </span>
                ) : (
                  <span className="status-badge not-sent">Not sent</span>
                )}
                {guest.remindersSent > 0 && (
                  <span className="reminder-badge">
                    {guest.remindersSent} reminder{guest.remindersSent > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="guest-actions">
                {guest.email && (
                  <>
                    <button
                      className="icon-btn"
                      onClick={() => handleSendSingle(guest.guestId)}
                      disabled={sendingGuestId === guest.guestId}
                      title="Send invitation"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    </button>
                    {guest.invitationsSent > 0 && guest.lastStatus !== 'bounced' && (
                      <button
                        className="icon-btn"
                        onClick={() => handleSendReminder(guest.guestId)}
                        disabled={sendingGuestId === guest.guestId}
                        title="Send reminder"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {guestsWithEmail.length === 0 && (
          <div className="empty-state">
            <p>No guests with email addresses.</p>
            <p className="hint">Add email addresses to your guest list to send invitations.</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>
              {confirmAction.type === 'send' ? 'Send Invitations' : 'Send Reminders'}
            </h3>
            <p>
              {confirmAction.type === 'send' && confirmAction.target === 'selected' &&
                `Send invitations to ${confirmAction.count} selected guest${confirmAction.count !== 1 ? 's' : ''}?`}
              {confirmAction.type === 'send' && confirmAction.target === 'all' &&
                `Send invitations to all ${confirmAction.count} guest${confirmAction.count !== 1 ? 's' : ''} with email addresses?`}
              {confirmAction.type === 'send' && confirmAction.target === 'no-email' &&
                `Send invitations to ${confirmAction.count} guest${confirmAction.count !== 1 ? 's' : ''} who haven't received one yet?`}
              {confirmAction.type === 'send' && confirmAction.target === 'pending' &&
                `Send invitations to ${confirmAction.count} pending guest${confirmAction.count !== 1 ? 's' : ''}?`}
              {confirmAction.type === 'reminder' &&
                'Send reminders to all guests who haven\'t responded yet?'}
            </p>
            <div className="dialog-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={handleSendConfirm}
                disabled={isSending}
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
