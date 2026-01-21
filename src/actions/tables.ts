'use server';

import { revalidatePath } from 'next/cache';
import { serverRailsApi, isAuthenticated } from '@/lib/rails/server';
import type { TableShape } from '@/types';
import type { TableInput } from './types';

interface TableResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: string;
      name: string;
      shape: TableShape;
      capacity: number;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    };
  };
}

// Insert a single table
export async function insertTable(eventId: string, table: TableInput) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.post<TableResponse>(
    `/api/v1/events/${eventId}/tables`,
    {
      table: {
        id: table.id,
        name: table.name,
        shape: table.shape,
        capacity: table.capacity,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation ?? 0,
      },
    }
  );

  if (response.error) {
    console.error('Error inserting table:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: response.data?.data.attributes };
}

// Batch insert tables
export async function insertTables(eventId: string, tables: TableInput[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    tables.map(table => insertTable(eventId, table))
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { error: `Failed to insert ${errors.length} tables` };
  }

  return { data: results.map(r => r.data), count: results.length };
}

// Update a single table
export async function updateTable(eventId: string, table: TableInput) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  if (!table.id) {
    return { error: 'Table ID required for update' };
  }

  const response = await serverRailsApi.patch<TableResponse>(
    `/api/v1/events/${eventId}/tables/${table.id}`,
    {
      table: {
        name: table.name,
        shape: table.shape,
        capacity: table.capacity,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation ?? 0,
      },
    }
  );

  if (response.error) {
    console.error('Error updating table:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: response.data?.data.attributes };
}

// Batch update tables
export async function updateTables(eventId: string, tables: TableInput[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    tables.map(table => updateTable(eventId, table))
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { error: `Failed to update ${errors.length} tables`, details: errors };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { data: results.map(r => r.data), count: results.length };
}

// Delete a single table
export async function deleteTable(eventId: string, tableId: string) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const response = await serverRailsApi.delete<{ message: string }>(
    `/api/v1/events/${eventId}/tables/${tableId}`
  );

  if (response.error) {
    console.error('Error deleting table:', response.error);
    return { error: response.error };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true };
}

// Delete multiple tables
export async function deleteTables(eventId: string, tableIds: string[]) {
  if (!await isAuthenticated()) {
    return { error: 'Not authenticated' };
  }

  const results = await Promise.all(
    tableIds.map(tableId => deleteTable(eventId, tableId))
  );

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { error: `Failed to delete ${errors.length} tables` };
  }

  revalidatePath(`/dashboard/events/${eventId}/canvas`);
  return { success: true, count: tableIds.length };
}
