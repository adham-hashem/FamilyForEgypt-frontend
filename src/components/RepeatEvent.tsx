import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Repeat, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api, type ApiError } from '../lib/api';
import { TERMS, currentAcademicYear, currentTerm, formatDateTime, fromLocalInput, periodLabel, toLocalInput } from '../lib/format';
import type { PostDetail, SeriesOccurrence } from '../lib/types';
import { Alert, Badge, Button, Checkbox, Input, Modal, Select, useToast } from './ui';

type Step = 'weekly' | 'biweekly' | 'monthly' | 'custom';
type Until = 'term' | 'year' | 'count';

const STEP_LABELS: Record<Step, string> = { weekly: 'كل أسبوع', biweekly: 'كل أسبوعين', monthly: 'كل شهر', custom: 'مواعيد أختارها بنفسي' };

/** The local date-time as the value of a datetime-local input. */
const inputValue = (date: Date) => toLocalInput(date.toISOString());

/** Where the term (or the whole academic year) of this date ends: the first moment after it. */
function periodEnd(date: Date, until: Until) {
  const year = currentAcademicYear(date);
  if (until === 'year') return new Date(year + 1, 8, 1);
  const term = currentTerm(date);
  return term === 1 ? new Date(year + 1, 1, 1) : term === 2 ? new Date(year + 1, 6, 1) : new Date(year + 1, 8, 1);
}

/** The next date after this one, keeping the time of day (a monthly step stays on the same day of the month where it can). */
function advance(date: Date, step: Step, from: Date, index: number) {
  if (step === 'monthly') {
    const next = new Date(from);
    next.setDate(1);
    next.setMonth(from.getMonth() + index);
    next.setDate(Math.min(from.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
    return next;
  }
  const next = new Date(date);
  next.setDate(next.getDate() + (step === 'weekly' ? 7 : 14));
  return next;
}

/**
 * Repeats an event on more dates. Every date becomes its own event, with its own attendance and badges,
 * and each one shows the academic year and term it falls in. All of them are linked as one series.
 */
export function RepeatEvent({ post }: { post: PostDetail }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('weekly');
  const [until, setUntil] = useState<Until>('term');
  const [count, setCount] = useState('4');
  const [manual, setManual] = useState<string[]>([]);
  const [picked, setPicked] = useState('');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [publish, setPublish] = useState(false);

  const start = useMemo(() => new Date(post.eventStartsAt!), [post.eventStartsAt]);
  const length = post.eventEndsAt ? new Date(post.eventEndsAt).getTime() - start.getTime() : null;

  const dates = useMemo(() => {
    if (step === 'custom') return manual.map((value) => new Date(value)).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
    const list: Date[] = [];
    const limit = until === 'count' ? Math.min(Math.max(Number(count) || 0, 0), 30) : 30;
    const end = until === 'count' ? null : periodEnd(start, until);
    let current = start;
    for (let i = 1; list.length < limit && i <= 60; i++) {
      current = advance(current, step, start, i);
      if (end && current >= end) break;
      list.push(current);
    }
    return list;
  }, [step, until, count, manual, start]);

  const chosen = dates.filter((d) => !skipped.has(d.toISOString()));

  const save = useMutation({
    mutationFn: () => api<SeriesOccurrence[]>(`/api/admin/posts/${post.id}/repeat`, {
      method: 'POST',
      body: {
        publish,
        dates: chosen.map((d) => ({
          startsAt: fromLocalInput(inputValue(d)),
          endsAt: length === null ? null : fromLocalInput(inputValue(new Date(d.getTime() + length))),
        })),
      },
    }),
    onSuccess: (series) => {
      toast(`تم تكرار الفعالية: ${chosen.length} موعد ${publish ? 'منشور' : 'كمسودات'}.`);
      void queryClient.invalidateQueries();
      setOpen(false);
      setSkipped(new Set());
      setManual([]);
      void series;
    },
  });

  if (!post.eventStartsAt) return null;

  return (
    <>
      <Button variant="outline" onClick={() => { save.reset(); setOpen(true); }}><Repeat className="size-4" /> تكرار الفعالية</Button>
      <Modal open={open} title="تكرار الفعالية على مواعيد أخرى" onClose={() => setOpen(false)} wide>
        <div className="grid gap-4">
          <p className="text-ink-600">
            كل موعد يتحول إلى فعالية مستقلة بحضورها وكارنيهاتها، وتظهر كلها كسلسلة واحدة. تنسخ العنوان والتفاصيل والمكان، أما الصور فتبقى مع الفعالية الأصلية.
          </p>
          {save.error && <Alert>{(save.error as ApiError).message}</Alert>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="التكرار" value={step} onChange={(e) => { setStep(e.target.value as Step); setSkipped(new Set()); }}>
              {(Object.keys(STEP_LABELS) as Step[]).map((s) => <option key={s} value={s}>{STEP_LABELS[s]}</option>)}
            </Select>
            {step !== 'custom' && (
              <Select label="حتى" value={until} onChange={(e) => { setUntil(e.target.value as Until); setSkipped(new Set()); }}>
                <option value="term">نهاية الفصل الدراسي ({TERMS[currentTerm(start)]})</option>
                <option value="year">نهاية العام الجامعي</option>
                <option value="count">عدد مرات محدد</option>
              </Select>
            )}
            {step !== 'custom' && until === 'count' && (
              <Input label="عدد المرات الإضافية" type="number" min={1} max={30} value={count} onChange={(e) => { setCount(e.target.value); setSkipped(new Set()); }} />
            )}
          </div>

          {step === 'custom' && (
            <div className="flex items-end gap-2">
              <div className="flex-1"><Input label="أضف موعداً" type="datetime-local" value={picked} onChange={(e) => setPicked(e.target.value)} hint="بتوقيت القاهرة، ويمكن إضافة حتى 30 موعداً" /></div>
              <Button variant="outline" disabled={!picked || manual.includes(picked) || manual.length >= 30} onClick={() => { setManual((m) => [...m, picked]); setPicked(''); }}>إضافة</Button>
            </div>
          )}

          <div>
            <p className="mb-2 font-extrabold">المواعيد الجديدة ({chosen.length})</p>
            {chosen.length === 0 ? (
              <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-600">{step === 'custom' ? 'أضف موعداً واحداً على الأقل.' : 'لا توجد مواعيد بعد موعد الفعالية داخل هذه الفترة. اختر «نهاية العام الجامعي» أو عدداً محدداً.'}</p>
            ) : (
              <ul className="grid max-h-72 gap-1.5 overflow-y-auto">
                {chosen.map((d) => (
                  <li key={d.toISOString()} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 px-3 py-2">
                    <span className="flex-1 font-bold">{formatDateTime(d.toISOString())}</span>
                    <Badge tone="neutral">{TERMS[currentTerm(d)]}</Badge>
                    <Badge tone="gold">{periodLabel(currentAcademicYear(d))}</Badge>
                    <button type="button" aria-label="إزالة هذا الموعد" className="rounded p-1 text-ink-400 hover:text-brand-600"
                      onClick={() => step === 'custom' ? setManual((m) => m.filter((v) => new Date(v).toISOString() !== d.toISOString())) : setSkipped((s) => new Set(s).add(d.toISOString()))}>
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Checkbox checked={publish} onChange={(e) => setPublish(e.target.checked)} label="انشرها الآن (كل موعد يُعلن ويُشارك على فيسبوك). الأفضل تركها مسودات ونشرها قبل كل موعد." />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={chosen.length === 0}>تكرار على {chosen.length} موعد</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
