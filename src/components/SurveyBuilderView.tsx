import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getFullName } from '../types';
import type { SurveyQuestion } from '../types';
import './SurveyBuilderView.css';

const getSurveyLink = () => {
  const base = window.location.origin;
  return `${base}/survey`;
};

const questionTypeIcons: Record<string, string> = {
  text: '[ ]',
  multiselect: '[v]',
  single_select: '( )',
  relationship: '<->',
};

const questionTypeLabels: Record<string, string> = {
  text: 'Text Input',
  multiselect: 'Multiple Choice',
  single_select: 'Single Choice',
  relationship: 'Relationship',
};

export function SurveyBuilderView() {
  const {
    event,
    addSurveyQuestion,
    updateSurveyQuestion,
    removeSurveyQuestion,
    reorderSurveyQuestions,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'preview' | 'statistics'>('preview');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(getSurveyLink()).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, []);

  // Form state for add/edit
  const [formQuestion, setFormQuestion] = useState('');
  const [formType, setFormType] = useState<SurveyQuestion['type']>('text');
  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [formRequired, setFormRequired] = useState(false);

  // Calculate statistics from actual responses
  const stats = useMemo(() => {
    const totalGuests = event.guests.filter(g => g.rsvpStatus !== 'declined').length;
    const respondedGuestIds = new Set(event.surveyResponses.map(r => r.guestId));
    const responded = respondedGuestIds.size;
    const pending = totalGuests - responded;
    const responseRate = totalGuests > 0 ? Math.round((responded / totalGuests) * 100) : 0;

    // Calculate breakdown for each question with options
    const questionBreakdowns = event.surveyQuestions
      .filter(q => q.type === 'single_select' || q.type === 'multiselect')
      .map(q => {
        const responses = event.surveyResponses.filter(r => r.questionId === q.id);
        const answerCounts: Record<string, number> = {};

        // Initialize counts for all options
        q.options?.forEach(opt => {
          answerCounts[opt] = 0;
        });

        // Count actual responses
        responses.forEach(r => {
          const answers = Array.isArray(r.answer) ? r.answer : [r.answer];
          answers.forEach(a => {
            if (answerCounts[a] !== undefined) {
              answerCounts[a]++;
            }
          });
        });

        const total = responses.length || 1;
        return {
          id: q.id,
          question: q.question,
          answers: Object.entries(answerCounts).map(([label, count]) => ({
            label,
            count,
            percentage: Math.round((count / total) * 100),
          })),
        };
      });

    return { sent: totalGuests, responded, pending, responseRate, questionBreakdowns };
  }, [event.surveyResponses, event.surveyQuestions, event.guests]);

  const resetForm = () => {
    setFormQuestion('');
    setFormType('text');
    setFormOptions([]);
    setFormRequired(false);
  };

  const handleAddQuestion = () => {
    resetForm();
    setEditingQuestion(null);
    setShowAddModal(true);
  };

  const handleEditQuestion = (question: SurveyQuestion) => {
    setEditingQuestion(question);
    setFormQuestion(question.question);
    setFormType(question.type);
    setFormOptions(question.options || []);
    setFormRequired(question.required);
    setShowAddModal(true);
  };

  const handleSaveQuestion = () => {
    if (!formQuestion.trim()) return;

    const questionData = {
      question: formQuestion.trim(),
      type: formType,
      options: formType === 'single_select' || formType === 'multiselect' ? formOptions.filter(o => o.trim()) : undefined,
      required: formRequired,
    };

    if (editingQuestion) {
      updateSurveyQuestion(editingQuestion.id, questionData);
    } else {
      addSurveyQuestion(questionData);
    }

    setShowAddModal(false);
    resetForm();
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm('Delete this question? Any responses will also be deleted.')) {
      removeSurveyQuestion(id);
    }
  };

  const handleDuplicateQuestion = (question: SurveyQuestion) => {
    addSurveyQuestion({
      question: `${question.question} (copy)`,
      type: question.type,
      options: question.options,
      required: question.required,
    });
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentIds = event.surveyQuestions.map(q => q.id);
    const draggedIdx = currentIds.indexOf(draggedId);
    const targetIdx = currentIds.indexOf(targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const newIds = [...currentIds];
    newIds.splice(draggedIdx, 1);
    newIds.splice(targetIdx, 0, draggedId);
    reorderSurveyQuestions(newIds);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const addOption = () => {
    setFormOptions([...formOptions, '']);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formOptions];
    newOptions[index] = value;
    setFormOptions(newOptions);
  };

  const removeOption = (index: number) => {
    setFormOptions(formOptions.filter((_, i) => i !== index));
  };

  return (
    <div className="survey-builder-view">
      <div className="sb-content">
        {/* Left Panel - Builder */}
        <div className="builder-panel">
          <div className="builder-header">
            <div className="builder-title">
              <h2>Survey Questions</h2>
              <span className="question-count">{event.surveyQuestions.length} questions</span>
            </div>
            <div className="builder-actions">
              <button className="share-link-btn" onClick={handleCopyLink}>
                {linkCopied ? 'Copied!' : 'Copy Survey Link'}
              </button>
              <button className="add-question-btn" onClick={handleAddQuestion}>
                + Add Question
              </button>
            </div>
          </div>

          <div className="question-list">
            {event.surveyQuestions.length === 0 ? (
              <div className="empty-state">
                <h3>No questions yet</h3>
                <p>Add survey questions to gather information from your guests.</p>
                <button className="add-question-btn" onClick={handleAddQuestion}>
                  + Add Your First Question
                </button>
              </div>
            ) : (
              event.surveyQuestions.map((q, index) => (
                <div
                  key={q.id}
                  className={`question-card ${draggedId === q.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(q.id)}
                  onDragOver={(e) => handleDragOver(e, q.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="question-header">
                    <span className="drag-handle">⋮⋮</span>
                    <span className="question-number">Q{index + 1}</span>
                    <span className="question-text">{q.question}</span>
                    {q.required && <span className="required-badge">Required</span>}
                  </div>
                  <div className="question-meta">
                    <span className="question-type">
                      {questionTypeIcons[q.type]} {questionTypeLabels[q.type]}
                    </span>
                    {q.options && (
                      <span className="option-count">{q.options.length} options</span>
                    )}
                  </div>
                  <div className="question-actions">
                    <button className="q-action-btn" onClick={() => handleEditQuestion(q)}>
                      Edit
                    </button>
                    <button className="q-action-btn" onClick={() => handleDuplicateQuestion(q)}>
                      Duplicate
                    </button>
                    <button className="q-action-btn danger" onClick={() => handleDeleteQuestion(q.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Preview/Statistics */}
        <div className="preview-panel">
          <div className="preview-tabs">
            <button
              className={`preview-tab ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
            <button
              className={`preview-tab ${activeTab === 'statistics' ? 'active' : ''}`}
              onClick={() => setActiveTab('statistics')}
            >
              Statistics
            </button>
          </div>

          {activeTab === 'preview' ? (
            <div className="survey-preview">
              <div className="preview-frame">
                <div className="preview-header">
                  <h2>Guest Survey</h2>
                  <p>{event.name}</p>
                </div>

                {event.surveyQuestions.length === 0 ? (
                  <div className="preview-empty">
                    <p>Add questions to see a preview of your survey.</p>
                  </div>
                ) : (
                  <div className="preview-questions">
                    {event.surveyQuestions.map((q, index) => (
                      <div key={q.id} className="preview-question">
                        <label className="preview-label">
                          {index + 1}. {q.question}
                          {q.required && <span className="required-star">*</span>}
                        </label>

                        {q.type === 'text' && (
                          <input type="text" className="preview-input" placeholder="Your answer..." readOnly />
                        )}

                        {q.type === 'single_select' && q.options && (
                          <div className="preview-options">
                            {q.options.map((opt) => (
                              <label key={opt} className="preview-option radio">
                                <input type="radio" name={q.id} disabled />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === 'multiselect' && q.options && (
                          <div className="preview-options">
                            {q.options.map((opt) => (
                              <label key={opt} className="preview-option checkbox">
                                <input type="checkbox" disabled />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === 'relationship' && (
                          <div className="preview-relationship">
                            <select className="preview-select" disabled>
                              <option>Select guests you know...</option>
                              {event.guests.slice(0, 5).map(g => (
                                <option key={g.id}>{getFullName(g)}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button className="preview-submit" disabled>Submit Response</button>
              </div>
            </div>
          ) : (
            <div className="statistics-dashboard">
              <div className="stats-overview">
                <div className="stat-card">
                  <span className="stat-number">{stats.sent}</span>
                  <span className="stat-label">Guests</span>
                </div>
                <div className="stat-card success">
                  <span className="stat-number">{stats.responded}</span>
                  <span className="stat-label">Responded</span>
                </div>
                <div className="stat-card warning">
                  <span className="stat-number">{stats.pending}</span>
                  <span className="stat-label">Pending</span>
                </div>
              </div>

              <div className="response-rate">
                <div className="rate-header">
                  <span>Response Rate</span>
                  <span className="rate-percentage">{stats.responseRate}%</span>
                </div>
                <div className="rate-bar">
                  <div
                    className="rate-fill"
                    style={{ width: `${stats.responseRate}%` }}
                  />
                </div>
              </div>

              {stats.questionBreakdowns.length > 0 ? (
                <div className="question-breakdowns">
                  <h3>Question Breakdown</h3>
                  {stats.questionBreakdowns.map((breakdown) => (
                    <div key={breakdown.id} className="breakdown-card">
                      <h4>{breakdown.question}</h4>
                      <div className="breakdown-bars">
                        {breakdown.answers.map((answer) => (
                          <div key={answer.label} className="breakdown-row">
                            <span className="breakdown-label">{answer.label}</span>
                            <div className="breakdown-bar-container">
                              <div
                                className="breakdown-bar"
                                style={{ width: `${answer.percentage}%` }}
                              />
                            </div>
                            <span className="breakdown-percent">{answer.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-breakdowns">
                  <p>Add questions with options to see response breakdowns.</p>
                </div>
              )}
            </div>
          )}

          <div className="panel-footer">
            <p className="share-hint">Share the survey link with your guests to collect responses.</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Question Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="question-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingQuestion ? 'Edit Question' : 'Add Question'}</h2>

            <div className="form-group">
              <label>Question</label>
              <input
                type="text"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Enter your question..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Question Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as SurveyQuestion['type'])}
                className="form-select"
              >
                <option value="text">Text Input</option>
                <option value="single_select">Single Choice</option>
                <option value="multiselect">Multiple Choice</option>
                <option value="relationship">Relationship Selector</option>
              </select>
            </div>

            {(formType === 'single_select' || formType === 'multiselect') && (
              <div className="form-group">
                <label>Options</label>
                <div className="options-list">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="option-row">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="form-input"
                      />
                      <button
                        type="button"
                        className="remove-option-btn"
                        onClick={() => removeOption(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-option-btn" onClick={addOption}>
                    + Add Option
                  </button>
                </div>
              </div>
            )}

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formRequired}
                  onChange={(e) => setFormRequired(e.target.checked)}
                />
                Required question
              </label>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSaveQuestion}>
                {editingQuestion ? 'Save Changes' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
