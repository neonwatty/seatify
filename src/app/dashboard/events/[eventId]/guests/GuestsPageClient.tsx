'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { GuestManagementView } from '@/components/GuestManagementView';
import { Header } from '@/components/Header';
import type { Event } from '@/types';

interface GuestsPageClientProps {
  event: Event;
  isDemo?: boolean;
}

export function GuestsPageClient({ event: serverEvent, isDemo = false }: GuestsPageClientProps) {
  const { loadEvent, setDemoMode, event } = useStore();

  // Load event into store on mount
  useEffect(() => {
    setDemoMode(isDemo);
    loadEvent(serverEvent);
  }, [serverEvent, loadEvent, isDemo, setDemoMode]);

  // Don't render until event is loaded
  if (!event || event.id !== serverEvent.id) {
    return (
      <div className="guests-loading">
        <p>Loading guest list...</p>
      </div>
    );
  }

  return (
    <div className="event-layout">
      <Header />
      <div className="event-content guests-content">
        <GuestManagementView />
      </div>
    </div>
  );
}
