'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { migrateDemo } from '@/actions/migrateDemo';
import { showToast } from './toastStore';
import type { Event } from '@/types';
import type { GatedFeature } from './DemoSignupModal';

const DEMO_MIGRATION_KEY = 'seatify_demo_migration';

interface DemoMigrationData {
  event: Event;
  feature: GatedFeature;
  timestamp: number;
}

/**
 * Component that handles demo-to-account data migration after signup.
 *
 * This component should be placed in the dashboard layout. It:
 * 1. Checks URL for `migrate=demo` parameter
 * 2. Retrieves demo event data from sessionStorage
 * 3. Calls the migrateDemo server action
 * 4. Redirects to the new event's canvas
 * 5. Cleans up URL and sessionStorage
 */
export function DemoMigrationHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMigrating, setIsMigrating] = useState(false);

  const cleanupUrl = useCallback(() => {
    // Remove migrate and feature params from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('migrate');
    url.searchParams.delete('feature');
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  const performMigration = useCallback(async (data: DemoMigrationData, feature: GatedFeature | null) => {
    setIsMigrating(true);

    try {
      const result = await migrateDemo(data.event);

      if (result.error) {
        console.error('Migration failed:', result.error);
        showToast('Failed to save your demo work. Please try again.', 'error');
        cleanupUrl();
        setIsMigrating(false);
        return;
      }

      if (result.data?.eventId) {
        // Clear the stored demo data
        sessionStorage.removeItem(DEMO_MIGRATION_KEY);

        // Show success message
        showToast('Your demo work has been saved!', 'success');

        // Redirect to the new event's canvas (or dashboard based on feature)
        const eventId = result.data.eventId;
        const redirectPath = feature
          ? `/dashboard/events/${eventId}/dashboard`
          : `/dashboard/events/${eventId}/canvas`;

        router.push(redirectPath);
      }
    } catch (error) {
      console.error('Migration error:', error);
      showToast('Something went wrong. Please try again.', 'error');
      cleanupUrl();
    } finally {
      setIsMigrating(false);
    }
  }, [cleanupUrl, router]);

  useEffect(() => {
    const migrate = searchParams.get('migrate');
    const feature = searchParams.get('feature') as GatedFeature | null;

    if (migrate !== 'demo' || isMigrating) {
      return;
    }

    // Check for demo data in sessionStorage
    const storedData = sessionStorage.getItem(DEMO_MIGRATION_KEY);
    if (!storedData) {
      // No demo data to migrate, clean up URL
      cleanupUrl();
      return;
    }

    // Parse the stored data
    let migrationData: DemoMigrationData;
    try {
      migrationData = JSON.parse(storedData);
    } catch {
      console.error('Failed to parse demo migration data');
      sessionStorage.removeItem(DEMO_MIGRATION_KEY);
      cleanupUrl();
      return;
    }

    // Check if data is expired (24 hours)
    const isExpired = Date.now() - migrationData.timestamp > 24 * 60 * 60 * 1000;
    if (isExpired) {
      sessionStorage.removeItem(DEMO_MIGRATION_KEY);
      cleanupUrl();
      return;
    }

    // Perform migration
    performMigration(migrationData, feature);
  }, [searchParams, isMigrating, performMigration, cleanupUrl]);

  // Show loading state while migrating
  if (isMigrating) {
    return (
      <div className="demo-migration-overlay">
        <div className="demo-migration-modal">
          <div className="demo-migration-spinner" />
          <h2>Saving your work...</h2>
          <p>Please wait while we set up your account.</p>
        </div>
        <style jsx>{`
          .demo-migration-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
          }
          .demo-migration-modal {
            background: white;
            border-radius: 16px;
            padding: 2.5rem;
            text-align: center;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
            max-width: 360px;
          }
          .demo-migration-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top-color: #f97352;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .demo-migration-modal h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1a1a1a;
          }
          .demo-migration-modal p {
            color: #666;
            font-size: 0.95rem;
          }
          @media (prefers-color-scheme: dark) {
            .demo-migration-modal {
              background: #1a1a1a;
            }
            .demo-migration-modal h2 {
              color: #f5f5f5;
            }
            .demo-migration-modal p {
              color: #999;
            }
            .demo-migration-spinner {
              border-color: #404040;
              border-top-color: #f97352;
            }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
