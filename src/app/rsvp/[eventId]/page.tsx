import { Metadata } from 'next';
import { RSVPPageClient } from './RSVPPageClient';
import { loadPublicEventForRSVP } from '@/actions/rsvpResponses';

interface RSVPPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: RSVPPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const result = await loadPublicEventForRSVP(eventId);

  if (result.data) {
    return {
      title: `RSVP - ${result.data.name} | Seatify`,
      description: `Respond to your invitation for ${result.data.name}`,
    };
  }

  return {
    title: 'RSVP - Seatify',
    description: 'Respond to your event invitation',
  };
}

export default async function RSVPPage({ params }: RSVPPageProps) {
  const { eventId } = await params;
  const result = await loadPublicEventForRSVP(eventId);

  return <RSVPPageClient eventId={eventId} initialData={result.data} initialError={result.error} />;
}
