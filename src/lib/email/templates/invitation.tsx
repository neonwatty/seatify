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

interface InvitationEmailProps {
  guestName: string;
  eventName: string;
  eventDate?: string;
  hostName?: string;
  rsvpUrl: string;
  customMessage?: string;
  deadline?: string;
}

export function InvitationEmail({
  guestName,
  eventName,
  eventDate,
  hostName,
  rsvpUrl,
  customMessage,
  deadline,
}: InvitationEmailProps) {
  const previewText = `You're invited to ${eventName}! Please RSVP.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Seatify</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Dear {guestName},</Text>

            <Text style={paragraph}>
              You&apos;re cordially invited to <strong>{eventName}</strong>
              {eventDate && ` on ${formatDate(eventDate)}`}!
            </Text>

            {customMessage && (
              <Text style={customMessageStyle}>{customMessage}</Text>
            )}

            <Text style={paragraph}>
              Please let us know if you&apos;ll be able to attend by clicking
              the button below.
            </Text>

            {deadline && (
              <Text style={deadlineText}>
                Please respond by {formatDate(deadline)}
              </Text>
            )}

            <Section style={buttonContainer}>
              <Button style={button} href={rsvpUrl}>
                RSVP Now
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
              You received this email because you&apos;re invited to {eventName}.
              If you believe this was sent in error, please ignore this email.
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

const customMessageStyle = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  marginBottom: '16px',
  fontStyle: 'italic' as const,
  backgroundColor: '#f9fafb',
  padding: '16px',
  borderRadius: '8px',
  borderLeft: '4px solid #4f46e5',
};

const deadlineText = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: '500' as const,
  marginBottom: '24px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#4f46e5',
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

export default InvitationEmail;
