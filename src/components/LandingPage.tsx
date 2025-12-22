import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import { version } from '../../package.json';
import { UpdatesButton } from './UpdatesPopup';

export function LandingPage() {
  const navigate = useNavigate();

  const handleEnterApp = () => {
    navigate('/events');
  };
  return (
    <div className="landing-page">
      {/* Floating Decorative Shapes - Matching actual app visuals */}
      <div className="floating-shapes" aria-hidden="true">
        {/* Round Table with Seated Guests - Top Right (matches app's round table) */}
        <svg className="floating-shape shape-table-round" viewBox="0 0 120 120">
          {/* Table surface with border */}
          <circle cx="60" cy="60" r="32" fill="var(--color-bg)" stroke="currentColor" strokeWidth="3" opacity="0.8" />
          {/* Table label */}
          <text x="60" y="56" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.9" fontWeight="600">Table 1</text>
          <text x="60" y="70" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.7">4/6</text>
          {/* Seated guests around table (circles with initials) */}
          <circle cx="60" cy="18" r="12" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="60" y="22" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.8" fontWeight="500">JD</text>
          <circle cx="102" cy="60" r="12" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="102" y="64" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.8" fontWeight="500">AS</text>
          <circle cx="60" cy="102" r="12" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="60" y="106" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.8" fontWeight="500">MK</text>
          <circle cx="18" cy="60" r="12" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="18" y="64" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.8" fontWeight="500">RW</text>
        </svg>

        {/* Guest Circle with Initials - Left Side (matches unassigned guest) */}
        <svg className="floating-shape shape-guest-1" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="var(--color-bg)" stroke="currentColor" strokeWidth="3" opacity="0.9" />
          <text x="25" y="30" textAnchor="middle" fontSize="14" fill="currentColor" opacity="0.8" fontWeight="600">EB</text>
        </svg>

        {/* Rectangle Table with Guests - Bottom Left */}
        <svg className="floating-shape shape-table-rect" viewBox="0 0 140 80">
          {/* Table surface */}
          <rect x="20" y="25" width="100" height="30" rx="8" fill="var(--color-bg)" stroke="currentColor" strokeWidth="3" opacity="0.8" />
          <text x="70" y="44" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.8" fontWeight="600">Table 2</text>
          {/* Guests on top */}
          <circle cx="45" cy="12" r="10" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="45" y="16" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.8" fontWeight="500">TL</text>
          <circle cx="95" cy="12" r="10" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="95" y="16" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.8" fontWeight="500">KP</text>
          {/* Guests on bottom */}
          <circle cx="45" cy="68" r="10" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="45" y="72" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.8" fontWeight="500">NJ</text>
          <circle cx="95" cy="68" r="10" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <text x="95" y="72" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.8" fontWeight="500">CP</text>
        </svg>

        {/* Heart (relationships/wedding theme) - Upper Left */}
        <svg className="floating-shape shape-heart" viewBox="0 0 40 40">
          <path
            d="M20 35 C10 25 2 18 2 12 C2 6 7 2 12 2 C15 2 18 4 20 7 C22 4 25 2 28 2 C33 2 38 6 38 12 C38 18 30 25 20 35Z"
            fill="currentColor"
            opacity="0.6"
          />
        </svg>

        {/* Second Guest Circle - Right Side */}
        <svg className="floating-shape shape-guest-2" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="var(--color-bg)" stroke="currentColor" strokeWidth="3" opacity="0.85" />
          <text x="25" y="30" textAnchor="middle" fontSize="14" fill="currentColor" opacity="0.75" fontWeight="600">LM</text>
        </svg>

        {/* Name Card / Place Card - Center Right */}
        <svg className="floating-shape shape-namecard" viewBox="0 0 80 50">
          <rect x="5" y="10" width="70" height="30" rx="4" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" opacity="0.85" />
          <line x1="15" y1="28" x2="65" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <text x="40" y="24" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7" fontWeight="500">Guest Name</text>
        </svg>
      </div>

      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="logo-wrapper">
            <h1 className="landing-logo">
              <span className="logo-seat">Seat</span>
              <span className="logo-ify">ify</span>
              <span className="sr-only"> - Free Seating Chart Maker & Wedding Seating Plan Generator</span>
            </h1>
          </div>
          <p className="landing-tagline">Free Seating Chart Maker for Weddings & Events</p>
          <p className="landing-description">
            Create beautiful seating plans with drag-and-drop simplicity. Our smart
            seating plan generator handles guest relationships automatically.
          </p>
          <button className="cta-button" onClick={handleEnterApp}>
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
                Import your guest list from your favorite planning tools and
                track responses as they come in.
              </p>
              <div className="supported-platforms">
                <span className="platforms-label">Works with:</span>
                <span className="platform-name">Zola</span>
                <span className="platform-name">RSVPify</span>
                <span className="platform-name">Joy</span>
                <span className="platform-name">CSV/Excel</span>
                <span className="platform-name coming-soon">The Knot <small>(coming soon)</small></span>
                <span className="platform-name coming-soon">Eventbrite <small>(coming soon)</small></span>
              </div>
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
