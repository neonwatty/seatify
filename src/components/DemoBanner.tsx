'use client';

import { useNavigate } from '@/lib/router-compat';
import { useStore } from '../store/useStore';
import './DemoBanner.css';

export function DemoBanner() {
  const navigate = useNavigate();
  const { isDemo } = useStore();

  if (!isDemo) return null;

  return (
    <div className="demo-banner">
      <div className="demo-banner-content">
        <span className="demo-banner-text">
          You&apos;re viewing a demo event. Changes won&apos;t be saved.
        </span>
        <button
          className="demo-banner-cta"
          onClick={() => navigate('/signup')}
        >
          Sign up to create your own
        </button>
      </div>
    </div>
  );
}
