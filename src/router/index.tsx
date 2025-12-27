// React Router v6 with HashRouter for GitHub Pages compatibility
import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LandingPage } from '../components/LandingPage';
import { EventListView } from '../components/EventListView';
import { EventLayout } from './EventLayout';
import { trackPageView } from '../utils/analytics';

// Lazy load heavy components for better initial load performance
const Canvas = lazy(() => import('../components/Canvas').then(m => ({ default: m.Canvas })));
const Sidebar = lazy(() => import('../components/Sidebar').then(m => ({ default: m.Sidebar })));
const DashboardView = lazy(() => import('../components/DashboardView').then(m => ({ default: m.DashboardView })));
const GuestManagementView = lazy(() => import('../components/GuestManagementView').then(m => ({ default: m.GuestManagementView })));
const QRTableInfoPage = lazy(() => import('../components/QRTableInfoPage').then(m => ({ default: m.QRTableInfoPage })));
const ShareableViewPage = lazy(() => import('../components/ShareableViewPage').then(m => ({ default: m.ShareableViewPage })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '200px',
      color: 'var(--text-secondary)',
    }}>
      <span>Loading...</span>
    </div>
  );
}

function CanvasView() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Sidebar />
      <Canvas />
    </Suspense>
  );
}

// Track page views on route changes and update document title
function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    // Map routes to human-readable page titles
    const getPageTitle = (pathname: string): string => {
      if (pathname === '/') return 'Free Seating Chart Maker';
      if (pathname === '/events') return 'My Events';
      if (pathname.includes('/dashboard')) return 'Dashboard';
      if (pathname.includes('/canvas')) return 'Canvas';
      if (pathname.includes('/guests')) return 'Guest Management';
      if (pathname.includes('/table/')) return 'Table Info';
      if (pathname.includes('/share')) return 'Shared View';
      return 'Seatify';
    };

    const pageTitle = getPageTitle(location.pathname);

    // Update document title for better SEO and UX
    // Landing page gets the full title, others get "Page | Seatify" format
    if (location.pathname === '/') {
      document.title = 'Free Seating Chart Maker | Wedding Seating Plan Generator - Seatify';
    } else {
      document.title = `${pageTitle} | Seatify`;
    }

    trackPageView(location.pathname, pageTitle);
  }, [location.pathname]);

  return null;
}

export function AppRouter() {
  return (
    <HashRouter>
      <PageViewTracker />
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Event list */}
        <Route path="/events" element={<EventLayout />}>
          <Route index element={<EventListView />} />
        </Route>

        {/* Event views with nested routes */}
        <Route path="/events/:eventId" element={<EventLayout />}>
          {/* Default redirect to canvas */}
          <Route index element={<Navigate to="canvas" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<LoadingFallback />}><DashboardView /></Suspense>} />
          <Route path="canvas" element={<CanvasView />} />
          <Route path="guests" element={<Suspense fallback={<LoadingFallback />}><GuestManagementView /></Suspense>} />
        </Route>

        {/* QR code table info page */}
        <Route path="/table/:encodedData" element={<Suspense fallback={<LoadingFallback />}><QRTableInfoPage /></Suspense>} />

        {/* Shareable read-only view */}
        <Route path="/share/:encodedData" element={<Suspense fallback={<LoadingFallback />}><ShareableViewPage /></Suspense>} />
        <Route path="/share" element={<Suspense fallback={<LoadingFallback />}><ShareableViewPage /></Suspense>} />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
