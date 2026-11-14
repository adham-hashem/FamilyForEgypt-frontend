import { useMutation } from '@tanstack/react-query';
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { Alert, Button, Card, Input, LinkButton, PageLoader, useToast } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ROLE_LABELS } from '../lib/format';
import type { AuthResponse, User, UserRole } from '../lib/types';
import { RecoveryWordsCard } from './Recovery';

/** Only same-site paths are honoured, so a crafted link cannot bounce the user to another site. */
function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-ink-900 px-4 py-10">
      <div className="pointer-events-none absolute -top-32 start-1/4 size-[28rem] rounded-full bg-brand-600/30 blur-[110px]" aria-hidden />
      <div className="pointer-events-none absolute bottom-[-20%] end-1/4 size-[24rem] rounded-full bg-flame-500/20 blur-[110px]" aria-hidden />
      <div className="relative w-full max-w-md animate-rise rounded-3xl bg-white p-7 shadow-lift sm:p-9">
        <img src="/brand/logo-sm.webp" alt="" width={72} height={72} className="mx-auto size-18" />
        <h1 className="mt-4 text-center text-2xl font-black">{title}</h1>
        <p className="mt-1 text-center text-ink-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 border-t border-ink-200 pt-5 text-center text-[15px] text-ink-600">{footer}</div>
      </div>
    </div>
  );
}

export function Login() {
  const { user, login, loading } = useAuth();
  const [search] = useSearchParams();
  const next = safeNext(search.get('next'));
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: (signedIn) => navigate(signedIn.mustChangePassword ? '/account?change=1' : next, { replace: true }),
  });

  if (loading) return <PageLoader />;
  if (user && !mutation.isSuccess) return <Navigate to={next} replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <AuthShell
      title="دخول مسؤولي الأسرة"
      subtitle="الحسابات لمسؤولي الأسرة ورواد الكليات فقط."
      footer={<>طالب؟ مش محتاج حساب. <Link to="/join" className="font-extrabold text-brand-700 hover:underline">قدّم طلب انضمام</Link> أو <Link to="/status" className="font-extrabold text-brand-700 hover:underline">تابع طلبك برقمك القومي</Link>.</>}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {mutation.error && <Alert>{(mutation.error as ApiError).message}</Alert>}
        <Input label="البريد الإلكتروني" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        <Input label="كلمة المرور" type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Link to="/forgot-password" className="-mt-1 justify-self-start text-sm font-bold text-brand-700 hover:underline">نسيت كلمة المرور؟</Link>
        <Button type="submit" size="lg" loading={mutation.isPending} disabled={!email || !password}>دخول</Button>
      </form>
    </AuthShell>
  );
}

