import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { ONBOARDING_STEPS } from '../data/onboardingSteps';
import './OnboardingWizard.css';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { activeView, setActiveView, sidebarOpen, toggleSidebar } = useStore();

  // Filter steps for mobile - skip sidebar step since it's an overlay on mobile
  const steps = isMobile
    ? ONBOARDING_STEPS.filter(step => step.id !== 'sidebar')
    : ONBOARDING_STEPS;

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Memoize step properties - using primitive deps to avoid compiler issues
  const stepProps = useMemo(() => ({
    target: currentStep.target,
    targetFallback: currentStep.targetFallback,
    requiredView: currentStep.requiredView,
    id: currentStep.id,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [currentStepIndex, isMobile]);

  // Track viewport size for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
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

  // Navigate to required view
  useEffect(() => {
    if (!isOpen) return;

    if (stepProps.requiredView && activeView !== stepProps.requiredView) {
      setActiveView(stepProps.requiredView);
    }

    // Ensure sidebar is open for sidebar step
    if (stepProps.id === 'sidebar' && !sidebarOpen) {
      toggleSidebar();
    }
  }, [stepProps, activeView, setActiveView, isOpen, sidebarOpen, toggleSidebar]);

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
    onComplete();
    onClose();
  }, [onComplete, onClose]);

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
          setCurrentStepIndex((i) => i + 1);
        }
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        setCurrentStepIndex((i) => i - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep, handleComplete, handleSkip]);

  if (!isOpen) return null;

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

      {/* Welcome modal (no spotlight) */}
      {!targetRect && currentStep.placement === 'center' && (
        <div className="onboarding-backdrop" />
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
