'use server';

import { revalidatePath } from 'next/cache';
import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';
import type { VenueElementType } from '@/types';
import type { VenueElementInput } from './types';

interface VenueElementResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: string;
      type: VenueElementType;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    };
  };
}

// Insert a single venue element
export async function insertVenueElement(eventId: string, element: VenueElementInput) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.post<VenueElementResponse>(
    `/api/v1/events/${eventId}/venue_elements`,
    {
      venue_element: {
        id: element.id,
        element_type: element.type,
        label: element.label,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation ?? 0,
      },
    }
  );

  if (response.error) {
    console.error('Error inserting venue element:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: response.data?.data.attributes };
}

// Batch insert venue elements
export async function insertVenueElements(eventId: string, elements: VenueElementInput[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    elements.map(element => insertVenueElement(eventId, element))
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { error: `Failed to insert ${errors.length} venue elements` };
  }

  return { data: results.map(r => r.data), count: results.length };
}

// Update a single venue element
export async function updateVenueElement(eventId: string, element: VenueElementInput) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  if (!element.id) {
    return { error: 'Venue element ID required for update' };
  }

  const response = await serverRailsApi.patch<VenueElementResponse>(
    `/api/v1/events/${eventId}/venue_elements/${element.id}`,
    {
      venue_element: {
        element_type: element.type,
        label: element.label,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation ?? 0,
      },
    }
  );

  if (response.error) {
    console.error('Error updating venue element:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: response.data?.data.attributes };
}

// Batch update venue elements
export async function updateVenueElements(eventId: string, elements: VenueElementInput[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    elements.map(element => updateVenueElement(eventId, element))
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { error: `Failed to update ${errors.length} venue elements`, details: errors };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: results.map(r => r.data), count: results.length };
}

// Delete a single venue element
export async function deleteVenueElement(eventId: string, elementId: string) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.delete<{ message: string }>(
    `/api/v1/events/${eventId}/venue_elements/${elementId}`
  );

  if (response.error) {
    console.error('Error deleting venue element:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true };
}

// Delete multiple venue elements
export async function deleteVenueElements(eventId: string, elementIds: string[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    elementIds.map(id => deleteVenueElement(eventId, id))
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { error: `Failed to delete ${errors.length} venue elements` };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true, count: elementIds.length };
}
