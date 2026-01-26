'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { DashboardView } from '@/components/DashboardView';
import { Header } from '@/components/Header';
import type { Event } from '@/types';

interface DashboardPageClientProps {
  event: Event;
  isDemo?: boolean;
}

export function DashboardPageClient({ event: serverEvent, isDemo = false }: DashboardPageClientProps) {
  const { loadEvent, setDemoMode, event } = useStore();

  // Load event into store on mount
  useEffect(() => {
    setDemoMode(isDemo);
    loadEvent(serverEvent);
  }, [serverEvent, loadEvent, isDemo, setDemoMode]);

  // Don't render until event is loaded
  if (!event || event.id !== serverEvent.id) {
    return (
      <div className="dashboard-loading">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="event-layout">
      <Header />
      <div className="event-content dashboard-content">
        <DashboardView />
      </div>
    </div>
  );
}