/** Sends visitors to sign in, then brings them back to where they were going. */
export function RequireAuth({ children, minimum }: { children: ReactNode; minimum?: UserRole }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (user.mustChangePassword && location.pathname !== '/account') return <Navigate to="/account?change=1" replace />;
  if (minimum && !hasRole(minimum)) {
    return (
      <div className="container-page py-16">
        <Card className="mx-auto max-w-md p-8 text-center">
          <ShieldCheck className="mx-auto size-10 text-ink-400" />
          <h1 className="mt-3 text-xl font-extrabold">ليس لديك صلاحية لهذه الصفحة</h1>
          <p className="mt-1 text-ink-500">هذه الصفحة متاحة لمسؤولي الأسرة فقط.</p>
          <LinkButton to="/" className="mt-5">العودة للرئيسية</LinkButton>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}

function ChangePassword({ forced }: { forced: boolean }) {
  const { accept } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const mutation = useMutation({
    mutationFn: () => api<AuthResponse>('/api/auth/change-password', { method: 'POST', body: { currentPassword: form.currentPassword, newPassword: form.newPassword } }),
    onSuccess: (auth) => {
      accept(auth);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast('تم تغيير كلمة المرور.');
      if (forced) navigate(auth.user.role === 'Student' ? '/' : '/admin', { replace: true });
    },
  });
  const mismatch = form.confirm.length > 0 && form.confirm !== form.newPassword;
  const weak = form.newPassword.length > 0 && !(form.newPassword.length >= 8 && /\p{L}/u.test(form.newPassword) && /\d/.test(form.newPassword));

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold"><KeyRound className="size-5 text-brand-600" /> تغيير كلمة المرور</h2>
      <form
        className="mt-4 grid gap-4"
        onSubmit={(event) => { event.preventDefault(); if (!mismatch && !weak) mutation.mutate(); }}
      >
        {forced && <Alert tone="warning">أنت تستخدم كلمة مرور مؤقتة. اختر كلمة مرور جديدة للمتابعة.</Alert>}
        {mutation.error && <Alert>{(mutation.error as ApiError).message}</Alert>}
        <Input label={forced ? 'كلمة المرور المؤقتة' : 'كلمة المرور الحالية'} type="password" dir="ltr" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} />
        <Input label="كلمة المرور الجديدة" type="password" dir="ltr" autoComplete="new-password" required value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} error={weak ? '8 أحرف على الأقل، وتحتوي على حروف وأرقام.' : ''} />
        <Input label="تأكيد كلمة المرور الجديدة" type="password" dir="ltr" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} error={mismatch ? 'كلمتا المرور غير متطابقتين.' : ''} />
        <div><Button type="submit" loading={mutation.isPending} disabled={!form.currentPassword || !form.newPassword || !form.confirm}>حفظ كلمة المرور</Button></div>
      </form>
    </Card>
  );
}

function Profile({ user }: { user: User }) {
  const { reload } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const mutation = useMutation({
    mutationFn: () => api<User>('/api/auth/me', { method: 'PUT', body: { fullName: fullName.trim(), phone: phone.trim() || null } }),
    onSuccess: async () => { await reload(); toast('تم حفظ البيانات.'); },
  });
  const dirty = fullName.trim() !== user.fullName || phone.trim() !== (user.phone ?? '');

  return (
    <Card className="p-6">
      <h2 className="text-lg font-extrabold">بياناتي</h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        {mutation.error && <div className="sm:col-span-2"><Alert>{(mutation.error as ApiError).message}</Alert></div>}
        <Input label="الاسم بالكامل" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="رقم الموبايل" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="البريد الإلكتروني" dir="ltr" value={user.email} disabled hint="لا يمكن تغيير البريد الإلكتروني." />
        <Input label="نوع الحساب" value={ROLE_LABELS[user.role] + (user.collegeName ? ` — ${user.collegeName}` : '')} disabled />
        <div className="sm:col-span-2"><Button type="submit" loading={mutation.isPending} disabled={!dirty}>حفظ التعديلات</Button></div>
      </form>
    </Card>
  );
}

export function Account() {
  const { user, logout } = useAuth();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  if (!user) return null;
  const forced = user.mustChangePassword;

  return (
    <>
      <PageHeader title="حسابي" subtitle={`مرحباً، ${user.fullName}`} />
      <div className="container-page grid max-w-3xl gap-5 py-8">
        {forced || search.get('change') ? <ChangePassword forced={forced} /> : null}
        {!forced && (
          <>
            {!user.hasRecoveryWords && <RecoveryWordsCard user={user} />}
            {user.role !== 'Student' && (
              <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
                <div>
                  <h2 className="text-lg font-extrabold">لوحة التحكم</h2>
                  <p className="text-ink-600">{ROLE_LABELS[user.role]}{user.collegeName ? ` — ${user.collegeName}` : ''}</p>
                </div>
                <LinkButton to="/admin" variant="dark">فتح لوحة التحكم</LinkButton>
              </Card>
            )}
            <Profile user={user} />
            {!search.get('change') && <ChangePassword forced={false} />}
            {user.hasRecoveryWords && <RecoveryWordsCard user={user} />}
          </>
        )}
        <div>
          <Button variant="danger" onClick={() => void logout().then(() => navigate('/'))}><LogOut className="size-4" /> تسجيل الخروج</Button>
        </div>
      </div>
    </>
  );
}
