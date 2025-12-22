import { useState } from 'react';
import { useStore } from '../store/useStore';
import { getFullName } from '../types';
import type { Guest, SurveyQuestion } from '../types';
import './GuestSurveyPage.css';

type Step = 'identify' | 'questions' | 'complete';

export function GuestSurveyPage() {
  const { event, updateGuest, addSurveyResponse } = useStore();
  const [step, setStep] = useState<Step>('identify');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foundGuest = event.guests.find(
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

    // Save responses
    event.surveyQuestions.forEach((question) => {
      if (answers[question.id] !== undefined) {
        addSurveyResponse({
          guestId: guest.id,
          questionId: question.id,
          answer: answers[question.id],
        });
      }
    });

    // Update guest with dietary restrictions if answered
    const dietaryQuestion = event.surveyQuestions.find((q) =>
      q.question.toLowerCase().includes('dietary')
    );
    if (dietaryQuestion && answers[dietaryQuestion.id]) {
      const dietaryAnswers = answers[dietaryQuestion.id];
      if (Array.isArray(dietaryAnswers) && !dietaryAnswers.includes('None')) {
        updateGuest(guest.id, { dietaryRestrictions: dietaryAnswers });
      }
    }

    // Update guest with interests if answered
    const interestsQuestion = event.surveyQuestions.find((q) =>
      q.question.toLowerCase().includes('interest')
    );
    if (interestsQuestion && answers[interestsQuestion.id]) {
      const interestAnswer = answers[interestsQuestion.id];
      if (typeof interestAnswer === 'string' && interestAnswer.trim()) {
        const interests = interestAnswer.split(',').map((i) => i.trim()).filter(Boolean);
        updateGuest(guest.id, { interests });
      }
    }

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
        const otherGuests = event.guests.filter(
          (g) => g.id !== guest?.id && g.rsvpStatus !== 'declined'
        );
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
    return event.surveyQuestions
      .filter((q) => q.required)
      .every((q) => {
        const answer = answers[q.id];
        if (Array.isArray(answer)) return answer.length > 0;
        return answer && answer.trim() !== '';
      });
  };

  return (
    <div className="survey-page">
      <header className="survey-header">
        <h1>{event.name}</h1>
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

          {event.surveyQuestions.map((question, index) => (
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
          <div className="success-icon">✓</div>
          <h2>Thank You!</h2>
          <p>Your responses have been recorded.</p>
          <p className="subtext">We'll use your preferences to create the best seating arrangement.</p>
        </div>
      )}

      <footer className="survey-footer">
        <p>
          Powered by <strong>Seatify</strong>
        </p>
      </footer>
    </div>
  );
}
