import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Check, MailCheck, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input, LinkButton, useToast } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatNumber, normalizeDigits } from '../lib/format';
import type { AttendanceState, PostDetail, User } from '../lib/types';

const strong = (password: string) => password.length >= 8 && /\p{L}/u.test(password) && /\d/.test(password);
const onlyDigits = (value: string) => normalizeDigits(value).replace(/\D/g, '').slice(0, 6);

// ---------- forgotten password ----------

export function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const request = useMutation({
    mutationFn: () => api('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim() } }),
    onSuccess: () => setSent(true),
  });
  const reset = useMutation({
    mutationFn: () => api('/api/auth/reset-password', { method: 'POST', body: { email: email.trim(), code, newPassword: password } }),
    onSuccess: () => {
      toast('تم تغيير كلمة المرور. سجّل الدخول بها الآن.');
      navigate('/login', { replace: true });
    },
  });
  const weak = password.length > 0 && !strong(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-ink-900 px-4 py-10">
      <div className="pointer-events-none absolute -top-32 start-1/4 size-[28rem] rounded-full bg-brand-600/30 blur-[110px]" aria-hidden />
      <div className="relative w-full max-w-md animate-rise rounded-3xl bg-white p-7 shadow-lift sm:p-9">
        <img src="/brand/logo-sm.webp" alt="" width={72} height={72} className="mx-auto size-18" />
        <h1 className="mt-4 text-center text-2xl font-black">استعادة كلمة المرور</h1>

        {!sent ? (
          <form className="mt-6 grid gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); request.mutate(); }}>
            <p className="text-center text-ink-500">اكتب بريدك الإلكتروني وسنرسل لك رمزاً من 6 أرقام.</p>
            {request.error && <Alert>{(request.error as ApiError).message}</Alert>}
            <Input label="البريد الإلكتروني" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" size="lg" loading={request.isPending} disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}>إرسال الرمز</Button>
          </form>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!weak && !mismatch) reset.mutate(); }}>
            <Alert tone="info">إذا كان هذا البريد مسجلاً لدينا فقد أرسلنا إليه رمزاً صالحاً لمدة 15 دقيقة. تفقّد البريد الوارد والرسائل غير المرغوبة.</Alert>
            {reset.error && <Alert>{(reset.error as ApiError).message}</Alert>}
            <Input label="الرمز" dir="ltr" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(onlyDigits(e.target.value))} className="text-center text-xl font-black tracking-[0.4em]" />
            <Input label="كلمة المرور الجديدة" type="password" dir="ltr" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={weak ? '8 أحرف على الأقل، وتحتوي على حروف وأرقام.' : ''} />
            <Input label="تأكيد كلمة المرور" type="password" dir="ltr" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? 'كلمتا المرور غير متطابقتين.' : ''} />
            <Button type="submit" size="lg" loading={reset.isPending} disabled={code.length !== 6 || !password || !confirm}>تغيير كلمة المرور</Button>
            <button type="button" className="text-sm font-bold text-brand-700 hover:underline" onClick={() => { setSent(false); setCode(''); reset.reset(); }}>
              لم يصلك الرمز؟ جرّب بريداً آخر أو أعد الإرسال
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-ink-200 pt-5 text-center text-[15px]">
          <Link to="/login" className="font-extrabold text-brand-700 hover:underline">العودة لتسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}

// ---------- email confirmation ----------

export function VerifyEmailPanel({ user }: { user: User }) {
  const { reload } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const verify = useMutation({
    mutationFn: () => api<User>('/api/auth/verify-email', { method: 'POST', body: { code } }),
    onSuccess: async () => { await reload(); toast('تم تأكيد بريدك الإلكتروني.'); },
  });
  const resend = useMutation({
    mutationFn: () => api('/api/auth/resend-verification', { method: 'POST' }),
    onSuccess: () => toast('أرسلنا رمزاً جديداً إلى بريدك.'),
    onError: (error) => toast((error as ApiError).message, 'error'),
  });
  if (user.emailConfirmed) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/60 p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold"><MailCheck className="size-5 text-amber-700" /> تأكيد البريد الإلكتروني</h2>
      <p className="mt-1 text-ink-700">
        أرسلنا رمزاً من 6 أرقام إلى <span dir="ltr" className="font-bold">{user.email}</span>.
        {user.emailVerificationRequired ? ' تأكيد البريد مطلوب قبل إرسال طلب الانضمام.' : ' تأكيده يتيح لك استعادة كلمة المرور إذا نسيتها.'}
      </p>
      <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); verify.mutate(); }}>
        <div className="w-44">
          <Input label="الرمز" dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(onlyDigits(e.target.value))} className="text-center text-lg font-black tracking-[0.3em]" />
        </div>
        <Button type="submit" loading={verify.isPending} disabled={code.length !== 6}>تأكيد</Button>
        <Button variant="ghost" loading={resend.isPending} onClick={() => resend.mutate()}>إعادة إرسال الرمز</Button>
      </form>
      {verify.error && <div className="mt-3"><Alert>{(verify.error as ApiError).message}</Alert></div>}
    </Card>
  );
}

// ---------- "I will attend" ----------

export function AttendBox({ post }: { post: PostDetail }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const ended = new Date(post.eventEndsAt ?? post.eventStartsAt ?? 0) < new Date();
  const toggle = useMutation({
    mutationFn: () => api<AttendanceState>(`/api/posts/${post.id}/attend`, { method: post.isAttending ? 'DELETE' : 'POST' }),
    onSuccess: (state) => {
      queryClient.setQueryData<PostDetail>(['post', String(post.id)], (current) => (current ? { ...current, ...state } : current));
      toast(state.isAttending ? 'سجّلنا حضورك. نراك هناك!' : 'تم إلغاء تسجيل الحضور.');
    },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4">
      <p className="flex items-center gap-2 font-bold text-ink-700">
        <Users className="size-5 text-brand-600" />
        {post.attendeesCount > 0 ? `${formatNumber(post.attendeesCount)} سجّلوا حضورهم` : 'كن أول من يسجّل حضوره'}
      </p>
      {post.checkedIn ? (
        <Badge tone="green"><Check className="size-3.5" /> تم تسجيل حضورك في الفعالية</Badge>
      ) : ended ? null : !user ? (
        <LinkButton to={`/login?next=${encodeURIComponent(`/activities/${post.id}`)}`} variant="primary" size="sm">سجّل الدخول لتأكيد حضورك</LinkButton>
      ) : (
        <Button variant={post.isAttending ? 'outline' : 'gold'} size="sm" loading={toggle.isPending} onClick={() => toggle.mutate()}>
          <CalendarCheck className="size-4" /> {post.isAttending ? 'مسجَّل — إلغاء الحضور' : 'سأحضر'}
        </Button>
      )}
    </div>
  );
}
