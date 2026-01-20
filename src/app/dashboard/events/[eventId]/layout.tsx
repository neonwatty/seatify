import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DEMO_EVENT_ID } from '@/lib/constants';

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function EventLayout({
  children,
  params,
}: EventLayoutProps) {
  const { eventId } = await params;

  // For demo event, skip the ownership check
  if (eventId === DEMO_EVENT_ID) {
    return <>{children}</>;
  }

  const supabase = await createClient();

  // Verify the event exists and belongs to the user
  const { data: event, error } = await supabase
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
