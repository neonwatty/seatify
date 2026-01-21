'use server';

import { revalidatePath } from 'next/cache';
import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';
import type { Constraint } from '@/types';
import type { ConstraintInput } from './types';

interface ConstraintResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: string;
      constraintType: Constraint['type'];
      priority: Constraint['priority'];
      guestIds: string[];
      description: string | null;
    };
  };
}

// Insert a single constraint with its guest associations
export async function insertConstraint(eventId: string, constraint: ConstraintInput) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.post<ConstraintResponse>(
    `/api/v1/events/${eventId}/constraints`,
    {
      constraint: {
        id: constraint.id,
        constraint_type: constraint.type,
        priority: constraint.priority,
        guest_ids: constraint.guestIds,
        description: constraint.description || null,
      },
    }
  );

  if (response.error) {
    console.error('Error inserting constraint:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return {
    data: {
      id: response.data?.data.attributes.id,
      type: response.data?.data.attributes.constraintType,
      priority: response.data?.data.attributes.priority,
      guestIds: response.data?.data.attributes.guestIds,
      description: response.data?.data.attributes.description,
    }
  };
}

// Update a constraint and its guest associations
export async function updateConstraint(eventId: string, constraintId: string, updates: Partial<ConstraintInput>) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.patch<ConstraintResponse>(
    `/api/v1/events/${eventId}/constraints/${constraintId}`,
    {
      constraint: {
        constraint_type: updates.type,
        priority: updates.priority,
        guest_ids: updates.guestIds,
        description: updates.description,
      },
    }
  );

  if (response.error) {
    console.error('Error updating constraint:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true };
}

// Delete a constraint and its guest associations
export async function deleteConstraint(eventId: string, constraintId: string) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.delete<{ message: string }>(
    `/api/v1/events/${eventId}/constraints/${constraintId}`
  );

  if (response.error) {
    console.error('Error deleting constraint:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true };
}

// Delete multiple constraints
export async function deleteConstraints(eventId: string, constraintIds: string[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    constraintIds.map(id => deleteConstraint(eventId, id))
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { error: `Failed to delete ${errors.length} constraints` };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true, count: constraintIds.length };
}
