import { useQuery } from '@tanstack/react-query';
import {
  Building2, ClipboardList, FolderOpen, History, Home, LayoutDashboard, Newspaper, Plus, ShieldCheck, Users, type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Card, ErrorState, LinkButton, cx } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { ROLE_HINTS, ROLE_LABELS, formatNumber } from '../../lib/format';
import type { AdminStats, UserRole } from '../../lib/types';

interface NavItem { to: string; label: string; icon: LucideIcon; minimum: UserRole; end?: boolean }

const NAV: NavItem[] = [
  { to: '/admin', label: 'نظرة عامة', icon: LayoutDashboard, minimum: 'CollegeEditor', end: true },
  { to: '/admin/posts', label: 'الأخبار والفعاليات', icon: Newspaper, minimum: 'CollegeEditor' },
  { to: '/admin/resources', label: 'الجداول والمحاضرات', icon: FolderOpen, minimum: 'CollegeEditor' },
  { to: '/admin/applications', label: 'طلبات العضوية', icon: ClipboardList, minimum: 'CollegeAdmin' },
  { to: '/admin/users', label: 'المسؤولون والصلاحيات', icon: Users, minimum: 'CollegeAdmin' },
  { to: '/admin/colleges', label: 'الكليات', icon: Building2, minimum: 'CollegeAdmin' },
  { to: '/admin/site', label: 'الصفحة الرئيسية', icon: Home, minimum: 'UniversityAdmin' },
  { to: '/admin/audit', label: 'سجل العمليات', icon: History, minimum: 'SuperAdmin' },
];

export const statsQuery = { queryKey: ['admin', 'stats'], queryFn: () => api<AdminStats>('/api/admin/stats') };

export default function AdminLayout() {
  const { user, hasRole } = useAuth();
  const stats = useQuery(statsQuery);
  const items = NAV.filter((item) => hasRole(item.minimum));

  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[15rem_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-3 hidden rounded-2xl bg-ink-900 p-4 text-white lg:block">
          <p className="flex items-center gap-1.5 text-xs font-bold text-gold-300"><ShieldCheck className="size-4" /> {user && ROLE_LABELS[user.role]}</p>
          <p className="mt-1 truncate font-extrabold">{user?.collegeName ?? 'جامعة دمياط'}</p>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" aria-label="لوحة التحكم">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cx(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[15px] font-bold transition',
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-ink-100',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {label}
              {to === '/admin/applications' && !!stats.data?.pendingApplications && (
                <span className="ms-auto rounded-full bg-flame-500 px-2 text-xs font-black text-white">{formatNumber(stats.data.pendingApplications)}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

export function AdminTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        {subtitle && <p className="text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Dashboard() {
  const { user, hasRole } = useAuth();
  const { data, isPending, isError, refetch } = useQuery(statsQuery);
  if (!user) return null;

  const tiles = [
    { label: 'طلبات عضوية بانتظار المراجعة', value: data?.pendingApplications, to: '/admin/applications?status=Pending', show: hasRole('CollegeAdmin'), highlight: true },
    { label: 'أعضاء مقبولون', value: data?.approvedMembers, to: '/admin/applications?status=Approved', show: hasRole('CollegeAdmin') },
    { label: 'منشورات منشورة', value: data?.posts, to: '/admin/posts', show: true },
    { label: 'مسودات', value: data?.draftPosts, to: '/admin/posts?status=Draft', show: true },
    { label: 'جداول ومحاضرات', value: data?.resources, to: '/admin/resources', show: true },
    { label: 'مسؤولون', value: data?.staff, to: '/admin/users', show: hasRole('CollegeAdmin') },
    { label: 'كليات', value: data?.colleges, to: '/admin/colleges', show: hasRole('UniversityAdmin') },
    { label: 'حسابات طلاب', value: data?.students, to: '/admin/users?staff=0', show: hasRole('UniversityAdmin') },
  ].filter((tile) => tile.show);

  return (
    <>
      <AdminTitle title={`أهلاً، ${user.fullName.split(' ')[0]}`} subtitle={ROLE_HINTS[user.role]} />
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {tiles.map((tile) => (
            <Link
              key={tile.label}
              to={tile.to}
              className={cx(
                'rounded-2xl border p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift',
                tile.highlight && tile.value ? 'border-flame-400 bg-gradient-to-br from-flame-500 to-brand-600 text-white' : 'border-ink-200 bg-white',
              )}
            >
              {isPending ? <div className="skeleton h-9 w-14" /> : <p className="text-3xl font-black">{formatNumber(tile.value ?? 0)}</p>}
              <p className={cx('mt-1 text-sm font-bold', tile.highlight && tile.value ? 'text-white/90' : 'text-ink-500')}>{tile.label}</p>
            </Link>
          ))}
        </div>
      )}

      <Card className="mt-6 p-5">
        <h2 className="text-lg font-extrabold">إجراءات سريعة</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <LinkButton to="/admin/posts/new"><Plus className="size-4" /> خبر أو فعالية</LinkButton>
          <LinkButton to="/admin/resources/new" variant="dark"><Plus className="size-4" /> جدول أو محاضرة</LinkButton>
          {hasRole('CollegeAdmin') && <LinkButton to="/admin/applications?status=Pending" variant="outline">مراجعة الطلبات</LinkButton>}
          {hasRole('UniversityAdmin') && <LinkButton to="/admin/colleges" variant="outline">إدارة الكليات</LinkButton>}
        </div>
      </Card>
    </>
  );
}
