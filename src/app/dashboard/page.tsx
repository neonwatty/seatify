import { createClient } from '@/lib/supabase/server';
import { EventListClient } from '@/components/EventListClient';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch user's projects with their events
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      start_date,
      end_date,
      created_at,
      events:events(id, name, date, event_type, guests(count)),
      project_guests:project_guests(count)
    `)
    .order('created_at', { ascending: false });

  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
  }

  // Transform projects data
  const projectsWithSummary = (projects || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    startDate: p.start_date ?? undefined,
    endDate: p.end_date ?? undefined,
    createdAt: p.created_at,
    eventCount: p.events?.length || 0,
    guestCount: p.project_guests?.[0]?.count || 0,
    events: (p.events || []).map((e: { id: string; name: string; date: string | null; event_type: string; guests: { count: number }[] }) => ({
      id: e.id,
      name: e.name,
      date: e.date ?? undefined,
      eventType: e.event_type,
      confirmedCount: e.guests?.[0]?.count || 0,
      pendingCount: 0,
    })),
  }));

  // Fetch standalone events (not in any project)
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select(`
      id,
      name,
      event_type,
      date,
      created_at,
      project_id,
      tables (count),
      guests (count)
    `)
    .is('project_id', null)
    .order('created_at', { ascending: false });

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
  }

  return (
    <EventListClient
      initialEvents={events || []}
      initialProjects={projectsWithSummary}
    />
  );
}
