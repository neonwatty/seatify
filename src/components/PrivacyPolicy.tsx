import { Link } from 'react-router-dom';
import './LegalPages.css';

export function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <Link to="/" className="legal-back-link">&larr; Back to Seatify</Link>

        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: January 2026</p>

        <section>
          <h2>Overview</h2>
          <p>
            Seatify ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we handle information when you use our seating chart application.
          </p>
        </section>

        <section>
          <h2>Information We Collect</h2>

          <h3>Data Stored Locally</h3>
          <p>
            Seatify stores all your event data (guests, tables, seating arrangements) locally in your
            browser using localStorage. <strong>This data never leaves your device</strong> and is not
            transmitted to our servers. You have full control over this data and can clear it at any time
            through your browser settings.
          </p>

          <h3>Analytics Data</h3>
          <p>We use Google Analytics to collect anonymous usage data, including:</p>
          <ul>
            <li>Pages visited and features used</li>
            <li>Device type and browser information</li>
            <li>Approximate geographic location (country/region level)</li>
            <li>Referral sources</li>
          </ul>
          <p>
            This data is aggregated and anonymized. We use it to understand how people use Seatify
            and to improve the application.
          </p>

          <h3>Email Subscriptions</h3>
          <p>
            If you choose to subscribe to updates, we collect your email address through Formspree.
            This is entirely optional. Your email is used only to send product updates and will never
            be sold or shared with third parties.
          </p>
        </section>

        <section>
          <h2>How We Use Information</h2>
          <ul>
            <li>To provide and maintain the Seatify application</li>
            <li>To understand usage patterns and improve the product</li>
            <li>To send product updates (only if you subscribe)</li>
            <li>To respond to your inquiries or support requests</li>
          </ul>
        </section>

        <section>
          <h2>Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share
            anonymous, aggregated statistics about application usage, but these contain no personally
            identifiable information.
          </p>
        </section>

        <section>
          <h2>Cookies and Tracking</h2>
          <p>
            Seatify uses cookies and similar technologies for:
          </p>
          <ul>
            <li>Google Analytics (usage analytics)</li>
            <li>Remembering your preferences (theme, settings)</li>
            <li>Storing application state in localStorage</li>
          </ul>
          <p>
            You can control cookies through your browser settings. Disabling cookies may affect
            some functionality.
          </p>
        </section>

        <section>
          <h2>Data Security</h2>
          <p>
            Since your event data is stored locally on your device, you maintain control over its
            security. We recommend:
          </p>
          <ul>
            <li>Using a secure, up-to-date browser</li>
            <li>Not sharing your device with untrusted parties</li>
            <li>Exporting important data as a backup</li>
          </ul>
        </section>

        <section>
          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your data (it's stored locally on your device)</li>
            <li>Delete your data (clear browser localStorage)</li>
            <li>Unsubscribe from email updates at any time</li>
            <li>Request information about data we hold</li>
          </ul>
        </section>

        <section>
          <h2>Children's Privacy</h2>
          <p>
            Seatify is not intended for children under 13. We do not knowingly collect information
            from children under 13.
          </p>
        </section>

        <section>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:privacy@seatify.app">privacy@seatify.app</a>.
          </p>
        </section>

        <div className="legal-footer-nav">
          <Link to="/">Home</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
