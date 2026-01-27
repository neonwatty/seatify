'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { Canvas } from '@/components/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DemoBanner } from '@/components/DemoBanner';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { ProjectBreadcrumb } from '@/components/ProjectBreadcrumb';
import { TOUR_REGISTRY, type TourId } from '@/data/tourRegistry';
import type { Event, ProjectWithSummary } from '@/types';

interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  events: Array<{ id: string; name: string; date?: string }>;
}

interface CanvasPageClientProps {
  event: Event;
  isDemo?: boolean;
  project?: ProjectInfo;
}

export function CanvasPageClient({ event: serverEvent, isDemo = false, project }: CanvasPageClientProps) {
  const { loadEvent, setDemoMode, event, isTourComplete, markTourComplete, completedTours } = useStore();
  const [activeTour, setActiveTour] = useState<TourId | null>(null);
  const [hasAutoStartedTour, setHasAutoStartedTour] = useState(false);

  // Load event into store on mount
  useEffect(() => {
    setDemoMode(isDemo);
    loadEvent(serverEvent);
  }, [serverEvent, loadEvent, isDemo, setDemoMode]);

  // Auto-start quick-start tour for new demo users
  useEffect(() => {
    // Check if user clicked "Remind Me Later" - don't auto-start this session
    const remindLater = typeof window !== 'undefined' && sessionStorage.getItem('tourRemindLater') === 'true';

    if (
      isDemo &&
      event &&
      event.id === serverEvent.id &&
      !hasAutoStartedTour &&
      !remindLater &&
      completedTours.size === 0 &&
      !isTourComplete('quick-start')
    ) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setActiveTour('quick-start');
        setHasAutoStartedTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDemo, event, serverEvent.id, hasAutoStartedTour, completedTours.size, isTourComplete]);

  const handleStartTour = useCallback((tourId: TourId) => {
    setActiveTour(tourId);
  }, []);

  const handleCloseTour = useCallback(() => {
    setActiveTour(null);
  }, []);

  const handleCompleteTour = useCallback(() => {
    if (activeTour) {
      markTourComplete(activeTour);
    }
    setActiveTour(null);
  }, [activeTour, markTourComplete]);

  // Don't render until event is loaded
  if (!event || event.id !== serverEvent.id) {
    return (
      <div className="canvas-loading">
        <p>Loading seating chart...</p>
      </div>
    );
  }

  const currentTour = activeTour ? TOUR_REGISTRY[activeTour] : null;

  // Convert project info to ProjectWithSummary for breadcrumb
  const projectWithSummary: ProjectWithSummary | undefined = project
    ? {
        id: project.id,
        name: project.name,
        description: project.description,
        events: project.events,
        eventCount: project.events.length,
        guestCount: 0,
      }
    : undefined;

  return (
    <div className="event-layout">
      <DemoBanner />
      {projectWithSummary && (
        <div style={{ padding: '0 16px', background: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
          <ProjectBreadcrumb
            project={projectWithSummary}
            currentEventId={serverEvent.id}
            currentEventName={serverEvent.name}
          />
        </div>
      )}
      <Header onStartTour={handleStartTour} />
      <div className="event-content">
        <Canvas />
        <Sidebar />
      </div>

      {/* Onboarding Tour */}
      {currentTour && (
        <OnboardingWizard
          isOpen={!!activeTour}
          onClose={handleCloseTour}
          onComplete={handleCompleteTour}
          customSteps={currentTour.steps}
          tourTitle={currentTour.title}
          tourId={activeTour ?? undefined}
          isAutoStarted={isDemo && activeTour === 'quick-start'}
        />
      )}
    </div>
  );
}
