import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getServerSubscription } from '@/lib/subscription/server';
import { ProfileClient } from './ProfileClient';

export const metadata = {
  title: 'Profile Settings',
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get subscription info
  const { plan, limits } = await getServerSubscription(user.id);

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('theme, custom_logo_url')
    .eq('id', user.id)
    .single();

  // Get event count for stats
  const { count: eventCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return (
    <ProfileClient
      user={{
        id: user.id,
        email: user.email || '',
        createdAt: user.created_at,
      }}
      subscription={{
        plan,
        limits,
      }}
      profile={{
        theme: profile?.theme || 'system',
        customLogoUrl: profile?.custom_logo_url || null,
      }}
      stats={{
        eventCount: eventCount || 0,
      }}
    />
  );
}
