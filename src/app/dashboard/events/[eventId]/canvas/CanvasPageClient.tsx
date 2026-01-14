'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Canvas } from '@/components/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DemoBanner } from '@/components/DemoBanner';
import type { Event } from '@/types';

interface CanvasPageClientProps {
  event: Event;
  isDemo?: boolean;
}

export function CanvasPageClient({ event: serverEvent, isDemo = false }: CanvasPageClientProps) {
  const { loadEvent, setDemoMode, event } = useStore();

  // Load event into store on mount
  useEffect(() => {
    setDemoMode(isDemo);
    loadEvent(serverEvent);
  }, [serverEvent, loadEvent, isDemo, setDemoMode]);

  // Don't render until event is loaded
  if (!event || event.id !== serverEvent.id) {
    return (
      <div className="canvas-loading">
        <p>Loading seating chart...</p>
      </div>
    );
  }

  return (
    <div className="event-layout">
      <DemoBanner />
      <Header />
      <div className="event-content">
        <Canvas />
        <Sidebar />
      </div>
    </div>
  );
}
