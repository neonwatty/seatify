import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';

type ViewType = 'event-list' | 'dashboard' | 'canvas' | 'guests';

/**
 * Hook for navigating within the app with proper URL paths.
 * Use this instead of directly calling setActiveView.
 */
export function useEventNavigation() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId?: string }>();

  /**
   * Navigate to a specific view within the current event
   */
  const navigateToView = useCallback((view: ViewType) => {
    if (view === 'event-list') {
      navigate('/events');
    } else if (eventId) {
      navigate(`/events/${eventId}/${view}`);
    } else {
      // No event selected, go to event list
      navigate('/events');
    }
  }, [navigate, eventId]);

  /**
   * Navigate to a specific event's view
   */
  const navigateToEvent = useCallback((targetEventId: string, view: ViewType = 'canvas') => {
    if (view === 'event-list') {
      navigate('/events');
    } else {
      navigate(`/events/${targetEventId}/${view}`);
    }
  }, [navigate]);

  /**
   * Navigate to the event list
   */
  const navigateToEventList = useCallback(() => {
    navigate('/events');
  }, [navigate]);

  /**
   * Navigate to landing page
   */
  const navigateToLanding = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return {
    navigateToView,
    navigateToEvent,
    navigateToEventList,
    navigateToLanding,
    currentEventId: eventId,
  };
}
