import { LandingPageClient } from '@/components/LandingPageClient';
import { LandingPageStructuredData } from '@/components/StructuredData';

export default function HomePage() {
  return (
    <>
      <LandingPageStructuredData />
      <LandingPageClient />
    </>
  );
}
