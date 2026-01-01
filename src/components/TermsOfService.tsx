import { Link } from 'react-router-dom';
import './LegalPages.css';

export function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <Link to="/" className="legal-back-link">&larr; Back to Seatify</Link>

        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: January 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Seatify ("the Service"), you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            Seatify is a free web-based seating chart application that allows you to create and
            manage seating arrangements for events such as weddings, corporate dinners, and parties.
            The Service stores data locally in your browser.
          </p>
        </section>

        <section>
          <h2>3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Use the Service only for lawful purposes</li>
            <li>Not attempt to interfere with or disrupt the Service</li>
            <li>Not use the Service to store or transmit malicious code</li>
            <li>Maintain the security of your own device and data</li>
            <li>Provide accurate information if subscribing to updates</li>
          </ul>
        </section>

        <section>
          <h2>4. Intellectual Property</h2>
          <p>
            The Service, including its original content, features, and functionality, is owned by
            Seatify and is protected by international copyright, trademark, and other intellectual
            property laws.
          </p>
          <p>
            Your event data (guest lists, seating arrangements, etc.) remains your property.
            We claim no ownership over user-generated content.
          </p>
        </section>

        <section>
          <h2>5. Data and Privacy</h2>
          <p>
            Your use of the Service is also governed by our{' '}
            <Link to="/privacy">Privacy Policy</Link>. Key points:
          </p>
          <ul>
            <li>Event data is stored locally on your device</li>
            <li>We do not have access to your event data</li>
            <li>You are responsible for backing up your data</li>
            <li>Clearing browser data will delete your events</li>
          </ul>
        </section>

        <section>
          <h2>6. Service Availability</h2>
          <p>
            We strive to maintain the Service's availability but do not guarantee uninterrupted
            access. We may:
          </p>
          <ul>
            <li>Modify or discontinue features with or without notice</li>
            <li>Perform maintenance that temporarily affects availability</li>
            <li>Suspend or terminate the Service at our discretion</li>
          </ul>
        </section>

        <section>
          <h2>7. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Implied warranties of merchantability</li>
            <li>Fitness for a particular purpose</li>
            <li>Non-infringement</li>
          </ul>
          <p>
            We do not warrant that the Service will be error-free, secure, or available at all
            times.
          </p>
        </section>

        <section>
          <h2>8. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SEATIFY SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Loss of data or information</li>
            <li>Loss of profits or business opportunities</li>
            <li>Event planning disruptions</li>
            <li>Any damages resulting from Service use or inability to use</li>
          </ul>
        </section>

        <section>
          <h2>9. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Seatify and its operators from any claims,
            damages, or expenses arising from your use of the Service or violation of these Terms.
          </p>
        </section>

        <section>
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be effective
            immediately upon posting. Your continued use of the Service constitutes acceptance
            of the modified Terms.
          </p>
        </section>

        <section>
          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            United States, without regard to conflict of law principles.
          </p>
        </section>

        <section>
          <h2>12. Contact</h2>
          <p>
            For questions about these Terms, please contact us at{' '}
            <a href="mailto:legal@seatify.app">legal@seatify.app</a>.
          </p>
        </section>

        <div className="legal-footer-nav">
          <Link to="/">Home</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
