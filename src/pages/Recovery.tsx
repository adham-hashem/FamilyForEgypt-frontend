import { useMutation } from '@tanstack/react-query';
import { Copy, Download, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Checkbox, Input, Textarea, useToast } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { User } from '../lib/types';

export const WORD_COUNT = 8;

const strong = (password: string) => password.length >= 8 && /\p{L}/u.test(password) && /\d/.test(password);

/** The words as the person typed them: numbering, commas and line breaks do not count. */
export function splitWords(input: string) {
  return input.split(/[^\p{L}\p{M}ـ]+/u).filter(Boolean);
}

function asText(words: string[], email: string) {
  return [
    'أسرة طلاب من أجل مصر — جامعة دمياط',
    `كلمات استعادة كلمة المرور للحساب: ${email}`,
    '',
    ...words.map((word, i) => `${i + 1}. ${word}`),
    '',
    'احتفظ بهذه الكلمات في مكان آمن ولا تشاركها مع أحد.',
    'من يعرفها يستطيع تغيير كلمة مرور حسابك.',
  ].join('\r\n');
}

// ---------- the words, shown once ----------

/**
 * The only time the words are on screen. The way out stays closed until the person says they
 * have kept them, because nobody, the family's admins included, can show them again.
 */
export function WordsSheet({ words, email, doneLabel, onDone }: { words: string[]; email: string; doneLabel: string; onDone: () => void }) {
  const toast = useToast();
  const [kept, setKept] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(words.join(' '));
      toast('تم نسخ الكلمات.');
    } catch {
      toast('تعذر النسخ. اكتب الكلمات يدوياً.', 'error');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + asText(words, email)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'كلمات-الاستعادة.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <Alert tone="warning">
        هذه الكلمات الثماني هي طريقتك الوحيدة لاستعادة حسابك إذا نسيت كلمة المرور. اكتبها بالترتيب واحتفظ بها في مكان آمن — لن تظهر مرة أخرى.
      </Alert>
      <ol className="grid grid-cols-2 gap-2" aria-label="كلمات الاستعادة">
        {words.map((word, i) => (
          <li key={i} className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5">
            <span className="w-5 text-center text-sm font-bold text-ink-400">{i + 1}</span>
            <span className="text-lg font-extrabold">{word}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void copy()}><Copy className="size-4" /> نسخ</Button>
        <Button variant="outline" size="sm" onClick={download}><Download className="size-4" /> تنزيل كملف</Button>
      </div>
      <p className="text-sm text-ink-500">لا تشاركها مع أحد: من يعرفها يستطيع تغيير كلمة مرور حسابك.</p>
      <Checkbox label="كتبت الكلمات أو حفظتها في مكان آمن" checked={kept} onChange={(e) => setKept(e.target.checked)} />
      <Button size="lg" disabled={!kept} onClick={onDone}>{doneLabel}</Button>
    </div>
  );
}

// ---------- forgotten password ----------

export function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [words, setWords] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const reset = useMutation({
    mutationFn: () => api('/api/auth/reset-password', {
      method: 'POST', body: { email: email.trim(), words: splitWords(words).join(' '), newPassword: password },
    }),
    onSuccess: () => {
      toast('تم تغيير كلمة المرور. سجّل الدخول بها الآن.');
      navigate('/login', { replace: true });
    },
  });
  const typed = splitWords(words).length;
  const weak = password.length > 0 && !strong(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = /^\S+@\S+\.\S+$/.test(email.trim()) && typed === WORD_COUNT && strong(password) && confirm === password;

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-ink-900 px-4 py-10">
      <div className="pointer-events-none absolute -top-32 start-1/4 size-[28rem] rounded-full bg-brand-600/30 blur-[110px]" aria-hidden />
      <div className="relative w-full max-w-md animate-rise rounded-3xl bg-white p-7 shadow-lift sm:p-9">
        <img src="/brand/logo-sm.webp" alt="" width={72} height={72} className="mx-auto size-18" />
        <h1 className="mt-4 text-center text-2xl font-black">استعادة كلمة المرور</h1>
        <p className="mt-1 text-center text-ink-500">اكتب كلمات الاستعادة الثماني التي حصلت عليها عند إنشاء الحساب.</p>

        <form className="mt-6 grid gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); if (ready) reset.mutate(); }}>
          {reset.error && <Alert>{(reset.error as ApiError).message}</Alert>}
          <Input label="البريد الإلكتروني" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Textarea
            label="كلمات الاستعادة" required rows={3} autoComplete="off" autoCapitalize="off" spellCheck={false}
            value={words} onChange={(e) => setWords(e.target.value)}
            hint={`بالترتيب، وبين كل كلمة والتي بعدها مسافة — ${typed} من ${WORD_COUNT}`}
            error={typed > WORD_COUNT ? `المطلوب ${WORD_COUNT} كلمات فقط.` : ''}
          />
          <Input label="كلمة المرور الجديدة" type="password" dir="ltr" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={weak ? '8 أحرف على الأقل، وتحتوي على حروف وأرقام.' : ''} />
          <Input label="تأكيد كلمة المرور" type="password" dir="ltr" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? 'كلمتا المرور غير متطابقتين.' : ''} />
          <Button type="submit" size="lg" loading={reset.isPending} disabled={!ready}>تغيير كلمة المرور</Button>
          <p className="text-sm text-ink-500">فقدت الكلمات؟ تواصل مع مسؤول الأسرة بكليتك ليعيد تعيين كلمة المرور لك.</p>
        </form>

        <div className="mt-6 border-t border-ink-200 pt-5 text-center text-[15px]">
          <Link to="/login" className="font-extrabold text-brand-700 hover:underline">العودة لتسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}

