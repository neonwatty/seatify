import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/DashboardHeader';
import { PreferencesSyncProvider } from '@/components/PreferencesSyncProvider';
import './dashboard.css';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if this is a demo event route via header set by middleware
  const headersList = await headers();
  const isDemoMode = headersList.get('x-demo-mode') === 'true';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // For demo routes, render without header if no user
  if (isDemoMode && !user) {
    return (
      <div className="dashboard-layout">
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <PreferencesSyncProvider isAuthenticated={true}>
      <div className="dashboard-layout">
        <DashboardHeader user={user} />
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </PreferencesSyncProvider>
  );
}
