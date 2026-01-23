'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  type PublicEventData,
  findGuestByEmailOrName,
  submitRSVPResponse,
  type RSVPSubmission,
} from '@/actions/rsvpResponses';
import { getFullName } from '@/types';
import type { Guest } from '@/types';
import './RSVPPage.css';

interface RSVPPageClientProps {
  eventId: string;
  initialData?: PublicEventData;
  initialError?: string;
}

type Step = 'identify' | 'response' | 'details' | 'complete';

interface PlusOneData {
  firstName: string;
  lastName: string;
  email?: string;
  mealPreference?: string;
  dietaryRestrictions?: string[];
}

export function RSVPPageClient({ eventId, initialData, initialError }: RSVPPageClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('identify');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // RSVP response state
  const [attending, setAttending] = useState<'yes' | 'no' | null>(null);
  const [plusOnes, setPlusOnes] = useState<PlusOneData[]>([]);
  const [mealPreference, setMealPreference] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [customDietary, setCustomDietary] = useState('');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);
  const [customAccessibility, setCustomAccessibility] = useState('');
  const [seatingPreferences, setSeatingPreferences] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const eventData = initialData;
  const settings = eventData?.rsvpSettings;

  // Format event date
  const eventDate = eventData?.date;
  const formattedDate = useMemo(() => {
    if (!eventDate) return null;
    try {
      return new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return eventDate;
    }
  }, [eventDate]);

  const handleNavigateToApp = () => {
    router.push('/');
  };

  const handleGuestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSearchError('');

    const result = await findGuestByEmailOrName(eventId, searchTerm.trim());

    if (result.error) {
      setSearchError(result.error);
    } else if (result.data) {
      setGuest(result.data);
      // Pre-fill existing data if guest has already responded
      if (result.data.mealPreference) {
        setMealPreference(result.data.mealPreference);
      }
      if (result.data.dietaryRestrictions?.length) {
        setDietaryRestrictions(result.data.dietaryRestrictions);
      }
      if (result.data.accessibilityNeeds?.length) {
        setAccessibilityNeeds(result.data.accessibilityNeeds);
      }
      if (result.data.seatingPreferences?.length) {
        setSeatingPreferences(result.data.seatingPreferences);
      }
      if (result.data.rsvpStatus === 'confirmed') {
        setAttending('yes');
      } else if (result.data.rsvpStatus === 'declined') {
        setAttending('no');
      }
      setStep('response');
    }

    setIsSearching(false);
  };

  const handleAttendingChange = (value: 'yes' | 'no') => {
    setAttending(value);
  };

  const handleContinueToDetails = () => {
    if (attending === 'yes') {
      setStep('details');
    } else if (attending === 'no') {
      handleSubmit();
    }
  };

  const handleAddPlusOne = () => {
    if (!settings?.allowPlusOnes) return;
    if (plusOnes.length >= (settings?.maxPlusOnes || 1)) return;
    setPlusOnes([...plusOnes, { firstName: '', lastName: '' }]);
  };

  const handleRemovePlusOne = (index: number) => {
    setPlusOnes(plusOnes.filter((_, i) => i !== index));
  };

  const handlePlusOneChange = (index: number, field: keyof PlusOneData, value: string | string[]) => {
    const updated = [...plusOnes];
    updated[index] = { ...updated[index], [field]: value };
    setPlusOnes(updated);
  };

  const handleDietaryToggle = (option: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleAccessibilityToggle = (option: string) => {
    setAccessibilityNeeds((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleSeatingToggle = (guestId: string) => {
    setSeatingPreferences((prev) =>
      prev.includes(guestId) ? prev.filter((id) => id !== guestId) : [...prev, guestId]
    );
  };

  const handleSubmit = async () => {
    if (!guest || !attending) return;

    setIsSubmitting(true);
    setSubmitError('');

    const submission: RSVPSubmission = {
      eventId,
      guestId: guest.id,
      status: attending === 'yes' ? 'confirmed' : 'declined',
    };

    if (attending === 'yes') {
      // Add plus-ones
      const validPlusOnes = plusOnes.filter((p) => p.firstName.trim() && p.lastName.trim());
      if (validPlusOnes.length > 0) {
        submission.plusOnes = validPlusOnes.map((p) => ({
          ...p,
          dietaryRestrictions: p.dietaryRestrictions || [],
        }));
      }

      // Add meal preference
      if (mealPreference) {
        submission.mealPreference = mealPreference;
      }

      // Add dietary restrictions
      const allDietary = [...dietaryRestrictions];
      if (customDietary.trim()) {
        allDietary.push(customDietary.trim());
      }
      if (allDietary.length > 0) {
        submission.dietaryRestrictions = allDietary;
      }

      // Add accessibility needs
      const allAccessibility = [...accessibilityNeeds];
      if (customAccessibility.trim()) {
        allAccessibility.push(customAccessibility.trim());
      }
      if (allAccessibility.length > 0) {
        submission.accessibilityNeeds = allAccessibility;
      }

      // Add seating preferences
      if (seatingPreferences.length > 0) {
        submission.seatingPreferences = seatingPreferences;
      }
    }

    const result = await submitRSVPResponse(submission);

    if (result.error) {
      setSubmitError(result.error);
    } else {
      setStep('complete');
    }

    setIsSubmitting(false);
  };

  // Error state
  if (initialError || !eventData) {
    return (
      <div className="rsvp-page">
        <header className="rsvp-header">
          <h1 className="rsvp-brand">
            <span className="logo-seat">Seat</span>
            <span className="logo-ify">ify</span>
          </h1>
        </header>

        <div className="rsvp-content">
          <div className="rsvp-card error-card">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>{initialError || 'Unable to load RSVP'}</h2>
            <p>Please contact the event host for assistance.</p>
            <button className="rsvp-btn primary" onClick={handleNavigateToApp}>
              Go to Seatify
            </button>
          </div>
        </div>

        <footer className="rsvp-footer">
          <p>
            Powered by <strong>Seatify</strong>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="rsvp-page">
      <header className="rsvp-header">
        <h1 className="rsvp-event-name">{eventData.name}</h1>
        {formattedDate && <p className="rsvp-event-date">{formattedDate}</p>}
      </header>

      <div className="rsvp-content">
        {/* Step 1: Identify Guest */}
        {step === 'identify' && (
          <div className="rsvp-card">
            <h2>Find Your Invitation</h2>
            {settings?.customMessage && (
              <p className="custom-message">{settings.customMessage}</p>
            )}
            <p className="rsvp-instruction">
              Enter your email address or name to find your invitation.
            </p>

            <form onSubmit={handleGuestSearch} className="identify-form">
              <div className="form-group">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Email or full name"
                  required
                  autoFocus
                />
                {searchError && <span className="error-message">{searchError}</span>}
              </div>

              <button type="submit" className="rsvp-btn primary" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Find Invitation'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Attending? */}
        {step === 'response' && guest && (
          <div className="rsvp-card">
            <h2>Hello, {guest.firstName}!</h2>
            <p className="rsvp-instruction">Will you be attending?</p>

            {guest.rsvpStatus !== 'pending' && (
              <p className="previous-response">
                You previously responded: <strong>{guest.rsvpStatus}</strong>. You can update your response below.
              </p>
            )}

            <div className="attending-options">
              <button
                className={`attending-btn ${attending === 'yes' ? 'selected yes' : ''}`}
                onClick={() => handleAttendingChange('yes')}
              >
                <span className="attending-icon">&#10003;</span>
                <span>Yes, I&apos;ll be there!</span>
              </button>
              <button
                className={`attending-btn ${attending === 'no' ? 'selected no' : ''}`}
                onClick={() => handleAttendingChange('no')}
              >
                <span className="attending-icon">&#10007;</span>
                <span>Sorry, I can&apos;t make it</span>
              </button>
            </div>

            {attending && (
              <button
                className="rsvp-btn primary"
                onClick={handleContinueToDetails}
                disabled={isSubmitting}
              >
                {attending === 'yes' ? 'Continue' : isSubmitting ? 'Submitting...' : 'Submit Response'}
              </button>
            )}

            {submitError && <p className="error-message">{submitError}</p>}
          </div>
        )}

        {/* Step 3: Details (only if attending) */}
        {step === 'details' && guest && (
          <div className="rsvp-card details-card">
            <h2>Almost Done!</h2>
            <p className="rsvp-instruction">Just a few more details.</p>

            <div className="rsvp-details-form">
              {/* Plus-Ones */}
              {settings?.allowPlusOnes && (
                <div className="detail-section">
                  <h3>Plus-Ones</h3>
                  <p className="section-hint">
                    You may bring up to {settings.maxPlusOnes} guest{settings.maxPlusOnes > 1 ? 's' : ''}.
                  </p>

                  {plusOnes.map((plusOne, index) => (
                    <div key={index} className="plus-one-card">
                      <div className="plus-one-header">
                        <span>Guest {index + 1}</span>
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => handleRemovePlusOne(index)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="plus-one-fields">
                        <input
                          type="text"
                          placeholder="First name"
                          value={plusOne.firstName}
                          onChange={(e) => handlePlusOneChange(index, 'firstName', e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Last name"
                          value={plusOne.lastName}
                          onChange={(e) => handlePlusOneChange(index, 'lastName', e.target.value)}
                          required
                        />
                        {settings.mealOptions.length > 0 && (
                          <select
                            value={plusOne.mealPreference || ''}
                            onChange={(e) => handlePlusOneChange(index, 'mealPreference', e.target.value)}
                          >
                            <option value="">Select meal...</option>
                            {settings.mealOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}

                  {plusOnes.length < settings.maxPlusOnes && (
                    <button type="button" className="add-plus-one-btn" onClick={handleAddPlusOne}>
                      + Add a guest
                    </button>
                  )}
                </div>
              )}

              {/* Meal Preference */}
              {settings?.mealOptions && settings.mealOptions.length > 0 && (
                <div className="detail-section">
                  <h3>Meal Preference</h3>
                  <div className="meal-options">
                    {settings.mealOptions.map((option) => (
                      <label key={option} className="option-label radio">
                        <input
                          type="radio"
                          name="meal"
                          value={option}
                          checked={mealPreference === option}
                          onChange={(e) => setMealPreference(e.target.value)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary Restrictions */}
              {settings?.collectDietary && (
                <div className="detail-section">
                  <h3>Dietary Restrictions</h3>
                  <div className="checkbox-grid">
                    {['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Kosher', 'Halal'].map(
                      (option) => (
                        <label key={option} className="option-label checkbox">
                          <input
                            type="checkbox"
                            checked={dietaryRestrictions.includes(option)}
                            onChange={() => handleDietaryToggle(option)}
                          />
                          <span>{option}</span>
                        </label>
                      )
                    )}
                  </div>
                  <input
                    type="text"
                    className="other-input"
                    placeholder="Other dietary needs..."
                    value={customDietary}
                    onChange={(e) => setCustomDietary(e.target.value)}
                  />
                </div>
              )}

              {/* Accessibility Needs */}
              {settings?.collectAccessibility && (
                <div className="detail-section">
                  <h3>Accessibility Needs</h3>
                  <div className="checkbox-grid">
                    {['Wheelchair access', 'Hearing assistance', 'Visual assistance', 'Service animal'].map(
                      (option) => (
                        <label key={option} className="option-label checkbox">
                          <input
                            type="checkbox"
                            checked={accessibilityNeeds.includes(option)}
                            onChange={() => handleAccessibilityToggle(option)}
                          />
                          <span>{option}</span>
                        </label>
                      )
                    )}
                  </div>
                  <input
                    type="text"
                    className="other-input"
                    placeholder="Other accessibility needs..."
                    value={customAccessibility}
                    onChange={(e) => setCustomAccessibility(e.target.value)}
                  />
                </div>
              )}

              {/* Seating Preferences */}
              {settings?.collectSeatingPreferences && eventData.otherGuests.length > 0 && (
                <div className="detail-section">
                  <h3>Seating Preferences</h3>
                  <p className="section-hint">Select anyone you&apos;d like to sit near.</p>
                  <div className="seating-options">
                    {eventData.otherGuests
                      .filter((g) => g.id !== guest.id)
                      .slice(0, 20)
                      .map((otherGuest) => (
                        <label key={otherGuest.id} className="option-label checkbox">
                          <input
                            type="checkbox"
                            checked={seatingPreferences.includes(otherGuest.id)}
                            onChange={() => handleSeatingToggle(otherGuest.id)}
                          />
                          <span>{getFullName(otherGuest)}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rsvp-actions">
              <button type="button" className="rsvp-btn secondary" onClick={() => setStep('response')}>
                Back
              </button>
              <button
                type="button"
                className="rsvp-btn primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
              </button>
            </div>

            {submitError && <p className="error-message">{submitError}</p>}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'complete' && (
          <div className="rsvp-card complete-card">
            <div className="success-icon">
              {attending === 'yes' ? (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
              ) : (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              )}
            </div>

            <h2>Thank You!</h2>

            {attending === 'yes' ? (
              <>
                <p className="confirmation-message">
                  {settings?.confirmationMessage || 'Your RSVP has been recorded. We look forward to seeing you!'}
                </p>
                <div className="response-summary">
                  <h3>Your Response</h3>
                  <p>
                    <strong>{guest?.firstName} {guest?.lastName}</strong> - Attending
                  </p>
                  {plusOnes.length > 0 && (
                    <p>
                      Plus {plusOnes.length}: {plusOnes.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
                    </p>
                  )}
                  {mealPreference && <p>Meal: {mealPreference}</p>}
                </div>
              </>
            ) : (
              <p className="confirmation-message">
                We&apos;re sorry you can&apos;t make it. Your response has been recorded.
              </p>
            )}

            <p className="update-note">
              You can update your response anytime by returning to this page
              {settings?.deadline && ` before ${new Date(settings.deadline).toLocaleDateString()}`}.
            </p>
          </div>
        )}
      </div>

      <footer className="rsvp-footer">
        <p>
          Powered by{' '}
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <strong>Seatify</strong>
          </Link>
        </p>
        <p className="footer-cta">
          <Link href="/">Create your own seating chart</Link>
        </p>
      </footer>
    </div>
  );
}
