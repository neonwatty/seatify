import './LandingPage.css';
import { version } from '../../package.json';
import { UpdatesButton } from './UpdatesPopup';

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  return (
    <div className="landing-page">
      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="logo-wrapper">
            <h1 className="landing-logo">
              <span className="logo-table">Table</span>
              <span className="logo-craft">Craft</span>
            </h1>
          </div>
          <p className="landing-tagline">Event Seating Made Simple</p>
          <p className="landing-description">
            Design floor plans, manage guest lists, and let smart optimization
            handle the tricky seating decisions.
          </p>
          <button className="cta-button" onClick={onEnterApp}>
            Start Planning Free
          </button>
        </section>

        {/* Wave Divider */}
        <div className="wave-divider">
          <svg viewBox="0 0 900 60" preserveAspectRatio="none">
            <path
              d="M0 30 Q225 0, 450 30 T900 30"
              stroke="var(--color-border)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>

        {/* Features Section */}
        <section className="features-section">
          <div className="features-stack">
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <svg
                  className="feature-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="feature-content">
                <h3>Smart Seating</h3>
                <p>
                  Keep partners together, separate people who shouldn't sit near
                  each other. The optimizer handles the relationship math.
                </p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <svg
                  className="feature-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </div>
              <div className="feature-content">
                <h3>Visual Floor Plans</h3>
                <p>
                  Drag-and-drop tables in any shape. Add venue elements like
                  stages, bars, and dance floors.
                </p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <svg
                  className="feature-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <path d="M12 18h.01" />
                </svg>
              </div>
              <div className="feature-content">
                <h3>Works Everywhere</h3>
                <p>
                  Phone, tablet, or desktop. Your data stays in your browser —
                  private and always available.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <div className="use-cases">
          <span className="use-case-tag">Weddings</span>
          <span className="use-case-tag">Corporate Dinners</span>
          <span className="use-case-tag">Galas</span>
          <span className="use-case-tag">Team Offsites</span>
          <span className="use-case-tag">Private Parties</span>
        </div>

        {/* Preview Section - Animated Demo */}
        <section className="preview-section">
          <div className="demo-container">
            {/* Unassigned guest that will be dragged */}
            <div className="demo-guest-chip">Alex</div>

            {/* Drag trail (dashed path) */}
            <svg
              className="demo-trail"
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
            >
              <path
                d="M 20 50 Q 100 50 180 50"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            </svg>

            {/* Table with seats */}
            <div className="demo-table">
              <div className="demo-capacity">
                <span className="capacity-before">3</span>
                <span className="capacity-after">4</span>
                <span className="capacity-divider">/4</span>
              </div>

              {/* Seated guests - positioned on table perimeter */}
              <div
                className="demo-seat"
                style={{
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="demo-seated family" />
              </div>
              <div
                className="demo-seat"
                style={{
                  bottom: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="demo-seated friend" />
              </div>
              <div
                className="demo-seat"
                style={{
                  left: '-12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <div className="demo-seated colleague" />
              </div>
              {/* Empty seat that gets filled */}
              <div
                className="demo-seat"
                style={{
                  right: '-12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <div className="demo-seated new-guest" />
              </div>
            </div>

            {/* Success checkmark */}
            <div className="demo-success">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M5 12l5 5L19 7" />
              </svg>
            </div>
          </div>
        </section>

        {/* Coming Soon Section */}
        <section className="coming-soon-section">
          <div className="coming-soon-header">
            <h2>Coming Soon...</h2>
          </div>
          <div className="coming-soon-grid">
            <div className="coming-soon-card">
              <h3>AI-Powered Seating</h3>
              <p>
                Advanced algorithms that learn guest relationships and
                preferences to suggest optimal arrangements.
              </p>
            </div>
            <div className="coming-soon-card">
              <h3>Guest Import & RSVP</h3>
              <p>
                Upload your guest list from a spreadsheet and track responses as
                they come in.
              </p>
            </div>
          </div>
        </section>

        {/* Email Capture */}
        <section className="email-capture">
          <h2>Stay in the loop</h2>
          <p className="email-description">Get notified about new features and updates.</p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScCTLlZ7XzOmKCtkJugnadmzx9F21l9v-lAQWjBs67mVHrElg/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="subscribe-button"
          >
            Subscribe for Updates
          </a>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-meta">
            <UpdatesButton variant="landing" />
            <span className="version-tag">v{version}</span>
          </div>
          <p className="trust-line">
            Your data stays private — stored locally in your browser, not our
            servers.
          </p>
        </footer>
      </div>
    </div>
  );
}
