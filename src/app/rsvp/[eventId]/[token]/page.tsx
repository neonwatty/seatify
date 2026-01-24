import { Metadata } from 'next';
import { DirectRSVPPageClient } from './DirectRSVPPageClient';
import { loadPublicEventForRSVP, findGuestByToken } from '@/actions/rsvpResponses';

interface PageProps {
  params: Promise<{
    eventId: string;
    token: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const result = await loadPublicEventForRSVP(eventId);

  if (!result.data) {
    return {
      title: 'RSVP - Seatify',
    };
  }

  return {
    title: `RSVP for ${result.data.name} - Seatify`,
    description: `Respond to your invitation for ${result.data.name}`,
  };
}

export default async function DirectRSVPPage({ params }: PageProps) {
  const { eventId, token } = await params;

  // Load event data
  const eventResult = await loadPublicEventForRSVP(eventId);

  if (eventResult.error || !eventResult.data) {
    return (
      <DirectRSVPPageClient
        eventId={eventId}
        token={token}
        initialError={eventResult.error || 'Event not found'}
      />
    );
  }

  // Find guest by token
  const guestResult = await findGuestByToken(eventId, token);

  if (guestResult.error || !guestResult.data) {
    return (
      <DirectRSVPPageClient
        eventId={eventId}
        token={token}
        initialData={eventResult.data}
        initialError={guestResult.error || 'Invalid invitation link'}
      />
    );
  }

  return (
    <DirectRSVPPageClient
      eventId={eventId}
      token={token}
      initialData={eventResult.data}
      initialGuest={guestResult.data}
    />
  );
}
