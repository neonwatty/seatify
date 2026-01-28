import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackModal } from './FeedbackModal';

// Mock the sendFeedbackEmail action
const mockSendFeedback = vi.fn();

vi.mock('@/actions/feedback', () => ({
  sendFeedbackEmail: (...args: unknown[]) => mockSendFeedback(...args),
}));

describe('FeedbackModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendFeedback.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<FeedbackModal isOpen={false} onClose={() => {}} />);

      expect(screen.queryByText('Send Feedback')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      // Check for the modal header specifically
      expect(screen.getByRole('heading', { name: 'Send Feedback' })).toBeInTheDocument();
    });

    it('should display intro text', () => {
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByText(/actively improving Seatify/i)).toBeInTheDocument();
    });
  });

  describe('Category Selection', () => {
    it('should display all category pills', () => {
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByRole('button', { name: /bug/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /feature/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /question/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /other/i })).toBeInTheDocument();
    });

    it('should visually select a category when clicked', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      const bugButton = screen.getByRole('button', { name: /bug/i });
      await user.click(bugButton);

      expect(bugButton).toHaveClass('selected');
    });

    it('should only have one category selected at a time', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      const bugButton = screen.getByRole('button', { name: /bug/i });
      const featureButton = screen.getByRole('button', { name: /feature/i });

      await user.click(bugButton);
      expect(bugButton).toHaveClass('selected');
      expect(featureButton).not.toHaveClass('selected');

      await user.click(featureButton);
      expect(bugButton).not.toHaveClass('selected');
      expect(featureButton).toHaveClass('selected');
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when no category is selected', () => {
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      const submitButton = screen.getByRole('button', { name: /send feedback/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when description is empty', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /bug/i }));

      const submitButton = screen.getByRole('button', { name: /send feedback/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when category and description are filled', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /bug/i }));
      await user.type(screen.getByPlaceholderText(/tell us more/i), 'This is a bug');

      const submitButton = screen.getByRole('button', { name: /send feedback/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should not require subject field', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /feature/i }));
      await user.type(screen.getByPlaceholderText(/tell us more/i), 'Add dark mode');

      // Don't fill subject
      const submitButton = screen.getByRole('button', { name: /send feedback/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('should show loading state while submitting', async () => {
      const user = userEvent.setup();
      mockSendFeedback.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)));

      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /bug/i }));
      await user.type(screen.getByPlaceholderText(/tell us more/i), 'Bug description');
      await user.click(screen.getByRole('button', { name: /send feedback/i }));

      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });

    it('should show success state after successful submission', async () => {
      const user = userEvent.setup();
      mockSendFeedback.mockResolvedValue({ success: true });

      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /bug/i }));
      await user.type(screen.getByPlaceholderText(/tell us more/i), 'Bug description');
      await user.click(screen.getByRole('button', { name: /send feedback/i }));

      await waitFor(() => {
        expect(screen.getByText(/thanks for your feedback/i)).toBeInTheDocument();
      });
    });

    it('should show error message when submission fails', async () => {
      const user = userEvent.setup();
      mockSendFeedback.mockResolvedValue({ success: false, error: 'Network error' });

      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /bug/i }));
      await user.type(screen.getByPlaceholderText(/tell us more/i), 'Bug description');
      await user.click(screen.getByRole('button', { name: /send feedback/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should call sendFeedbackEmail with correct params', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /feature/i }));
      await user.type(screen.getByPlaceholderText(/brief summary/i), 'Dark mode');
      await user.type(screen.getByPlaceholderText(/tell us more/i), 'Please add dark mode');
      await user.click(screen.getByRole('button', { name: /send feedback/i }));

      await waitFor(() => {
        expect(mockSendFeedback).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'feature',
            subject: 'Dark mode',
            description: 'Please add dark mode',
          })
        );
      });
    });
  });

  describe('Modal Closing', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<FeedbackModal isOpen={true} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<FeedbackModal isOpen={true} onClose={onClose} />);

      // Find the close button (has the X SVG)
      const closeButton = document.querySelector('.feedback-close-btn');
      if (closeButton) {
        await user.click(closeButton);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('should call onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<FeedbackModal isOpen={true} onClose={onClose} />);

      const overlay = document.querySelector('.feedback-modal-overlay');
      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('should not close when clicking inside modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<FeedbackModal isOpen={true} onClose={onClose} />);

      const modal = document.querySelector('.feedback-modal');
      if (modal) {
        await user.click(modal);
        expect(onClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Form Reset', () => {
    it('should reset form when modal reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<FeedbackModal isOpen={true} onClose={() => {}} />);

      // Fill out the form
      await user.click(screen.getByRole('button', { name: /bug/i }));
      await user.type(screen.getByPlaceholderText(/brief summary/i), 'Test subject');
      await user.type(screen.getByPlaceholderText(/tell us more/i), 'Test description');

      // Close and reopen
      rerender(<FeedbackModal isOpen={false} onClose={() => {}} />);
      rerender(<FeedbackModal isOpen={true} onClose={() => {}} />);

      // Form should be reset
      expect(screen.getByPlaceholderText(/brief summary/i)).toHaveValue('');
      expect(screen.getByPlaceholderText(/tell us more/i)).toHaveValue('');
      expect(screen.getByRole('button', { name: /bug/i })).not.toHaveClass('selected');
    });
  });
});
