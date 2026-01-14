import { redirect } from 'next/navigation';
import { loadDemoEvent } from '@/actions/loadDemoEvent';
import { CanvasPageClient } from '@/app/dashboard/events/[eventId]/canvas/CanvasPageClient';
import '@/app/dashboard/dashboard.css';

export const metadata = {
  title: 'Demo Event - Seatify',
  description: 'Try the Seatify demo without signing up',
};

export default async function DemoPage() {
  const result = await loadDemoEvent();

  if (result.error || !result.data) {
    // Demo event not found - redirect to home page
    redirect('/');
  }

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <CanvasPageClient event={result.data} isDemo={true} />
      </main>
    </div>
  );
}
