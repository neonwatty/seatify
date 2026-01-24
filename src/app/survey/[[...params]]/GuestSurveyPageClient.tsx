'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { decodeShareableUrl, type ExpandedShareableData } from '@/utils/shareableEventUtils';
import { getFullName } from '@/types';
import type { Guest, SurveyQuestion } from '@/types';
import '@/components/GuestSurveyPage.css';

interface GuestSurveyPageClientProps {
  encodedData: string;
}

type Step = 'identify' | 'questions' | 'complete';

export function GuestSurveyPageClient({ encodedData }: GuestSurveyPageClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('identify');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Decode event data from URL
  const { eventData, error, hideBranding } = useMemo(() => {
    if (!encodedData) {
      return { eventData: null, error: false, hideBranding: false };
    }
    const data = decodeShareableUrl(encodedData);
    if (data) {
      return { eventData: data as ExpandedShareableData, error: false, hideBranding: data.hideBranding || false };
    }
    return { eventData: null, error: true, hideBranding: false };
  }, [encodedData]);

  const showBranding = !hideBranding;

  const handleNavigateToApp = () => {
    router.push('/');
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData?.guests) {
      setEmailError('No guest data available.');
      return;
    }

    const foundGuest = eventData.guests.find(
      (g) => g.email?.toLowerCase() === email.toLowerCase()
    );
    if (foundGuest) {
      setGuest(foundGuest);
      setEmailError('');
      setStep('questions');
    } else {
      setEmailError('Email not found. Please contact the event host.');
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultiselectToggle = (questionId: string, option: string) => {
    const current = (answers[questionId] as string[]) || [];
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    handleAnswerChange(questionId, updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) return;

    // In the shareable version, we can't save responses to a server
    // Just show completion message
    setStep('complete');
  };

  const renderQuestion = (question: SurveyQuestion) => {
    switch (question.type) {
      case 'single_select':
        return (
          <div className="question-options single">
            {question.options?.map((option) => (
              <label key={option} className="option-label">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'multiselect':
        return (
          <div className="question-options multi">
            {question.options?.map((option) => (
              <label key={option} className="option-label">
                <input
                  type="checkbox"
                  checked={((answers[question.id] as string[]) || []).includes(option)}
                  onChange={() => handleMultiselectToggle(question.id, option)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'text':
        return (
          <textarea
            className="question-textarea"
            value={(answers[question.id] as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer..."
            rows={3}
          />
        );

      case 'relationship': {
        const otherGuests = eventData?.guests?.filter(
          (g) => g.id !== guest?.id && g.rsvpStatus !== 'declined'
        ) || [];
        return (
          <div className="relationship-picker">
            <p className="relationship-hint">Select guests you know well:</p>
            <div className="relationship-list">
              {otherGuests.slice(0, 10).map((otherGuest) => (
                <label key={otherGuest.id} className="relationship-item">
                  <input
                    type="checkbox"
                    checked={((answers[question.id] as string[]) || []).includes(otherGuest.id)}
                    onChange={() => handleMultiselectToggle(question.id, otherGuest.id)}
                  />
                  <span>{getFullName(otherGuest)}</span>
                </label>
              ))}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const isFormValid = () => {
    if (!eventData?.surveyQuestions) return false;
    return eventData.surveyQuestions
      .filter((q) => q.required)
      .every((q) => {
        const answer = answers[q.id];
        if (Array.isArray(answer)) return answer.length > 0;
        return answer && answer.trim() !== '';
      });
  };

  // No URL data - show error/upload prompt
  if (!encodedData) {
    return (
      <div className="survey-page">
        <header className="survey-header">
          <h1 className="survey-brand">
            <span className="logo-seat">Seat</span>
            <span className="logo-ify">ify</span>
          </h1>
          <p>Guest Survey</p>
        </header>

        <div className="survey-form">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2>No Survey Available</h2>
          <p>Please use the survey link provided by your event host.</p>
          <button className="submit-btn" onClick={handleNavigateToApp}>
            Go to Seatify
          </button>
        </div>

        <footer className="survey-footer">
          <p>
            Powered by <strong>Seatify</strong>
          </p>
        </footer>
      </div>
    );
  }

  // Error decoding URL data
  if (error || !eventData) {
    return (
      <div className="survey-page">
        <header className="survey-header">
          <h1 className="survey-brand">
            <span className="logo-seat">Seat</span>
            <span className="logo-ify">ify</span>
          </h1>
          <p>Guest Survey</p>
        </header>

        <div className="survey-form">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>Unable to load survey</h2>
          <p>The survey link may be outdated or damaged.</p>
          <button className="submit-btn" onClick={handleNavigateToApp}>
            Go to Seatify
          </button>
        </div>

        <footer className="survey-footer">
          <p>
            Powered by <strong>Seatify</strong>
          </p>
        </footer>
      </div>
    );
  }

  // No survey questions configured
  if (!eventData.surveyQuestions || eventData.surveyQuestions.length === 0) {
    return (
      <div className="survey-page">
        <header className="survey-header">
          <h1>{eventData.name || 'Event Survey'}</h1>
          <p>Guest Survey</p>
        </header>

        <div className="survey-form">
          <h2>No Questions Available</h2>
          <p>This survey has not been configured yet. Please contact the event host.</p>
          <button className="submit-btn" onClick={handleNavigateToApp}>
            Go to Seatify
          </button>
        </div>

        <footer className="survey-footer">
          <p>
            Powered by <strong>Seatify</strong>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="survey-page">
      <header className="survey-header">
        <h1>{eventData.name || 'Event Survey'}</h1>
        <p>Help us create the perfect seating arrangement</p>
      </header>

      {step === 'identify' && (
        <form className="survey-form identify-form" onSubmit={handleEmailSubmit}>
          <h2>Welcome!</h2>
          <p>Please enter your email address to get started.</p>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
            {emailError && <span className="error-message">{emailError}</span>}
          </div>

          <button type="submit" className="submit-btn">
            Continue
          </button>
        </form>
      )}

      {step === 'questions' && guest && (
        <form className="survey-form questions-form" onSubmit={handleSubmit}>
          <h2>Hi, {guest.firstName || getFullName(guest).split(' ')[0]}!</h2>
          <p>Please answer a few questions to help us with seating.</p>

          {eventData.surveyQuestions?.map((question: SurveyQuestion, index: number) => (
            <div key={question.id} className="question-group">
              <label className={question.required ? 'required' : ''}>
                {index + 1}. {question.question}
              </label>
              {renderQuestion(question)}
            </div>
          ))}

          <button type="submit" className="submit-btn" disabled={!isFormValid()}>
            Submit Survey
          </button>
        </form>
      )}

      {step === 'complete' && (
        <div className="survey-form complete-message">
          <div className="success-icon">&#10003;</div>
          <h2>Thank You!</h2>
          <p>Your responses have been recorded.</p>
          <p className="subtext">We&apos;ll use your preferences to create the best seating arrangement.</p>
        </div>
      )}

      {showBranding && (
        <footer className="survey-footer">
          <p>
            Powered by <strong>Seatify</strong>
          </p>
        </footer>
      )}
    </div>
  );
}
