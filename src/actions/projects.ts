'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Project, ProjectGuest, ProjectGuestRelationship, ProjectWithSummary } from '@/types';

// =====================================================
// PROJECT CRUD OPERATIONS
// =====================================================

export interface CreateProjectData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export async function createProject(data: CreateProjectData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { data: mapProjectFromDb(project) };
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export async function updateProject(projectId: string, data: UpdateProjectData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.startDate !== undefined) updateData.start_date = data.startDate;
  if (data.endDate !== undefined) updateData.end_date = data.endDate;

  const { data: project, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { data: mapProjectFromDb(project) };
}

export async function deleteProject(projectId: string, deleteEvents: boolean = false) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  if (!deleteEvents) {
    // Detach events from project (make them standalone)
    const { error: detachError } = await supabase
      .from('events')
      .update({ project_id: null })
      .eq('project_id', projectId);

    if (detachError) {
      console.error('Error detaching events:', detachError);
      return { error: detachError.message };
    }
  }

  // Delete project (cascade will delete project_guests, relationships, and attendance)
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getProjects(): Promise<{ data?: ProjectWithSummary[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get projects with event counts
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      events:events(id, name, date),
      project_guests:project_guests(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return { error: error.message };
  }

  const projectsWithSummary: ProjectWithSummary[] = projects.map((p) => ({
    ...mapProjectFromDb(p),
    eventCount: p.events?.length || 0,
    guestCount: p.project_guests?.[0]?.count || 0,
    events: p.events?.map((e: { id: string; name: string; date: string | null }) => ({
      id: e.id,
      name: e.name,
      date: e.date ?? undefined,
    })) || [],
  }));

  return { data: projectsWithSummary };
}

export async function getProject(projectId: string): Promise<{ data?: ProjectWithSummary; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get project with full details using the helper function
  const { data, error } = await supabase.rpc('get_project_summary', {
    p_project_id: projectId,
  });

  if (error) {
    console.error('Error fetching project:', error);
    return { error: error.message };
  }

  if (!data?.project) {
    return { error: 'Project not found' };
  }

  const project: ProjectWithSummary = {
    ...mapProjectFromDb(data.project),
    eventCount: data.event_count || 0,
    guestCount: data.guest_count || 0,
    events: data.events || [],
  };

  return { data: project };
}

// =====================================================
// PROJECT GUEST OPERATIONS
// =====================================================

export interface CreateProjectGuestData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  groupName?: string;
  notes?: string;
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
}

export async function addProjectGuest(projectId: string, data: CreateProjectGuestData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: guest, error } = await supabase
    .from('project_guests')
    .insert({
      project_id: projectId,
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      company: data.company?.trim() || null,
      job_title: data.jobTitle?.trim() || null,
      industry: data.industry?.trim() || null,
      group_name: data.groupName?.trim() || null,
      notes: data.notes?.trim() || null,
      dietary_restrictions: data.dietaryRestrictions?.trim() || null,
      accessibility_needs: data.accessibilityNeeds?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding project guest:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { data: mapProjectGuestFromDb(guest) };
}

export async function updateProjectGuest(guestId: string, data: Partial<CreateProjectGuestData>) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const updateData: Record<string, unknown> = {};
  if (data.firstName !== undefined) updateData.first_name = data.firstName.trim();
  if (data.lastName !== undefined) updateData.last_name = data.lastName.trim();
  if (data.email !== undefined) updateData.email = data.email?.trim() || null;
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.company !== undefined) updateData.company = data.company?.trim() || null;
  if (data.jobTitle !== undefined) updateData.job_title = data.jobTitle?.trim() || null;
  if (data.industry !== undefined) updateData.industry = data.industry?.trim() || null;
  if (data.groupName !== undefined) updateData.group_name = data.groupName?.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.dietaryRestrictions !== undefined) updateData.dietary_restrictions = data.dietaryRestrictions?.trim() || null;
  if (data.accessibilityNeeds !== undefined) updateData.accessibility_needs = data.accessibilityNeeds?.trim() || null;

  const { data: guest, error } = await supabase
    .from('project_guests')
    .update(updateData)
    .eq('id', guestId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project guest:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { data: mapProjectGuestFromDb(guest) };
}

