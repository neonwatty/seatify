import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loadEvent } from '@/actions/loadEvent';
import { loadDemoEvent } from '@/actions/loadDemoEvent';
import { isDemoEvent } from '@/lib/constants';
import { DashboardPageClient } from './DashboardPageClient';

interface DashboardPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: DashboardPageProps) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('name')
    .eq('id', eventId)
    .single();

  return {
    title: event?.name ? `${event.name} - Dashboard` : 'Event Dashboard',
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { eventId } = await params;

  // Check if this is the demo event - load without auth requirement
  if (isDemoEvent(eventId)) {
    const result = await loadDemoEvent();

    if (result.error || !result.data) {
      // Demo event not found - redirect to home page
      redirect('/');
    }

    return <DashboardPageClient event={result.data} isDemo={true} />;
  }

  // Regular event - use loadEvent action which requires auth
  const result = await loadEvent(eventId);

  if (result.error || !result.data) {
    redirect('/dashboard');
  }

  return <DashboardPageClient event={result.data} />;
}
