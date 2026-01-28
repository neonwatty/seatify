'use server';

import { resend, EMAIL_FROM } from '@/lib/email/resend';
import { createClient } from '@/lib/supabase/server';

export type FeedbackCategory = 'bug' | 'feature' | 'question' | 'other';

interface SendFeedbackParams {
  category: FeedbackCategory;
  subject: string;
  description: string;
  pageUrl?: string;
  userAgent?: string;
}

interface SendFeedbackResult {
  success: boolean;
  error?: string;
}

const FEEDBACK_EMAIL = 'jeremy@seatify.app';

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  question: 'Question',
  other: 'Other Feedback',
};

const CATEGORY_EMOJI: Record<FeedbackCategory, string> = {
  bug: '🐛',
  feature: '💡',
  question: '❓',
  other: '💬',
};

export async function sendFeedbackEmail(
  params: SendFeedbackParams
): Promise<SendFeedbackResult> {
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  // Get current user for context
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { category, subject, description, pageUrl, userAgent } = params;
  const categoryLabel = CATEGORY_LABELS[category];
  const categoryEmoji = CATEGORY_EMOJI[category];

  // Build email subject
  const emailSubject = `[Seatify ${categoryLabel}] ${subject || 'No subject'}`;

  // Build email body (plain text for simplicity)
  const emailBody = `
${categoryEmoji} ${categoryLabel}
${'='.repeat(50)}

From: ${user.email}
Date: ${new Date().toLocaleString()}
${pageUrl ? `Page: ${pageUrl}` : ''}
${userAgent ? `Browser: ${userAgent}` : ''}

${'─'.repeat(50)}

Subject: ${subject || '(No subject)'}

Description:
${description}

${'─'.repeat(50)}

Reply directly to this email to respond to the user.
`.trim();

  // Build HTML version
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #3d2c24; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #fef7f3; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 1.25rem; color: #3d2c24; }
    .badge { display: inline-block; background: ${category === 'bug' ? '#fee2e2' : category === 'feature' ? '#dcfce7' : category === 'question' ? '#dbeafe' : '#f5f5f5'}; color: ${category === 'bug' ? '#991b1b' : category === 'feature' ? '#166534' : category === 'question' ? '#1e40af' : '#525252'}; padding: 4px 12px; border-radius: 999px; font-size: 0.875rem; font-weight: 600; }
    .meta { background: #fafafa; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 0.875rem; color: #737373; }
    .meta p { margin: 4px 0; }
    .content { background: white; border: 1px solid #ede0d4; padding: 20px; border-radius: 8px; }
    .content h2 { margin-top: 0; font-size: 1rem; color: #3d2c24; }
    .description { white-space: pre-wrap; color: #525252; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ede0d4; font-size: 0.875rem; color: #8b7355; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${categoryEmoji} Seatify Feedback</h1>
      <span class="badge">${categoryLabel}</span>
    </div>

    <div class="meta">
      <p><strong>From:</strong> ${user.email}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      ${pageUrl ? `<p><strong>Page:</strong> ${pageUrl}</p>` : ''}
      ${userAgent ? `<p><strong>Browser:</strong> ${userAgent}</p>` : ''}
    </div>

    <div class="content">
      <h2>${subject || '(No subject)'}</h2>
      <div class="description">${description.replace(/\n/g, '<br>')}</div>
    </div>

    <div class="footer">
      Reply directly to this email to respond to the user at ${user.email}.
    </div>
  </div>
</body>
</html>
`.trim();

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: FEEDBACK_EMAIL,
      replyTo: user.email,
      subject: emailSubject,
      text: emailBody,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send feedback email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to send feedback email:', err);
    return { success: false, error: errorMessage };
  }
}
