// React Router v6 with HashRouter for GitHub Pages compatibility
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '../components/LandingPage';
import { EventListView } from '../components/EventListView';
import { QRTableInfoPage } from '../components/QRTableInfoPage';
import { ShareableViewPage } from '../components/ShareableViewPage';
import { EventLayout } from './EventLayout';
import { DashboardView } from '../components/DashboardView';
import { Canvas } from '../components/Canvas';
import { Sidebar } from '../components/Sidebar';
import { GuestManagementView } from '../components/GuestManagementView';

function CanvasView() {
  return (
    <>
      <Sidebar />
      <Canvas />
    </>
  );
}

export function AppRouter() {
  return (
    <HashRouter>
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
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="canvas" element={<CanvasView />} />
          <Route path="guests" element={<GuestManagementView />} />
        </Route>

        {/* QR code table info page */}
        <Route path="/table/:encodedData" element={<QRTableInfoPage />} />

        {/* Shareable read-only view */}
        <Route path="/share/:encodedData" element={<ShareableViewPage />} />
        <Route path="/share" element={<ShareableViewPage />} />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
