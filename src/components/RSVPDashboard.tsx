'use client';

import { useState, useEffect } from 'react';
import { loadRSVPDashboardData, type RSVPDashboardData } from '@/actions/rsvpResponses';
import { useSubscription } from '@/hooks/useSubscription';
import { EmailInvitationsPanel } from './EmailInvitationsPanel';
import { showToast } from './toastStore';
import './RSVPDashboard.css';

interface RSVPDashboardProps {
  eventId: string;
}

export function RSVPDashboard({ eventId }: RSVPDashboardProps) {
  const { isPro } = useSubscription();
  const [data, setData] = useState<RSVPDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'preferences' | 'invitations'>('overview');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const result = await loadRSVPDashboardData(eventId);
      if (cancelled) return;
      if (result.data) {
        setData(result.data);
      } else if (result.error) {
        showToast(result.error, 'error');
      }
      setIsLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="rsvp-dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading RSVP data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rsvp-dashboard-empty">
        <p>Unable to load RSVP data.</p>
      </div>
    );
  }

  if (!data.settings?.enabled) {
    return (
      <div className="rsvp-dashboard-disabled">
        <div className="disabled-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <h3>RSVP Not Enabled</h3>
        <p>Enable RSVP in the settings to start collecting responses.</p>
      </div>
    );
  }

  const { stats, mealBreakdown, dietaryBreakdown, recentResponses, seatingPreferences, pendingGuests } = data;

  // Calculate mutual preferences
  const mutualPreferences = seatingPreferences.filter((p) => p.mutual);
  const uniqueMutualPairs = mutualPreferences.filter(
    (p, i, arr) => arr.findIndex((x) =>
      (x.fromGuestId === p.toGuestId && x.toGuestId === p.fromGuestId)
    ) > i || !arr.some((x) => x.fromGuestId === p.toGuestId && x.toGuestId === p.fromGuestId)
  );

  return (
    <div className="rsvp-dashboard">
      {/* Stats Summary */}
      <div className="rsvp-stats-grid">
        <div className="rsvp-stat-card primary">
          <span className="stat-value">{stats.responseRate}%</span>
          <span className="stat-label">Response Rate</span>
          <span className="stat-detail">{stats.responded} of {stats.totalInvited} responded</span>
        </div>
        <div className="rsvp-stat-card success">
          <span className="stat-value">{stats.totalAttending}</span>
          <span className="stat-label">Total Attending</span>
          <span className="stat-detail">{stats.confirmed} guests + {stats.plusOnesCount} plus-ones</span>
        </div>
        <div className="rsvp-stat-card warning">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending</span>
          <span className="stat-detail">Awaiting response</span>
        </div>
        <div className="rsvp-stat-card error">
          <span className="stat-value">{stats.declined}</span>
          <span className="stat-label">Declined</span>
          <span className="stat-detail">Not attending</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="rsvp-tabs">
        <button
          className={`rsvp-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`rsvp-tab ${activeTab === 'guests' ? 'active' : ''}`}
          onClick={() => setActiveTab('guests')}
        >
          Pending ({stats.pending})
        </button>
        <button
          className={`rsvp-tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Seating Preferences
        </button>
        <button
          className={`rsvp-tab ${activeTab === 'invitations' ? 'active' : ''}`}
          onClick={() => setActiveTab('invitations')}
        >
          Invitations {!isPro && <span className="pro-badge">Pro</span>}
        </button>
      </div>

      {/* Tab Content */}
      <div className="rsvp-tab-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {/* Meal Breakdown */}
            {Object.keys(mealBreakdown).length > 0 && (
              <div className="dashboard-section">
                <h4>Meal Preferences</h4>
                <div className="breakdown-list">
                  {Object.entries(mealBreakdown).map(([meal, count]) => (
                    <div key={meal} className="breakdown-item">
                      <span className="breakdown-label">{meal}</span>
                      <div className="breakdown-bar-container">
                        <div
                          className="breakdown-bar"
                          style={{ width: `${(count / stats.totalAttending) * 100}%` }}
                        />
                      </div>
                      <span className="breakdown-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dietary Restrictions */}
            {Object.keys(dietaryBreakdown).length > 0 && (
              <div className="dashboard-section">
                <h4>Dietary Restrictions</h4>
                <div className="dietary-tags">
                  {Object.entries(dietaryBreakdown).map(([restriction, count]) => (
                    <span key={restriction} className="dietary-tag">
                      {restriction} <strong>({count})</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Responses */}
            <div className="dashboard-section full-width">
              <h4>Recent Responses</h4>
              {recentResponses.length === 0 ? (
                <p className="empty-message">No responses yet.</p>
              ) : (
                <div className="responses-list">
                  {recentResponses.map((response) => (
                    <div key={response.guestId} className="response-item">
                      <div className="response-info">
                        <span className="response-name">{response.guestName}</span>
                        {response.plusOnes > 0 && (
                          <span className="response-plus-ones">+{response.plusOnes}</span>
                        )}
                      </div>
                      <span className={`response-status ${response.status}`}>
                        {response.status === 'confirmed' ? 'Attending' : 'Declined'}
                      </span>
                      <span className="response-time">
                        {formatRelativeTime(response.respondedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'guests' && (
          <div className="pending-guests-section">
            {pendingGuests.length === 0 ? (
              <div className="all-responded">
                <div className="success-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                </div>
                <h4>All guests have responded!</h4>
                <p>No pending RSVPs remaining.</p>
              </div>
            ) : (
              <>
                <p className="pending-intro">
                  {pendingGuests.length} guest{pendingGuests.length !== 1 ? 's' : ''} haven&apos;t responded yet.
                  {data.settings?.deadline && (
                    <> Deadline: <strong>{new Date(data.settings.deadline).toLocaleDateString()}</strong></>
                  )}
                </p>
                <div className="pending-list">
                  {pendingGuests.map((guest) => (
                    <div key={guest.id} className="pending-item">
                      <div className="pending-info">
                        <span className="pending-name">{guest.firstName} {guest.lastName}</span>
                        {guest.email && <span className="pending-email">{guest.email}</span>}
                      </div>
                      <span className="pending-badge">Pending</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="preferences-section">
            {seatingPreferences.length === 0 ? (
              <div className="no-preferences">
                <p>No seating preferences submitted yet.</p>
                <p className="hint">Guests can indicate who they&apos;d like to sit near when they RSVP.</p>
              </div>
            ) : (
              <>
                {/* Mutual Preferences */}
                {uniqueMutualPairs.length > 0 && (
                  <div className="preferences-group">
                    <h4>
                      <span className="mutual-icon">&#x2764;</span>
                      Mutual Preferences ({uniqueMutualPairs.length})
                    </h4>
                    <p className="group-hint">These guests both want to sit together.</p>
                    <div className="preferences-list">
                      {uniqueMutualPairs.map((pref, i) => (
                        <div key={i} className="preference-item mutual">
                          <span>{pref.fromGuestName}</span>
                          <span className="pref-arrow">&#x2194;</span>
                          <span>{pref.toGuestName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Preferences */}
                <div className="preferences-group">
                  <h4>All Seating Requests</h4>
                  <div className="preferences-list">
                    {seatingPreferences.map((pref, i) => (
                      <div key={i} className={`preference-item ${pref.mutual ? 'has-mutual' : ''}`}>
                        <span>{pref.fromGuestName}</span>
                        <span className="pref-arrow">&#x2192;</span>
                        <span>{pref.toGuestName}</span>
                        {pref.mutual && <span className="mutual-badge">Mutual</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'invitations' && (
          <EmailInvitationsPanel eventId={eventId} />
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
