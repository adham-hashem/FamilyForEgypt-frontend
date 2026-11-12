import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Outlet, RouterProvider, createBrowserRouter, useRouteError } from 'react-router-dom';
import { SiteLayout } from './components/Layout';
import { EmptyState, LinkButton, PageLoader, ToastProvider } from './components/ui';
import './index.css';
import type { ApiError } from './lib/api';
import { AuthProvider } from './lib/auth';
import { Account, Login, Register, RequireAuth } from './pages/Auth';
import Home from './pages/Home';

// Everything beyond the home page is loaded on demand, so the first visit stays light.
const Posts = lazy(() => import('./pages/Posts'));
const PostDetail = lazy(() => import('./pages/Posts').then((m) => ({ default: m.PostDetailPage })));
const Colleges = lazy(() => import('./pages/Colleges'));
const CollegeDetail = lazy(() => import('./pages/Colleges').then((m) => ({ default: m.CollegeDetailPage })));
const Join = lazy(() => import('./pages/Join'));
const ForgotPassword = lazy(() => import('./pages/Recovery').then((m) => ({ default: m.ForgotPassword })));
const AdminAttendees = lazy(() => import('./pages/Attendance').then((m) => ({ default: m.AdminAttendees })));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.Dashboard })));
const content = () => import('./pages/admin/Content');
const people = () => import('./pages/admin/People');
const system = () => import('./pages/admin/System');
const AdminPosts = lazy(() => content().then((m) => ({ default: m.AdminPosts })));
const PostEditor = lazy(() => content().then((m) => ({ default: m.PostEditor })));
const AdminResources = lazy(() => content().then((m) => ({ default: m.AdminResources })));
const ResourceEditor = lazy(() => content().then((m) => ({ default: m.ResourceEditor })));
const AdminApplications = lazy(() => people().then((m) => ({ default: m.AdminApplications })));
const ApplicationDetail = lazy(() => people().then((m) => ({ default: m.ApplicationDetailPage })));
const AdminUsers = lazy(() => people().then((m) => ({ default: m.AdminUsers })));
const AdminColleges = lazy(() => system().then((m) => ({ default: m.AdminColleges })));
const AdminSite = lazy(() => system().then((m) => ({ default: m.AdminSite })));
const AdminAudit = lazy(() => system().then((m) => ({ default: m.AdminAudit })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying a 4xx only delays the message the user needs to see.
      retry: (count, error) => {
        const status = (error as ApiError).status;
        return (status === 0 || status >= 500) && count < 2;
      },
    },
  },
});

function NotFound() {
  return (
    <div className="container-page py-20">
      <EmptyState
        title="الصفحة غير موجودة"
        text="الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton to="/">الصفحة الرئيسية</LinkButton>
            <LinkButton to="/activities" variant="outline">الأنشطة والفعاليات</LinkButton>
          </div>
        }
      />
    </div>
  );
}

/** Last line of defence: an unexpected error still leaves the user with a way out. */
function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        title="حدث خطأ غير متوقع"
        text="جرّب إعادة تحميل الصفحة. إذا تكررت المشكلة تواصل مع إدارة الأسرة."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => window.location.reload()} className="h-11 rounded-xl bg-brand-600 px-5 font-bold text-white">إعادة التحميل</button>
            <a href="/" className="flex h-11 items-center rounded-xl border border-ink-300 bg-white px-5 font-bold">الصفحة الرئيسية</a>
          </div>
        }
      />
    </div>
  );
}

function Lazy() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      {
        element: <Lazy />,
        children: [
          { path: 'activities', element: <Posts /> },
          { path: 'activities/:id', element: <PostDetail /> },
          { path: 'colleges', element: <Colleges /> },
          { path: 'colleges/:id', element: <CollegeDetail /> },
          { path: 'join', element: <Join /> },
          { path: 'login', element: <Login /> },
          { path: 'register', element: <Register /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'account', element: <RequireAuth><Account /></RequireAuth> },
          {
            path: 'admin',
            element: <RequireAuth minimum="CollegeEditor"><AdminLayout /></RequireAuth>,
            children: [
              {
                element: <Lazy />,
                children: [
                  { index: true, element: <Dashboard /> },
                  { path: 'posts', element: <AdminPosts /> },
                  { path: 'posts/new', element: <PostEditor /> },
                  { path: 'posts/:id', element: <PostEditor /> },
                  { path: 'posts/:id/attendees', element: <AdminAttendees /> },
                  { path: 'resources', element: <AdminResources /> },
                  { path: 'resources/new', element: <ResourceEditor /> },
                  { path: 'resources/:id', element: <ResourceEditor /> },
                  { path: 'applications', element: <RequireAuth minimum="CollegeAdmin"><AdminApplications /></RequireAuth> },
                  { path: 'applications/:id', element: <RequireAuth minimum="CollegeAdmin"><ApplicationDetail /></RequireAuth> },
                  { path: 'users', element: <RequireAuth minimum="CollegeAdmin"><AdminUsers /></RequireAuth> },
                  { path: 'colleges', element: <RequireAuth minimum="CollegeAdmin"><AdminColleges /></RequireAuth> },
                  { path: 'site', element: <RequireAuth minimum="UniversityAdmin"><AdminSite /></RequireAuth> },
                  { path: 'audit', element: <RequireAuth minimum="SuperAdmin"><AdminAudit /></RequireAuth> },
                ],
              },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
