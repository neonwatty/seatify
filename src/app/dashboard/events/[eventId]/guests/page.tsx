import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loadEvent } from '@/actions/loadEvent';
import { loadDemoEvent } from '@/actions/loadDemoEvent';
import { isDemoEvent } from '@/lib/constants';
import { GuestsPageClient } from './GuestsPageClient';

interface GuestsPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: GuestsPageProps) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('name')
    .eq('id', eventId)
    .single();

  return {
    title: event?.name ? `${event.name} - Guests` : 'Guest List',
  };
}

export default async function GuestsPage({ params }: GuestsPageProps) {
  const { eventId } = await params;

  // Check if this is the demo event - load without auth requirement
  if (isDemoEvent(eventId)) {
    const result = await loadDemoEvent();

    if (result.error || !result.data) {
      // Demo event not found - redirect to home page
      redirect('/');
    }

    return <GuestsPageClient event={result.data} isDemo={true} />;
  }

  // Regular event - use loadEvent action which requires auth
  const result = await loadEvent(eventId);

  if (result.error || !result.data) {
    redirect('/dashboard');
  }

  return <GuestsPageClient event={result.data} />;
}
