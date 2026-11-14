import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Lightbulb, MessageSquareWarning, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { StudentFields, useStudentInfo } from '../components/StudentFields';
import { Alert, Badge, Button, Card, Input, Select, Textarea, cx } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, FEEDBACK_TOPIC_LABELS, formatDate, normalizeDigits } from '../lib/format';
import type { FeedbackKind, FeedbackTopic, MyFeedback } from '../lib/types';

const KINDS: Array<{ value: FeedbackKind; icon: typeof Lightbulb; title: string; text: string }> = [
  { value: 'Suggestion', icon: Lightbulb, title: 'اقتراح', text: 'فكرة لنشاط، فعالية، أو تحسين في الدراسة.' },
  { value: 'Complaint', icon: MessageSquareWarning, title: 'شكوى', text: 'مشكلة واجهتك وتريد أن تصل للمسؤولين.' },
];

function SendForm({ kind, onKind }: { kind: FeedbackKind; onKind: (kind: FeedbackKind) => void }) {
  const student = useStudentInfo();
  const [topic, setTopic] = useState<FeedbackTopic>('Activities');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const errors = {
    subject: subject.trim().length < 3 ? 'اكتب عنواناً قصيراً.' : '',
    message: message.trim().length < 10 ? 'اكتب التفاصيل (10 أحرف على الأقل).' : '',
  };
  const valid = student.valid && !errors.subject && !errors.message;

  const send = useMutation({
    mutationFn: () => api('/api/feedback', { method: 'POST', body: { ...student.payload, kind, topic, subject: subject.trim(), message: message.trim() } }),
    onSuccess: () => {
      setSubject('');
      setMessage('');
      setTouched(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (valid) send.mutate();
  };

  if (send.isSuccess) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h2 className="mt-3 text-2xl font-black">وصلت {kind === 'Complaint' ? 'شكواك' : 'رسالتك'}، شكراً لك</h2>
        <p className="mt-2 text-ink-600">تصل للمسؤولين في كليتك ولإدارة الأسرة. تابع الرد من «متابعة رسائلي» برقمك القومي.</p>
        <Button variant="outline" className="mt-5" onClick={() => send.reset()}>إرسال رسالة أخرى</Button>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="نوع الرسالة">
        {KINDS.map(({ value, icon: Icon, title, text }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => onKind(value)}
            className={cx('flex items-start gap-3 rounded-2xl border-2 p-4 text-start transition', kind === value ? 'border-brand-600 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-400')}
          >
            <Icon className={cx('mt-0.5 size-6 shrink-0', kind === value ? 'text-brand-600' : 'text-ink-400')} />
            <span>
              <span className="block text-lg font-extrabold">{title}</span>
              <span className="text-sm text-ink-600">{text}</span>
            </span>
          </button>
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-extrabold">بياناتك</h2>
        <StudentFields state={student} touched={touched} askPhone />
      </Card>

      <Card className="grid gap-4 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">{kind === 'Complaint' ? 'الشكوى' : 'الاقتراح'}</h2>
        <Select label="بخصوص" value={topic} onChange={(e) => setTopic(e.target.value as FeedbackTopic)}>
          {(Object.keys(FEEDBACK_TOPIC_LABELS) as FeedbackTopic[]).map((t) => <option key={t} value={t}>{FEEDBACK_TOPIC_LABELS[t]}</option>)}
        </Select>
        <Input label="العنوان" required maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} error={touched ? errors.subject : ''}
          placeholder={kind === 'Complaint' ? 'مثال: تأخر نزول جدول الامتحانات' : 'مثال: رحلة علمية لمكتبة الإسكندرية'} />
        <Textarea label="التفاصيل" required rows={6} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} error={touched ? errors.message : ''} />
        {send.error && <Alert>{(send.error as ApiError).message}</Alert>}
        {touched && !valid && <Alert>بعض الحقول تحتاج مراجعة.</Alert>}
        <Button type="submit" variant="gold" size="lg" loading={send.isPending} className="w-full sm:w-auto">إرسال</Button>
      </Card>
    </form>
  );
}

function MyMessages() {
  const [nationalId, setNationalId] = useState('');
  const lookup = useMutation({
    mutationFn: (id: string) => api<MyFeedback[]>('/api/feedback/mine', { method: 'POST', body: { nationalId: id } }),
  });
  const valid = /^[23]\d{13}$/.test(nationalId);

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">متابعة رسائلي</h2>
      <p className="mt-1 text-sm text-ink-600">اكتب رقمك القومي لعرض اقتراحاتك وشكاواك والرد عليها.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (valid) lookup.mutate(nationalId); }} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <Input label="الرقم القومي" dir="ltr" inputMode="numeric" autoComplete="off" value={nationalId}
            onChange={(e) => setNationalId(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 14))} />
        </div>
        <Button type="submit" variant="outline" disabled={!valid} loading={lookup.isPending}><Search className="size-4" /> عرض</Button>
      </form>
      {lookup.error && <div className="mt-3"><Alert>{(lookup.error as ApiError).message}</Alert></div>}
      {lookup.data && (
        lookup.data.length === 0 ? <p className="mt-4 text-ink-600">لا توجد رسائل بهذا الرقم القومي.</p> : (
          <div className="mt-4 grid gap-3">
            {lookup.data.map((item) => (
              <div key={item.id} className="rounded-2xl border border-ink-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.kind === 'Complaint' ? 'brand' : 'gold'}>{FEEDBACK_KIND_LABELS[item.kind]}</Badge>
                  <Badge>{FEEDBACK_TOPIC_LABELS[item.topic]}</Badge>
                  <Badge tone={item.status === 'Resolved' ? 'green' : item.status === 'InReview' ? 'amber' : 'neutral'}>{FEEDBACK_STATUS_LABELS[item.status]}</Badge>
                  <span className="ms-auto text-xs font-semibold text-ink-400">{formatDate(item.createdAt)}</span>
                </div>
                <p className="mt-2 font-extrabold">{item.subject}</p>
                <p className="mt-1 whitespace-pre-line text-ink-600">{item.message}</p>
                {item.reply && (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs font-extrabold text-emerald-700">الرد — {formatDate(item.repliedAt)}</p>
                    <p className="mt-1 whitespace-pre-line text-emerald-900">{item.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </Card>
  );
}

/** Students' suggestions and complaints. No account is needed: the national ID identifies the student. */
export default function Feedback() {
  const [search, setSearch] = useSearchParams();
  const kind: FeedbackKind = search.get('kind') === 'complaint' ? 'Complaint' : 'Suggestion';
  return (
    <>
      <PageHeader title="اقتراحات وشكاوى" subtitle="صوتك مسموع: شاركنا اقتراحاتك عن الأنشطة والعملية التعليمية، أو أرسل شكواك وتابع الرد عليها." />
      <div className="container-page grid max-w-3xl gap-6 py-8">
        <SendForm kind={kind} onKind={(value) => setSearch(value === 'Complaint' ? { kind: 'complaint' } : {}, { replace: true })} />
        <MyMessages />
      </div>
    </>
  );
}
