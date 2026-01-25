import { Metadata } from 'next';
import './coming-soon.css';

export const metadata: Metadata = {
  title: 'Coming Soon | Seatify',
  description: 'Seatify is coming soon. Beautiful seating charts for your events.',
  robots: 'noindex, nofollow',
};

export default function ComingSoonPage() {
  return (
    <div className="coming-soon-page">
      <div className="coming-soon-content">
        <div className="coming-soon-logo">
          <h1>Seatify</h1>
        </div>

        <div className="coming-soon-message">
          <h2>Coming Soon</h2>
          <p>
            We&apos;re putting the finishing touches on something special.
            <br />
            Beautiful seating charts for your events.
          </p>
        </div>

        <div className="coming-soon-illustration">
          <svg viewBox="0 0 200 200" fill="none" className="table-illustration">
            {/* Round table */}
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
            <text x="100" y="105" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="500">Table 1</text>
            {/* Guest seats */}
            <circle cx="100" cy="45" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            <circle cx="148" cy="75" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            <circle cx="148" cy="125" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            <circle cx="100" cy="155" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            <circle cx="52" cy="125" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            <circle cx="52" cy="75" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
          </svg>
        </div>

        <div className="coming-soon-footer">
          <p>Have questions? Reach out to us.</p>
        </div>
      </div>
    </div>
  );
}