export async function deleteProjectGuest(guestId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('project_guests')
    .delete()
    .eq('id', guestId);

  if (error) {
    console.error('Error deleting project guest:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getProjectGuests(projectId: string): Promise<{ data?: ProjectGuest[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: guests, error } = await supabase
    .from('project_guests')
    .select('*')
    .eq('project_id', projectId)
    .order('last_name', { ascending: true });

  if (error) {
    console.error('Error fetching project guests:', error);
    return { error: error.message };
  }

  return { data: guests.map(mapProjectGuestFromDb) };
}

// =====================================================
// PROJECT RELATIONSHIP OPERATIONS
// =====================================================

export interface CreateRelationshipData {
  guestId: string;
  relatedGuestId: string;
  relationshipType: 'family' | 'friend' | 'colleague' | 'acquaintance' | 'partner' | 'prefer' | 'avoid';
  strength?: number;
}

export async function addProjectRelationship(projectId: string, data: CreateRelationshipData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: relationship, error } = await supabase
    .from('project_guest_relationships')
    .insert({
      project_id: projectId,
      guest_id: data.guestId,
      related_guest_id: data.relatedGuestId,
      relationship_type: data.relationshipType,
      strength: data.strength ?? 3,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding project relationship:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { data: mapProjectRelationshipFromDb(relationship) };
}

export async function deleteProjectRelationship(relationshipId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('project_guest_relationships')
    .delete()
    .eq('id', relationshipId);

  if (error) {
    console.error('Error deleting project relationship:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getProjectRelationships(projectId: string): Promise<{ data?: ProjectGuestRelationship[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: relationships, error } = await supabase
    .from('project_guest_relationships')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('Error fetching project relationships:', error);
    return { error: error.message };
  }

  return { data: relationships.map(mapProjectRelationshipFromDb) };
}

// =====================================================
// EVENT-PROJECT OPERATIONS
// =====================================================

export async function moveEventToProject(eventId: string, projectId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Update event's project_id
  const { error } = await supabase
    .from('events')
    .update({ project_id: projectId })
    .eq('id', eventId);

  if (error) {
    console.error('Error moving event to project:', error);
    return { error: error.message };
  }

  // Note: The database trigger will automatically create event_guest_attendance records

  revalidatePath('/dashboard');
  return { success: true };
}

export async function removeEventFromProject(eventId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('events')
    .update({ project_id: null })
    .eq('id', eventId);

  if (error) {
    console.error('Error removing event from project:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// =====================================================
// GUEST SEEDING OPERATIONS
// =====================================================

/**
 * Seed all project guests into an event's attendance records.
 * This creates attendance records with 'pending' status for any project guests
 * who don't already have attendance records for the event.
 */
export async function seedEventGuests(eventId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get the event to find its project
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, project_id')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    console.error('Error fetching event:', eventError);
    return { error: eventError?.message || 'Event not found' };
  }

  if (!event.project_id) {
    return { error: 'Event is not part of a project' };
  }

  // Get all project guests
  const { data: projectGuests, error: guestsError } = await supabase
    .from('project_guests')
    .select('id')
    .eq('project_id', event.project_id);

  if (guestsError) {
    console.error('Error fetching project guests:', guestsError);
    return { error: guestsError.message };
  }

  if (!projectGuests || projectGuests.length === 0) {
    return { data: { seeded: 0 } };
  }

  // Get existing attendance records
  const { data: existingAttendance, error: attendanceError } = await supabase
    .from('event_guest_attendance')
    .select('project_guest_id')
    .eq('event_id', eventId);

  if (attendanceError) {
    console.error('Error fetching existing attendance:', attendanceError);
    return { error: attendanceError.message };
  }

  const existingGuestIds = new Set(existingAttendance?.map((a) => a.project_guest_id) || []);

  // Create attendance records for guests who don't have one
  const newAttendance = projectGuests
    .filter((g) => !existingGuestIds.has(g.id))
    .map((g) => ({
      event_id: eventId,
      project_guest_id: g.id,
      rsvp_status: 'pending' as const,
    }));

  if (newAttendance.length === 0) {
    return { data: { seeded: 0 } };
  }

  const { error: insertError } = await supabase
    .from('event_guest_attendance')
    .insert(newAttendance);

  if (insertError) {
    console.error('Error seeding guests:', insertError);
    return { error: insertError.message };
  }

  revalidatePath('/dashboard');
  return { data: { seeded: newAttendance.length } };
}

/**
 * Get event guest attendance with project guest details
 */
export async function getEventAttendance(eventId: string): Promise<{
  data?: Array<{
    id: string;
    rsvpStatus: string;
    dietaryRestrictions?: string;
    accessibilityNeeds?: string;
    notes?: string;
    projectGuest: ProjectGuest;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: attendance, error } = await supabase
    .from('event_guest_attendance')
    .select(`
      id,
      rsvp_status,
      dietary_restrictions,
      accessibility_needs,
      notes,
      project_guest:project_guests(*)
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching event attendance:', error);
    return { error: error.message };
  }

  return {
    data: attendance.map((a) => ({
      id: a.id,
      rsvpStatus: a.rsvp_status,
      dietaryRestrictions: a.dietary_restrictions ?? undefined,
      accessibilityNeeds: a.accessibility_needs ?? undefined,
      notes: a.notes ?? undefined,
      projectGuest: mapProjectGuestFromDb(a.project_guest as unknown as DbProjectGuest),
    })),
  };
}

/**
 * Update event guest attendance RSVP status
 */
export async function updateAttendanceRsvp(attendanceId: string, rsvpStatus: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('event_guest_attendance')
    .update({ rsvp_status: rsvpStatus })
    .eq('id', attendanceId);

  if (error) {
    console.error('Error updating attendance RSVP:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

interface DbProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

function mapProjectFromDb(dbProject: DbProject): Project {
  return {
    id: dbProject.id,
    userId: dbProject.user_id,
    name: dbProject.name,
    description: dbProject.description ?? undefined,
    startDate: dbProject.start_date ?? undefined,
    endDate: dbProject.end_date ?? undefined,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
  };
}

interface DbProjectGuest {
  id: string;
  project_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  profile_summary: string | null;
  group_name: string | null;
  notes: string | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  created_at: string;
  updated_at: string;
}

function mapProjectGuestFromDb(dbGuest: DbProjectGuest): ProjectGuest {
  return {
    id: dbGuest.id,
    projectId: dbGuest.project_id,
    firstName: dbGuest.first_name,
    lastName: dbGuest.last_name,
    email: dbGuest.email ?? undefined,
    phone: dbGuest.phone ?? undefined,
    company: dbGuest.company ?? undefined,
    jobTitle: dbGuest.job_title ?? undefined,
    industry: dbGuest.industry ?? undefined,
    profileSummary: dbGuest.profile_summary ?? undefined,
    groupName: dbGuest.group_name ?? undefined,
    notes: dbGuest.notes ?? undefined,
    dietaryRestrictions: dbGuest.dietary_restrictions ?? undefined,
    accessibilityNeeds: dbGuest.accessibility_needs ?? undefined,
    createdAt: dbGuest.created_at,
    updatedAt: dbGuest.updated_at,
  };
}

interface DbProjectRelationship {
  id: string;
  project_id: string;
  guest_id: string;
  related_guest_id: string;
  relationship_type: string;
  strength: number;
  created_at: string;
  updated_at: string;
}

function mapProjectRelationshipFromDb(dbRelationship: DbProjectRelationship): ProjectGuestRelationship {
  return {
    id: dbRelationship.id,
    projectId: dbRelationship.project_id,
    guestId: dbRelationship.guest_id,
    relatedGuestId: dbRelationship.related_guest_id,
    relationshipType: dbRelationship.relationship_type as ProjectGuestRelationship['relationshipType'],
    strength: dbRelationship.strength,
    createdAt: dbRelationship.created_at,
    updatedAt: dbRelationship.updated_at,
  };
}
