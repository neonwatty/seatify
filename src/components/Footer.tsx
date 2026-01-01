import { Link } from 'react-router-dom';
import { version } from '../../package.json';
import { UpdatesButton } from './UpdatesPopup';
import './Footer.css';

interface FooterProps {
  variant?: 'landing' | 'minimal';
}

export function Footer({ variant = 'landing' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`site-footer site-footer--${variant}`}>
      <div className="footer-container">
        {/* Main footer content */}
        <div className="footer-main">
          {/* Brand column */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-seat">Seat</span>
              <span className="footer-logo-ify">ify</span>
            </Link>
            <p className="footer-tagline">
              Free seating chart maker for weddings and events.
            </p>
            <p className="footer-privacy-note">
              Your data stays private — stored locally in your browser, not our servers.
            </p>
          </div>

          {/* Links columns */}
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <ul>
                <li><Link to="/events">Get Started</Link></li>
                <li><UpdatesButton variant="landing" /></li>
                <li><span className="footer-version">v{version}</span></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Legal</h4>
              <ul>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Contact</h4>
              <ul>
                <li><a href="mailto:hello@seatify.app">hello@seatify.app</a></li>
                <li>
                  <a
                    href="https://github.com/neonwatty/seatify"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {currentYear} Seatify. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <Link to="/privacy">Privacy</Link>
            <span className="footer-divider">|</span>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
