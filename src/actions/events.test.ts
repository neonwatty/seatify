import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent, updateEvent, deleteEvent } from './events';
import { createMockSupabaseClient, mockEvent } from '@/test/mocks/supabase';

// Mock the server Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const mockedCreateClient = vi.mocked(createClient);
const mockedRevalidatePath = vi.mocked(revalidatePath);

describe('Event Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an event successfully', async () => {
      const mockClient = createMockSupabaseClient({
        insertResult: { data: mockEvent, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await createEvent('My Wedding', 'wedding');

      expect(result.data).toEqual(mockEvent);
      expect(result.error).toBeUndefined();
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await createEvent('My Wedding', 'wedding');

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeUndefined();
    });

    it('should return error on database failure', async () => {
      const mockClient = createMockSupabaseClient({
        insertResult: { data: null, error: { message: 'Database error' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await createEvent('My Wedding', 'wedding');

      expect(result.error).toBe('Database error');
    });
  });

  describe('updateEvent', () => {
    it('should update an event successfully', async () => {
      const updatedEvent = { ...mockEvent, name: 'Updated Event' };
      const mockClient = createMockSupabaseClient({
        updateResult: { data: updatedEvent, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateEvent(mockEvent.id, { name: 'Updated Event' });

      expect(result.data).toEqual(updatedEvent);
      expect(result.error).toBeUndefined();
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateEvent(mockEvent.id, { name: 'Updated Event' });

      expect(result.error).toBe('Not authenticated');
    });

    it('should handle partial updates', async () => {
      const updatedEvent = { ...mockEvent, date: '2026-12-25' };
      const mockClient = createMockSupabaseClient({
        updateResult: { data: updatedEvent, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await updateEvent(mockEvent.id, { date: '2026-12-25' });

      expect(result.data?.date).toBe('2026-12-25');
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      const mockClient = createMockSupabaseClient({
        deleteResult: { data: null, error: null },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteEvent(mockEvent.id);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('should return error when not authenticated', async () => {
      const mockClient = createMockSupabaseClient({ user: null });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteEvent(mockEvent.id);

      expect(result.error).toBe('Not authenticated');
      expect(result.success).toBeUndefined();
    });

    it('should return error on database failure', async () => {
      const mockClient = createMockSupabaseClient({
        deleteResult: { data: null, error: { message: 'Foreign key constraint' } },
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await deleteEvent(mockEvent.id);

      expect(result.error).toBe('Foreign key constraint');
    });
  });
});
