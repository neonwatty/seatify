'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getServerSubscription } from '@/lib/subscription/server';

export interface UpdateEventData {
  name?: string;
  event_type?: string;
  date?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  guest_capacity_limit?: number | null;
}

export async function updateEvent(eventId: string, data: UpdateEventData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // RLS will ensure user can only update their own events
  const { data: event, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { data: event };
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Delete related data first (cascade should handle this, but being explicit)
  // The database has ON DELETE CASCADE, so this should work automatically
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function createEvent(name: string, eventType: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check subscription limits
  const { limits } = await getServerSubscription(user.id);

  // Count existing events
  const { count: eventCount, error: countError } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    console.error('Error counting events:', countError);
    return { error: countError.message };
  }

  // Check if at limit (-1 means unlimited)
  if (limits.maxEvents !== -1 && (eventCount ?? 0) >= limits.maxEvents) {
    return {
      error: 'Event limit reached',
      limitReached: true,
      currentCount: eventCount,
      maxAllowed: limits.maxEvents,
      plan: limits.plan,
    };
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      name: name.trim(),
      event_type: eventType,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { data: event };
}
