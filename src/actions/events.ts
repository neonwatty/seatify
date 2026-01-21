'use server';

import { revalidatePath } from 'next/cache';
import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';
import type { UpdateEventData } from './types';

interface EventResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: string;
      name: string;
      eventType: string;
      date: string | null;
      venueName: string | null;
      venueAddress: string | null;
      guestCapacityLimit: number | null;
      createdAt: string;
      updatedAt: string;
    };
  };
}

export async function updateEvent(eventId: string, data: UpdateEventData) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.patch<EventResponse>(
    `/api/v1/events/${eventId}`,
    {
      event: {
        name: data.name,
        event_type: data.event_type,
        date: data.date,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        guest_capacity_limit: data.guest_capacity_limit,
      },
    }
  );

  if (response.error) {
    console.error('Error updating event:', response.error);
    return { error: response.error };
  }

  revalidatePath('/dashboard');
  return { data: response.data?.data.attributes };
}

export async function deleteEvent(eventId: string) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.delete<{ message: string }>(
    `/api/v1/events/${eventId}`
  );

  if (response.error) {
    console.error('Error deleting event:', response.error);
    return { error: response.error };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function createEvent(name: string, eventType: string) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.post<EventResponse>('/api/v1/events', {
    event: {
      name: name.trim(),
      event_type: eventType,
    },
  });

  if (response.error) {
    console.error('Error creating event:', response.error);
    return { error: response.error };
  }

  revalidatePath('/dashboard');
  return { data: response.data?.data.attributes };
}