// ---------- on the account page ----------

export function RecoveryWordsCard({ user }: { user: User }) {
  const { reload } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const create = useMutation({
    mutationFn: () => api<{ words: string[] }>('/api/auth/recovery-words', { method: 'POST', body: { currentPassword: password } }),
    onSuccess: () => { setPassword(''); void reload(); },
  });
  const close = () => { create.reset(); setOpen(false); };

  return (
    <Card className={user.hasRecoveryWords ? 'p-6' : 'border-amber-200 bg-amber-50/60 p-6'}>
      <h2 className="flex items-center gap-2 text-lg font-extrabold">
        {user.hasRecoveryWords ? <ShieldCheck className="size-5 text-emerald-600" /> : <ShieldAlert className="size-5 text-amber-700" />}
        كلمات استعادة كلمة المرور
      </h2>

      {create.data ? (
        <div className="mt-4">
          <WordsSheet words={create.data.words} email={user.email} doneLabel="تم" onDone={close} />
        </div>
      ) : (
        <>
          <p className="mt-1 text-ink-700">
            {user.hasRecoveryWords
              ? 'لحسابك ثماني كلمات تستعيد بها كلمة المرور إذا نسيتها. إذا فقدتها أو رآها غيرك فأنشئ كلمات جديدة، وستتوقف القديمة عن العمل.'
              : 'ليس لحسابك كلمات استعادة بعد. بدونها لن تستطيع استعادة حسابك بنفسك إذا نسيت كلمة المرور. أنشئها الآن واحتفظ بها.'}
          </p>
          {!open ? (
            <Button variant={user.hasRecoveryWords ? 'outline' : 'gold'} className="mt-4" onClick={() => setOpen(true)}>
              <KeyRound className="size-4" /> {user.hasRecoveryWords ? 'إنشاء كلمات جديدة' : 'إنشاء كلمات الاستعادة'}
            </Button>
          ) : (
            <form className="mt-4 grid gap-3 sm:max-w-sm" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
              {create.error && <Alert>{(create.error as ApiError).message}</Alert>}
              <Input label="كلمة المرور الحالية للتأكيد" type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="flex gap-2">
                <Button type="submit" loading={create.isPending} disabled={!password}>عرض الكلمات</Button>
                <Button variant="ghost" onClick={close}>إلغاء</Button>
              </div>
            </form>
          )}
        </>
      )}
    </Card>
  );
}
