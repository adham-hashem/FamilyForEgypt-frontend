import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Input, useToast } from '../components/ui';
import { api, type ApiError } from '../lib/api';

const strong = (password: string) => password.length >= 8 && /\p{L}/u.test(password) && /\d/.test(password);

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-ink-900 px-4 py-10">
      <div className="pointer-events-none absolute -top-32 start-1/4 size-[28rem] rounded-full bg-brand-600/30 blur-[110px]" aria-hidden />
      <div className="relative w-full max-w-md animate-rise rounded-3xl bg-white p-7 shadow-lift sm:p-9">
        <img src="/brand/logo-sm.webp" alt="" width={72} height={72} className="mx-auto size-18" />
        <h1 className="mt-4 text-center text-2xl font-black">{title}</h1>
        <p className="mt-1 text-center text-ink-500">{subtitle}</p>
        {children}
        <div className="mt-6 border-t border-ink-200 pt-5 text-center text-[15px]">
          <Link to="/login" className="font-extrabold text-brand-700 hover:underline">العودة لتسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}

// ---------- asking for a link ----------

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const send = useMutation({
    mutationFn: () => api('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim() } }),
  });
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  if (send.isSuccess) {
    return (
      <Shell title="راجع بريدك الإلكتروني" subtitle="">
        <div className="mt-4 grid justify-items-center gap-3 text-center">
          <MailCheck className="size-12 text-emerald-600" />
          <p className="text-ink-700">
            إن كان <span dir="ltr" className="font-bold">{email.trim()}</span> مسجلاً لدينا فستصلك رسالة فيها رابط لاختيار كلمة مرور جديدة خلال دقائق.
          </p>
          <p className="text-sm text-ink-500">لم تصل؟ راجع مجلد الرسائل غير المرغوب فيها (Spam)، أو تواصل مع مسؤول الأسرة بكليتك.</p>
          <Button variant="outline" size="sm" onClick={() => send.reset()}>إرسال مرة أخرى</Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="نسيت كلمة المرور" subtitle="اكتب بريدك الإلكتروني وسنرسل لك رابطاً لاختيار كلمة مرور جديدة.">
      <form className="mt-6 grid gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); if (valid) send.mutate(); }}>
        {send.error && <Alert>{(send.error as ApiError).message}</Alert>}
        <Input label="البريد الإلكتروني" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" size="lg" loading={send.isPending} disabled={!valid}>إرسال الرابط</Button>
      </form>
    </Shell>
  );
}

// ---------- the emailed link ----------

export function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const reset = useMutation({
    mutationFn: () => api('/api/auth/reset-password', { method: 'POST', body: { email, token, newPassword: password } }),
    onSuccess: () => {
      toast('تم حفظ كلمة المرور. سجّل الدخول بها الآن.');
      navigate('/login', { replace: true });
    },
  });
  const weak = password.length > 0 && !strong(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = strong(password) && confirm === password;

  if (!email || !token) {
    return (
      <Shell title="الرابط غير مكتمل" subtitle="افتح الرابط كما وصلك في البريد، أو اطلب رابطاً جديداً.">
        <div className="mt-6 text-center"><Link to="/forgot-password"><Button>طلب رابط جديد</Button></Link></div>
      </Shell>
    );
  }

  return (
    <Shell title="اختيار كلمة المرور" subtitle="اختر كلمة مرور جديدة لحسابك.">
      <form className="mt-6 grid gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); if (ready) reset.mutate(); }}>
        {reset.error && (
          <Alert>
            {(reset.error as ApiError).message}{' '}
            <Link to="/forgot-password" className="font-bold underline">طلب رابط جديد</Link>
          </Alert>
        )}
        <Input label="البريد الإلكتروني" type="email" dir="ltr" value={email} readOnly disabled />
        <Input label="كلمة المرور الجديدة" type="password" dir="ltr" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={weak ? '8 أحرف على الأقل، وتحتوي على حروف وأرقام.' : ''} />
        <Input label="تأكيد كلمة المرور" type="password" dir="ltr" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? 'كلمتا المرور غير متطابقتين.' : ''} />
        <Button type="submit" size="lg" loading={reset.isPending} disabled={!ready}>حفظ كلمة المرور</Button>
      </form>
    </Shell>
  );
}
