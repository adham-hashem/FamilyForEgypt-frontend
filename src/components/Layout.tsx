import { LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LinkButton, cx } from './ui';
import { FlagName, withFlagName } from './FlagName';

const NAV = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/activities', label: 'الأنشطة والفعاليات' },
  { to: '/colleges', label: 'الكليات' },
  { to: '/about', label: 'عن الأسرة' },
  { to: '/join', label: 'انضم للأسرة' },
];

function Header() {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cx('rounded-lg px-3 py-2 text-[15px] font-bold transition', isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:text-white');

  return (
    <header className="sticky top-0 z-40 bg-ink-900/95 text-white backdrop-blur supports-[backdrop-filter]:bg-ink-900/85">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="أسرة طلاب من أجل مصر — الرئيسية">
          <img src="/brand/logo-sm.webp" alt="" width={44} height={44} className="size-11 shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-black">طلاب <FlagName /></span>
            <span className="block text-xs font-semibold text-gold-300">جامعة دمياط</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>{item.label}</NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              {hasRole('CollegeEditor') && (
                <LinkButton to="/admin" variant="gold" size="sm"><LayoutDashboard className="size-4" /> لوحة التحكم</LinkButton>
              )}
              <LinkButton to="/account" variant="ghost" size="sm" className="!text-white hover:!bg-white/10">
                <UserRound className="size-4" /> {user.fullName.split(' ')[0]}
              </LinkButton>
              <button onClick={() => void logout()} className="rounded-lg p-2 text-ink-300 hover:bg-white/10 hover:text-white" aria-label="تسجيل الخروج" title="تسجيل الخروج">
                <LogOut className="size-5" />
              </button>
            </>
          ) : (
            <>
              <LinkButton to="/status" variant="primary" size="sm">متابعة طلبي</LinkButton>
            </>
          )}
        </div>

        <button className="rounded-lg p-2 hover:bg-white/10 lg:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="القائمة">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      <div className="h-[3px] flag-line" aria-hidden />

      {open && (
        <div className="border-t border-white/10 bg-ink-900 lg:hidden animate-fade">
          <nav className="container-page flex flex-col gap-1 py-3" aria-label="التنقل الرئيسي">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>{item.label}</NavLink>
            ))}
            <div className="my-2 h-px bg-white/10" />
            {user ? (
              <>
                {hasRole('CollegeEditor') && <NavLink to="/admin" className={navClass}>لوحة التحكم</NavLink>}
                <NavLink to="/account" className={navClass}>حسابي ({user.fullName.split(' ')[0]})</NavLink>
                <button onClick={() => void logout()} className="rounded-lg px-3 py-2 text-start text-[15px] font-bold text-brand-300 hover:bg-white/10">
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <LinkButton to="/status" variant="primary" size="sm">متابعة طلبي</LinkButton>
                <LinkButton to="/login" variant="outline" size="sm">دخول المسؤولين</LinkButton>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

/** Shown on every page: the application was built by the Faculty of Computers and AI. */
export function Footer() {
  return (
    <footer className="mt-auto bg-ink-900 text-ink-300">
      <div className="h-[3px] flag-line" aria-hidden />
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.3fr_1fr_1.4fr]">
        <div>
          <div className="flex items-center gap-3">
            <img src="/brand/logo-sm.webp" alt="" width={56} height={56} className="size-14" loading="lazy" />
            <div>
              <p className="text-lg font-black text-white">أسرة طلاب <FlagName /></p>
              <p className="text-sm font-semibold text-gold-300">جامعة دمياط</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-ink-400">
            المنصة الرسمية للأسرة: أنشطة وفعاليات، صفحات الكليات، الجداول والمحاضرات، والتسجيل في عضوية الأسرة.
          </p>
        </div>

        <nav aria-label="روابط سريعة">
          <p className="mb-3 font-extrabold text-white">روابط سريعة</p>
          <ul className="grid gap-2 text-[15px]">
            {NAV.map((item) => (
              <li key={item.to}><Link to={item.to} className="hover:text-white">{item.label}</Link></li>
            ))}
            <li><Link to="/status" className="hover:text-white">متابعة طلب الانضمام</Link></li>
            <li><Link to="/login" className="hover:text-white">دخول المسؤولين</Link></li>
          </ul>
        </nav>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-4">
            <img src="/brand/fcai.webp" alt="شعار كلية الحاسبات والذكاء الاصطناعي" width={72} height={72} className="size-18 shrink-0" loading="lazy" />
            <div className="text-sm leading-7">
              <p className="text-ink-400">تم تنفيذ هذا التطبيق بواسطة</p>
              <p className="text-base font-black text-white">كلية الحاسبات والذكاء الاصطناعي</p>
              <p>
                عميد الكلية <span className="font-bold text-gold-300">أ.د. وائل عبد القادر عوض</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-4 text-center text-xs text-ink-500">
          © {new Date().getFullYear()} أسرة طلاب <FlagName /> — جامعة دمياط. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold">
        انتقل إلى المحتوى
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-ink-900 text-white">
      <div className="pointer-events-none absolute -top-24 start-1/2 size-96 -translate-x-1/2 rounded-full bg-brand-600/25 blur-3xl" aria-hidden />
      <div className="container-page relative py-10 sm:py-12">
        <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-ink-300">{withFlagName(subtitle)}</p>}
        {children}
      </div>
    </div>
  );
}
