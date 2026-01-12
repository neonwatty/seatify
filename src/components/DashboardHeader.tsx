'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <Link href="/dashboard" className="header-logo">
          <span className="logo-seat">Seat</span>
          <span className="logo-ify">ify</span>
        </Link>
      </div>

      <div className="header-right">
        <div className="user-menu">
          <button
            className="user-menu-button"
            onClick={() => setShowMenu(!showMenu)}
          >
            <span className="user-avatar">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="user-email">{user.email}</span>
            <svg
              className={`chevron ${showMenu ? 'open' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showMenu && (
            <div className="user-menu-dropdown">
              <Link href="/dashboard" className="menu-item" onClick={() => setShowMenu(false)}>
                My Events
              </Link>
              <Link href="/profile" className="menu-item" onClick={() => setShowMenu(false)}>
                Profile Settings
              </Link>
              <hr className="menu-divider" />
              <button className="menu-item sign-out" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
