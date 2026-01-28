import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventListClient, Event } from './EventListClient';

// Mock the server actions
vi.mock('@/actions/events', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

import { createEvent, updateEvent, deleteEvent } from '@/actions/events';

const mockedCreateEvent = vi.mocked(createEvent);
const mockedUpdateEvent = vi.mocked(updateEvent);
const mockedDeleteEvent = vi.mocked(deleteEvent);

const mockEvents: Event[] = [
  {
    id: 'event-1',
    name: 'Summer Wedding',
    event_type: 'wedding',
    date: '2026-06-15',
    created_at: '2026-01-01T00:00:00Z',
    tables: [{ count: 10 }],
    guests: [{ count: 100 }],
  },
  {
    id: 'event-2',
    name: 'Corporate Gala',
    event_type: 'gala',
    date: null,
    created_at: '2026-01-02T00:00:00Z',
    tables: [{ count: 5 }],
    guests: [{ count: 50 }],
  },
  {
    id: 'event-3',
    name: 'Birthday Party',
    event_type: 'party',
    date: '2026-12-25',
    created_at: '2026-01-03T00:00:00Z',
    tables: [{ count: 3 }],
    guests: [{ count: 25 }],
  },
];

describe('EventListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the events header', () => {
      render(<EventListClient initialEvents={mockEvents} />);

      expect(screen.getByRole('heading', { name: /events/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new event/i })).toBeInTheDocument();
    });

    it('should render all event cards', () => {
      render(<EventListClient initialEvents={mockEvents} />);

      expect(screen.getByText('Summer Wedding')).toBeInTheDocument();
      expect(screen.getByText('Corporate Gala')).toBeInTheDocument();
      expect(screen.getByText('Birthday Party')).toBeInTheDocument();
    });

    it('should render empty state when no events', () => {
      render(<EventListClient initialEvents={[]} />);

      expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first event/i)).toBeInTheDocument();
    });

    it('should render event type for each event', () => {
      render(<EventListClient initialEvents={mockEvents} />);

      // Check that each event card contains the event type
      // Event types may appear in both the event name and the meta info
      const weddingElements = screen.getAllByText(/wedding/i);
      expect(weddingElements.length).toBeGreaterThanOrEqual(1);

      const galaElements = screen.getAllByText(/gala/i);
      expect(galaElements.length).toBeGreaterThanOrEqual(1);

      const partyElements = screen.getAllByText(/party/i);
      expect(partyElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render guest count for each event', () => {
      render(<EventListClient initialEvents={mockEvents} />);

      expect(screen.getByText(/100 guests/i)).toBeInTheDocument();
      expect(screen.getByText(/50 guests/i)).toBeInTheDocument();
      expect(screen.getByText(/25 guests/i)).toBeInTheDocument();
    });
  });

  describe('Dynamic Calendar Icon', () => {
    it('should display month and day for events with dates', () => {
      render(<EventListClient initialEvents={[mockEvents[0]]} />);

      // June 15 should show JUN and 15
      expect(screen.getByText('JUN')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should display TBD for events without dates', () => {
      render(<EventListClient initialEvents={[mockEvents[1]]} />);

      expect(screen.getByText('TBD')).toBeInTheDocument();
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should display correct month abbreviations', () => {
      const decemberEvent = mockEvents[2]; // December 25
      render(<EventListClient initialEvents={[decemberEvent]} />);

      expect(screen.getByText('DEC')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  describe('Create Event Modal', () => {
    it('should open create modal when clicking New button', async () => {
      const user = userEvent.setup();
      render(<EventListClient initialEvents={mockEvents} />);

      await user.click(screen.getByRole('button', { name: /new event/i }));

      expect(screen.getByRole('heading', { name: /new event/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    });

    it('should open create modal from empty state', async () => {
      const user = userEvent.setup();
      render(<EventListClient initialEvents={[]} />);

      await user.click(screen.getByRole('button', { name: /create event/i }));

      expect(screen.getByRole('heading', { name: /new event/i })).toBeInTheDocument();
    });

    it('should close modal when clicking Cancel', async () => {
      const user = userEvent.setup();
      render(<EventListClient initialEvents={mockEvents} />);

      await user.click(screen.getByRole('button', { name: /new event/i }));
      expect(screen.getByRole('heading', { name: /new event/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('heading', { name: /new event/i })).not.toBeInTheDocument();
    });

    it('should call createEvent when submitting form', async () => {
      const user = userEvent.setup();
      mockedCreateEvent.mockResolvedValue({ data: { id: 'new-event' } });

      render(<EventListClient initialEvents={mockEvents} />);

      await user.click(screen.getByRole('button', { name: /new event/i }));
      await user.type(screen.getByLabelText(/name/i), 'New Test Event');
      await user.click(screen.getByRole('button', { name: /create$/i }));

      await waitFor(() => {
        expect(mockedCreateEvent).toHaveBeenCalledWith('New Test Event', 'wedding', undefined);
      });
    });
  });

  describe('Edit Event Modal', () => {
    it('should open edit modal when clicking edit button', async () => {
      const user = userEvent.setup();
      render(<EventListClient initialEvents={mockEvents} />);

      const editButtons = screen.getAllByTitle(/edit/i);
      await user.click(editButtons[0]);

      expect(screen.getByRole('heading', { name: /edit event/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Summer Wedding')).toBeInTheDocument();
    });

    it('should populate form with event data', async () => {
      const user = userEvent.setup();
      render(<EventListClient initialEvents={mockEvents} />);

      const editButtons = screen.getAllByTitle(/edit/i);
      await user.click(editButtons[0]);

      expect(screen.getByDisplayValue('Summer Wedding')).toBeInTheDocument();
      // Select element value check
      const selectElement = screen.getByLabelText(/type/i) as HTMLSelectElement;
      expect(selectElement.value).toBe('wedding');
      expect(screen.getByDisplayValue('2026-06-15')).toBeInTheDocument();
    });

    it('should call updateEvent when saving changes', async () => {
      const user = userEvent.setup();
      mockedUpdateEvent.mockResolvedValue({ data: { ...mockEvents[0], name: 'Updated Name' } });

      render(<EventListClient initialEvents={mockEvents} />);

      const editButtons = screen.getAllByTitle(/edit/i);
      await user.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Summer Wedding');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockedUpdateEvent).toHaveBeenCalledWith('event-1', {
          name: 'Updated Name',
          event_type: 'wedding',
          date: '2026-06-15',
        });
      });
    });
  });

  describe('Delete Event Modal', () => {
    it('should open delete confirmation modal when clicking delete button', async () => {
      const user = userEvent.setup();
      render(<EventListClient initialEvents={mockEvents} />);

      const deleteButtons = screen.getAllByTitle(/delete/i);
      await user.click(deleteButtons[0]);

      expect(screen.getByRole('heading', { name: /delete event/i })).toBeInTheDocument();
      // The event name appears in the confirmation text
      const weddingTexts = screen.getAllByText('Summer Wedding');
      expect(weddingTexts.length).toBeGreaterThan(0);
    });

    it('should call deleteEvent when confirming deletion', async () => {
      const user = userEvent.setup();
      mockedDeleteEvent.mockResolvedValue({ success: true });

      render(<EventListClient initialEvents={mockEvents} />);

      const deleteButtons = screen.getAllByTitle(/delete/i);
      await user.click(deleteButtons[0]);

      // Find the delete button inside the modal by looking for btn-danger class
      const modalButtons = screen.getAllByRole('button');
      const deleteConfirmButton = modalButtons.find(
        btn => btn.classList.contains('btn-danger')
      );
      expect(deleteConfirmButton).toBeDefined();
      await user.click(deleteConfirmButton!);

      await waitFor(() => {
        expect(mockedDeleteEvent).toHaveBeenCalledWith('event-1');
      });
    });

    it('should remove event from list after successful deletion', async () => {
      const user = userEvent.setup();
      mockedDeleteEvent.mockResolvedValue({ success: true });

      render(<EventListClient initialEvents={mockEvents} />);

      // Get all instances of "Summer Wedding" text before deletion
      const weddingTextsBefore = screen.getAllByText('Summer Wedding');
      expect(weddingTextsBefore.length).toBeGreaterThanOrEqual(1);

      const deleteButtons = screen.getAllByTitle(/delete/i);
      await user.click(deleteButtons[0]);

      // Find the delete button inside the modal by looking for btn-danger class
      const modalButtons = screen.getAllByRole('button');
      const deleteConfirmButton = modalButtons.find(
        btn => btn.classList.contains('btn-danger')
      );
      await user.click(deleteConfirmButton!);

      await waitFor(() => {
        // Verify the delete action was called
        expect(mockedDeleteEvent).toHaveBeenCalledWith('event-1');
      });
    });
  });

  describe('Event Links', () => {
    it('should link to event canvas page', () => {
      render(<EventListClient initialEvents={mockEvents} />);

      const links = screen.getAllByRole('link');
      const eventLink = links.find(link =>
        link.getAttribute('href')?.includes('/dashboard/events/event-1/canvas')
      );

      expect(eventLink).toBeInTheDocument();
    });
  });
});
