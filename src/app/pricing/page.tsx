import { Metadata } from 'next';
import { PricingPage } from '@/components/landing-pages/PricingPage';

export const metadata: Metadata = {
  title: 'Pricing - Seatify Plans & Features',
  description: 'Choose the Seatify plan that fits your needs. Free for small events, Pro for unlimited events and custom branding, Team for collaboration.',
  keywords: ['seatify pricing', 'seating chart pricing', 'event planning pricing', 'seating software cost'],
};

export default function PricingRoute() {
  return <PricingPage />;
}
