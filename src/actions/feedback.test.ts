import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockResendSend, resetResendMocks } from '@/test/mocks/resend';

// Mock user for auth
const mockUser = {
  id: 'test-user-id',
  email: 'testuser@example.com',
};

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
  })),
}));

// Variable to control whether resend is configured
let resendConfigured = true;
const mockResend = {
  emails: {
    send: mockResendSend,
  },
};

vi.mock('@/lib/email/resend', () => ({
  get resend() {
    return resendConfigured ? mockResend : null;
  },
  EMAIL_FROM: 'noreply@seatify.app',
}));

// Import after mocks are set up
import { sendFeedbackEmail } from './feedback';
import { createClient } from '@/lib/supabase/server';

const mockedCreateClient = vi.mocked(createClient);

describe('sendFeedbackEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetResendMocks();
    resendConfigured = true;
  });

  afterEach(() => {
    resendConfigured = true;
  });

  it('should send feedback email successfully with all fields', async () => {
    const result = await sendFeedbackEmail({
      category: 'bug',
      subject: 'Found a bug',
      description: 'The button does not work',
      pageUrl: 'https://seatify.app/dashboard',
      userAgent: 'Mozilla/5.0',
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockResendSend).toHaveBeenCalledTimes(1);

    const emailCall = mockResendSend.mock.calls[0][0];
    expect(emailCall.from).toBe('noreply@seatify.app');
    expect(emailCall.to).toBe('jeremy@seatify.app');
    expect(emailCall.replyTo).toBe('testuser@example.com');
    expect(emailCall.subject).toContain('[Seatify Bug Report]');
    expect(emailCall.subject).toContain('Found a bug');
  });

  it('should send feedback email with minimal required fields', async () => {
    const result = await sendFeedbackEmail({
      category: 'feature',
      subject: '',
      description: 'Please add dark mode',
    });

    expect(result.success).toBe(true);
    expect(mockResendSend).toHaveBeenCalledTimes(1);

    const emailCall = mockResendSend.mock.calls[0][0];
    expect(emailCall.subject).toContain('[Seatify Feature Request]');
    expect(emailCall.subject).toContain('No subject');
  });

  it('should return error when Resend is not configured', async () => {
    resendConfigured = false;

    const result = await sendFeedbackEmail({
      category: 'bug',
      subject: 'Test',
      description: 'Test description',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email service not configured');
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('should return error when not authenticated', async () => {
    mockedCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const result = await sendFeedbackEmail({
      category: 'question',
      subject: 'Test',
      description: 'Test description',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated');
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('should return error when Resend API fails', async () => {
    mockResendSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Rate limit exceeded' },
    });

    const result = await sendFeedbackEmail({
      category: 'other',
      subject: 'Test',
      description: 'Test description',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
  });

  it('should handle different category types correctly', async () => {
    const categories = ['bug', 'feature', 'question', 'other'] as const;
    const expectedLabels = ['Bug Report', 'Feature Request', 'Question', 'Other Feedback'];

    for (let i = 0; i < categories.length; i++) {
      vi.clearAllMocks();
      resetResendMocks();

      await sendFeedbackEmail({
        category: categories[i],
        subject: 'Test',
        description: 'Test description',
      });

      const emailCall = mockResendSend.mock.calls[0][0];
      expect(emailCall.subject).toContain(expectedLabels[i]);
    }
  });

  it('should include user context in email body', async () => {
    await sendFeedbackEmail({
      category: 'bug',
      subject: 'Test',
      description: 'Test description',
      pageUrl: 'https://seatify.app/dashboard/events/123/canvas',
      userAgent: 'Mozilla/5.0 Chrome/120',
    });

    const emailCall = mockResendSend.mock.calls[0][0];
    expect(emailCall.text).toContain('testuser@example.com');
    expect(emailCall.text).toContain('https://seatify.app/dashboard/events/123/canvas');
    expect(emailCall.text).toContain('Mozilla/5.0 Chrome/120');
    expect(emailCall.html).toContain('testuser@example.com');
  });

  it('should handle Resend throwing an exception', async () => {
    mockResendSend.mockRejectedValueOnce(new Error('Network error'));

    const result = await sendFeedbackEmail({
      category: 'bug',
      subject: 'Test',
      description: 'Test description',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});
