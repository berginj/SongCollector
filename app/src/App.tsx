import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminProvider } from './AdminContext';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/AdminPage';
import { AdminTeamPage } from './pages/AdminTeamPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { HomePage } from './pages/HomePage';
import { SubmitPage } from './pages/SubmitPage';
import { TeamPage } from './pages/TeamPage';

export const router = createBrowserRouter([{ element: <Layout />, children: [
  { path: '/', element: <HomePage /> },
  { path: '/teams/:slug', element: <TeamPage /> },
  { path: '/teams/:slug/submit', element: <SubmitPage /> },
  { path: '/discover', element: <DiscoverPage /> },
  { path: '/teams/:slug/discover', element: <DiscoverPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/admin/teams/:teamId', element: <AdminTeamPage /> },
  { path: '*', element: <div className="page narrow"><h1>Page not found</h1><LinkHome /></div> },
]}]);

function LinkHome() { return <a href="/">Back home</a>; }
export function App() { return <AdminProvider><RouterProvider router={router} /></AdminProvider>; }
