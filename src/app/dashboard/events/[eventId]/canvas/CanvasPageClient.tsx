'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Canvas } from '@/components/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import type { Event } from '@/types';

interface CanvasPageClientProps {
  event: Event;
}

export function CanvasPageClient({ event: serverEvent }: CanvasPageClientProps) {
  const { loadEvent, event } = useStore();

  // Load event into store on mount
  useEffect(() => {
    loadEvent(serverEvent);
  }, [serverEvent, loadEvent]);

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
      <Header />
      <div className="event-content">
        <Canvas />
        <Sidebar />
      </div>
    </div>
  );
}
