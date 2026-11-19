import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Ticket } from 'lucide-react';
import { useState } from 'react';
import { api, type ApiError } from '../lib/api';
import { formatNumber, normalizeDigits } from '../lib/format';
import type { PostDetail } from '../lib/types';
import { Alert, Button, Input } from './ui';

interface Registration { fullName: string; position: number; waitlisted: boolean; capacity: number | null }

/**
 * Reserve a place at an event with the membership number and national ID (students have no accounts), and add the
 * event to the phone's calendar. An event with a capacity puts everyone past it on a waiting list, in order.
 */
export function EventRegistration({ post }: { post: PostDetail }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ membershipNumber: '', nationalId: '' });
  const full = !!post.capacity && (post.registered ?? 0) >= post.capacity;

  const register = useMutation({
    mutationFn: () => api<Registration>(`/api/posts/${post.id}/register`, {
      method: 'POST',
      body: { membershipNumber: normalizeDigits(form.membershipNumber).trim(), nationalId: normalizeDigits(form.nationalId).trim() },
    }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['post', String(post.id)] }),
  });

  return (
    <section className="mt-6 rounded-2xl border border-ink-200 p-5" aria-label="التسجيل في الفعالية">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Ticket className="size-5 text-brand-600" /> احجز مكانك</h2>
          <p className="text-sm font-semibold text-ink-600">
            {post.capacity
              ? `${formatNumber(post.registered ?? 0)} مسجّل من ${formatNumber(post.capacity)} مكان${full ? ' — اكتمل العدد، ومن يسجّل الآن يدخل قائمة الانتظار' : ''}`
              : `${formatNumber(post.registered ?? 0)} سجّلوا حتى الآن`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/posts/${post.id}/calendar.ics`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-300 bg-white px-4 text-sm font-extrabold hover:border-brand-400">
            <CalendarPlus className="size-4" /> أضفها لتقويمي
          </a>
          {!register.data && <Button onClick={() => setOpen((v) => !v)}>{open ? 'إغلاق' : full ? 'سجّل في قائمة الانتظار' : 'سجّل حضوري'}</Button>}
        </div>
      </div>

      {open && !register.data && (
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); register.mutate(); }}>
          <p className="text-sm text-ink-600 sm:col-span-2">للأعضاء فقط. اكتب رقم العضوية الذي على الكارنيه والرقم القومي للتأكد أنك أنت.</p>
          {register.error && <div className="sm:col-span-2"><Alert>{(register.error as ApiError).message}</Alert></div>}
          <Input label="رقم العضوية" dir="ltr" required value={form.membershipNumber} onChange={(e) => setForm((f) => ({ ...f, membershipNumber: e.target.value }))} placeholder="DU-2026-00001" />
          <Input label="الرقم القومي" dir="ltr" required inputMode="numeric" maxLength={14} value={form.nationalId} onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))} />
          <div className="sm:col-span-2"><Button type="submit" loading={register.isPending} disabled={!form.membershipNumber.trim() || normalizeDigits(form.nationalId).length !== 14}>تأكيد التسجيل</Button></div>
        </form>
      )}

      {register.data && (
        <div className="mt-4"><Alert tone={register.data.waitlisted ? 'warning' : 'success'}>
          {register.data.waitlisted
            ? `تم تسجيلك يا ${register.data.fullName} في قائمة الانتظار، ترتيبك ${formatNumber(register.data.position - (register.data.capacity ?? 0))}. سنقبلك لو خلا مكان، ويمكنك الحضور وتسجيل حضورك عند الباب.`
            : `تم حجز مكانك يا ${register.data.fullName}. لا تنسَ الكارنيه لتسجيل حضورك عند الباب.`}
        </Alert></div>
      )}
    </section>
  );
}
