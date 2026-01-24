import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components';

interface ReminderEmailProps {
  guestName: string;
  eventName: string;
  eventDate?: string;
  hostName?: string;
  rsvpUrl: string;
  deadline?: string;
  daysUntilDeadline?: number;
}

export function ReminderEmail({
  guestName,
  eventName,
  eventDate,
  hostName,
  rsvpUrl,
  deadline,
  daysUntilDeadline,
}: ReminderEmailProps) {
  const previewText = `Reminder: Please RSVP for ${eventName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Seatify</Text>
          </Section>

          <Section style={urgentBanner}>
            <Text style={urgentText}>RSVP Reminder</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Dear {guestName},</Text>

            <Text style={paragraph}>
              This is a friendly reminder that you haven&apos;t yet responded to
              the invitation for <strong>{eventName}</strong>
              {eventDate && ` on ${formatDate(eventDate)}`}.
            </Text>

            {daysUntilDeadline !== undefined && daysUntilDeadline > 0 && (
              <Text style={highlightBox}>
                You have <strong>{daysUntilDeadline} day{daysUntilDeadline !== 1 ? 's' : ''}</strong>{' '}
                left to respond
                {deadline && ` (deadline: ${formatDate(deadline)})`}
              </Text>
            )}

            {daysUntilDeadline === 0 && (
              <Text style={urgentBox}>
                <strong>Today is the last day to respond!</strong>
              </Text>
            )}

            <Text style={paragraph}>
              We would love to know if you can make it. Please take a moment to
              let us know your plans.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={rsvpUrl}>
                Respond Now
              </Button>
            </Section>

            <Text style={smallText}>
              Or copy and paste this link into your browser:
              <br />
              <Link href={rsvpUrl} style={link}>
                {rsvpUrl}
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            {hostName && (
              <Text style={footerText}>Hosted by {hostName}</Text>
            )}
            <Text style={footerText}>
              Powered by{' '}
              <Link href="https://seatify.app" style={link}>
                Seatify
              </Link>
            </Text>
            <Text style={footerDisclaimer}>
              You received this reminder because you haven&apos;t responded to
              your invitation for {eventName}. If you&apos;ve already responded,
              please ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '24px',
  borderBottom: '1px solid #e6ebf1',
};

const logo = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#4f46e5',
  margin: '0',
  textAlign: 'center' as const,
};

const urgentBanner = {
  backgroundColor: '#fef3c7',
  padding: '12px 24px',
};

const urgentText = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#92400e',
  margin: '0',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const content = {
  padding: '24px 48px',
};

const greeting = {
  fontSize: '18px',
  lineHeight: '28px',
  color: '#1f2937',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  marginBottom: '16px',
};

const highlightBox = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#92400e',
  backgroundColor: '#fef3c7',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const urgentBox = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#991b1b',
  backgroundColor: '#fee2e2',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#d97706',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '14px 32px',
};

const smallText = {
  fontSize: '12px',
  color: '#6b7280',
  textAlign: 'center' as const,
  marginTop: '16px',
};

const link = {
  color: '#4f46e5',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footer = {
  padding: '0 48px',
};

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
  textAlign: 'center' as const,
  margin: '8px 0',
};

const footerDisclaimer = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  marginTop: '16px',
};

export default ReminderEmail;
