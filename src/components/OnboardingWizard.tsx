import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ONBOARDING_STEPS, type OnboardingStep } from '../data/onboardingSteps';
import { trackOnboardingStep } from '../utils/analytics';
import './OnboardingWizard.css';

// Helper to perform step actions
const performStepAction = (action: string | undefined, setActiveView: (view: 'event-list' | 'dashboard' | 'canvas' | 'guests') => void) => {
  if (action === 'click-event-card') {
    // Click the first event card to enter it
    const eventCard = document.querySelector('.event-card') as HTMLElement;
    if (eventCard) {
      eventCard.click();
    } else {
      // Fallback: just navigate to canvas
      setActiveView('canvas');
    }
  }
};

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  customSteps?: OnboardingStep[];  // Optional custom steps for mini-tours
  tourTitle?: string;              // Optional title shown in progress area
}

export function OnboardingWizard({ isOpen, onClose, onComplete, customSteps }: OnboardingWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const [isNavigating, setIsNavigating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { activeView, setActiveView, sidebarOpen, toggleSidebar, currentEventId } = useStore();

  // Use custom steps if provided, otherwise use default onboarding steps
  const baseSteps = customSteps || ONBOARDING_STEPS;

  // Filter steps for mobile - skip sidebar step since it's an overlay on mobile
  const steps = isMobile
    ? baseSteps.filter(step => step.id !== 'sidebar')
    : baseSteps;

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Memoize step properties - using primitive deps to avoid compiler issues
  const stepProps = useMemo(() => ({
    target: currentStep.target,
    targetFallback: currentStep.targetFallback,
    requiredView: currentStep.requiredView,
    id: currentStep.id,
    action: currentStep.action,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [currentStepIndex, isMobile]);

  // Reset step index when tour changes or reopens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, customSteps]);

  // Track viewport size for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update target element rect
  const updateTargetRect = useCallback(() => {
    if (!stepProps.target) {
      setTargetRect(null);
      return;
    }

    let element = document.querySelector(stepProps.target);
    if (!element && stepProps.targetFallback) {
      element = document.querySelector(stepProps.targetFallback);
    }

    if (element) {
      setTargetRect(element.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [stepProps]);

  // Navigate to required view with proper handling for view transitions
  useEffect(() => {
    if (!isOpen) return;

    const requiredView = stepProps.requiredView;

    // Check if we need to navigate to a different view
    if (requiredView && activeView !== requiredView) {
      // Set navigating state to show loading/transition
      setIsNavigating(true);

      // Navigate via router if we have an event ID
      if (currentEventId && requiredView !== 'event-list') {
        navigate(`/events/${currentEventId}/${requiredView}`);
      }
      setActiveView(requiredView);
    }

    // Ensure sidebar is open for sidebar step
    if (stepProps.id === 'sidebar' && !sidebarOpen) {
      toggleSidebar();
    }
  }, [stepProps.requiredView, stepProps.id, activeView, setActiveView, isOpen, sidebarOpen, toggleSidebar, currentEventId, navigate]);

  // Clear navigating state when we've arrived at the correct view
  useEffect(() => {
    if (!isOpen || !isNavigating) return;

    const requiredView = stepProps.requiredView;

    // If we're navigating and we've arrived at the required view (or no specific view required)
    if (!requiredView || activeView === requiredView) {
      // Give DOM time to settle after view change
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isNavigating, activeView, stepProps.requiredView]);

  // Update rect on step change and resize
  useEffect(() => {
    if (!isOpen) return;

    // Delay to let DOM settle after view changes
    const timer = setTimeout(updateTargetRect, 100);

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [updateTargetRect, isOpen, currentStepIndex]);

  const handleComplete = useCallback(() => {
    trackOnboardingStep(steps.length, steps.length, true);
    onComplete();
    onClose();
  }, [onComplete, onClose, steps.length]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastStep) {
          handleComplete();
        } else {
          // Perform any action for current step before advancing
          if (stepProps.action) {
            performStepAction(stepProps.action, setActiveView);
          }
          trackOnboardingStep(currentStepIndex + 2, steps.length);
          setCurrentStepIndex((i) => i + 1);
        }
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        setCurrentStepIndex((i) => i - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep, handleComplete, handleSkip, stepProps.action, setActiveView, currentStepIndex, steps.length]);

  if (!isOpen) return null;

  // During view transitions, show a centered loading state to prevent flickering
  if (isNavigating) {
    return createPortal(
      <div className="onboarding-overlay">
        <div className="onboarding-backdrop" />
        <div
          className="onboarding-tooltip onboarding-tooltip--center"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="onboarding-tooltip-content">
            <h3>{currentStep.title}</h3>
            <p>Loading view...</p>
          </div>
          <div className="onboarding-tooltip-footer">
            <div className="onboarding-progress">
              {steps.map((_, index) => (
                <span
                  key={index}
                  className={`onboarding-dot ${index === currentStepIndex ? 'active' : ''} ${
                    index < currentStepIndex ? 'completed' : ''
                  }`}
                />
              ))}
            </div>
            <div className="onboarding-nav">
              <button className="onboarding-btn onboarding-btn--skip" onClick={handleSkip}>
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Calculate tooltip position
  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect || currentStep.placement === 'center') {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = currentStep.highlightPadding ?? 8;
    const tooltipGap = 16;
    const tooltipWidth = 360;
    const tooltipHeight = 200; // Approximate

    let left = 0;
    let top = 0;

    switch (currentStep.placement) {
      case 'bottom':
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.bottom + padding + tooltipGap;
        break;
      case 'top':
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.top - padding - tooltipGap - tooltipHeight;
        break;
      case 'left':
        left = targetRect.left - padding - tooltipGap - tooltipWidth;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
        left = targetRect.right + padding + tooltipGap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
    }

    // Keep tooltip in viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  };

  // Get spotlight dimensions
  const getSpotlightRect = () => {
    if (!targetRect) return null;
    const padding = currentStep.highlightPadding ?? 8;
    return {
      x: targetRect.left - padding,
      y: targetRect.top - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
    };
  };

  const spotlightRect = getSpotlightRect();

  // Calculate arrow position for mobile (points from tooltip to target)
  const getArrowPosition = () => {
    if (!targetRect || !isMobile || currentStep.placement === 'center') {
      return null;
    }

    // Arrow should point from the top of the tooltip area to the target
    // Tooltip is at bottom: 24px from bottom of screen
    const tooltipTop = window.innerHeight - 24 - 200; // Approximate tooltip height
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetBottomY = targetRect.bottom;

    return {
      // Arrow starts just above the tooltip
      startX: Math.min(Math.max(targetCenterX, 40), window.innerWidth - 40),
      startY: tooltipTop - 8,
      // Arrow points to target center-bottom
      targetX: targetCenterX,
      targetY: targetBottomY + 8,
    };
  };

  const arrowPosition = getArrowPosition();

  return createPortal(
    <div className="onboarding-overlay" onClick={handleSkip}>
      {/* Spotlight mask overlay */}
      {spotlightRect && (
        <svg className="onboarding-spotlight-svg" width="100%" height="100%">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.x}
                y={spotlightRect.y}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      )}

      {/* Spotlight ring */}
      {spotlightRect && (
        <div
          className="onboarding-spotlight-ring"
          style={{
            left: spotlightRect.x,
            top: spotlightRect.y,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      )}

      {/* Backdrop for any step without a target (centered or when target element not found) */}
      {!targetRect && (
        <div className="onboarding-backdrop" />
      )}

      {/* Mobile: Target highlight box */}
      {isMobile && targetRect && currentStep.placement !== 'center' && (
        <div
          className="onboarding-target-highlight"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Mobile: Arrow pointing to target */}
      {arrowPosition && (
        <div className="onboarding-arrow">
          <svg
            width={window.innerWidth}
            height={window.innerHeight}
            style={{ position: 'fixed', top: 0, left: 0 }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="var(--color-primary)"
                />
              </marker>
            </defs>
            <line
              x1={arrowPosition.startX}
              y1={arrowPosition.startY}
              x2={arrowPosition.targetX}
              y2={arrowPosition.targetY}
              stroke="var(--color-primary)"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`onboarding-tooltip onboarding-tooltip--${currentStep.placement}`}
        style={getTooltipPosition()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="onboarding-tooltip-content">
          <h3>{currentStep.title}</h3>
          <p>{currentStep.description}</p>
        </div>

        <div className="onboarding-tooltip-footer">
          <div className="onboarding-progress">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`onboarding-dot ${index === currentStepIndex ? 'active' : ''} ${
                  index < currentStepIndex ? 'completed' : ''
                }`}
              />
            ))}
          </div>

          <div className="onboarding-nav">
            {!isFirstStep && (
              <button
                className="onboarding-btn onboarding-btn--back"
                onClick={() => setCurrentStepIndex((i) => i - 1)}
              >
                Back
              </button>
            )}
            <button className="onboarding-btn onboarding-btn--skip" onClick={handleSkip}>
              Skip
            </button>
            <button
              className="onboarding-btn onboarding-btn--next"
              onClick={() => {
                if (isLastStep) {
                  handleComplete();
                } else {
                  // Perform any action for current step before advancing
                  if (stepProps.action) {
                    performStepAction(stepProps.action, setActiveView);
                  }
                  trackOnboardingStep(currentStepIndex + 2, steps.length);
                  setCurrentStepIndex((i) => i + 1);
                }
              }}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
