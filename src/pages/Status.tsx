import { useMutation } from '@tanstack/react-query';
import { BadgeCheck, Clock, Search, TriangleAlert, XCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { StudentCardPanel } from '../components/StudentCard';
import { Alert, Button, Card, Input, LinkButton } from '../components/ui';
import { api, mediaUrl, type ApiError } from '../lib/api';
import { STATUS_LABELS, formatDate, levelLabel, normalizeDigits } from '../lib/format';
import type { ApplicationStatusView } from '../lib/types';

function Row({ label, value, ltr }: { label: string; value: string | null | undefined; ltr?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-ink-100 py-2.5 last:border-0">
      <dt className="text-sm font-bold text-ink-500">{label}</dt>
      <dd className="font-bold" dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  );
}

function Result({ data }: { data: ApplicationStatusView }) {
  const navigate = useNavigate();
  const meta = {
    Pending: { icon: Clock, tone: 'info' as const, text: 'طلبك قيد المراجعة من مسؤولي الأسرة في كليتك. ارجع هنا لمعرفة النتيجة.' },
    Approved: { icon: BadgeCheck, tone: 'success' as const, text: 'مبروك! أنت عضو في الأسرة. كارنيه العضوية تحت، وتقدر تطبعه.' },
    NeedsChanges: { icon: TriangleAlert, tone: 'warning' as const, text: 'مطلوب تعديل بعض البيانات ثم إعادة الإرسال.' },
    Rejected: { icon: XCircle, tone: 'error' as const, text: 'لم يتم قبول الطلب. تقدر تعدّل البيانات وتقدّم من جديد.' },
  }[data.status];
  const Icon = meta.icon;

  return (
    <div className="grid gap-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-black"><Icon className="size-6" /> {data.fullName}</h2>
          <span className="text-sm font-semibold text-ink-500">آخر تحديث: {formatDate(data.updatedAt)}</span>
        </div>
        <div className="mt-4">
          <Alert tone={meta.tone}>
            <p>{STATUS_LABELS[data.status]} — {meta.text}</p>
            {data.reviewNote && <p className="mt-1 font-normal">ملاحظة المراجع: {data.reviewNote}</p>}
          </Alert>
        </div>
        <dl className="mt-4">
          <Row label="الكلية" value={data.collegeName} />
          <Row label="القسم / الشعبة" value={data.department} />
          <Row label="المستوى" value={levelLabel(data.level)} />
          <Row label="الرقم الجامعي" value={data.studentCode} ltr />
          <Row label="رقم العضوية" value={data.membershipNumber} ltr />
          <Row label="تاريخ التقديم" value={formatDate(data.createdAt)} />
        </dl>
        {(data.status === 'NeedsChanges' || data.status === 'Rejected') && (
          <Button className="mt-5" onClick={() => navigate('/join', { state: { resubmit: data } })}>تعديل البيانات وإعادة الإرسال</Button>
        )}
        <p className="mt-4 text-xs text-ink-500">بيانات التواصل والعنوان لا تظهر هنا لحمايتك. لتعديلها تواصل مع مسؤولي الأسرة في كليتك.</p>
      </Card>

      {data.status === 'Approved' && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold"><BadgeCheck className="size-5 text-emerald-600" /> كارنيه العضوية</h2>
          <p className="mb-5 text-sm text-ink-600">الكود اللي على ظهر الكارنيه بيتمسح على باب الفعاليات لتسجيل حضورك. اطبعه أو صوّره.</p>
          <StudentCardPanel
            student={data}
            photoSrc={data.photoToken ? mediaUrl(`/api/membership/status/photo?token=${encodeURIComponent(data.photoToken)}`) : null}
            code={data.memberCode}
          />
        </Card>
      )}
    </div>
  );
}

/**
 * Students have no accounts: they follow their application, and get their membership card, with their
 * national ID. It is sent in the request body and kept only in this page's memory.
 */
export default function Status() {
  const [nationalId, setNationalId] = useState('');
  const lookup = useMutation({
    mutationFn: (id: string) => api<ApplicationStatusView>('/api/membership/status', { method: 'POST', body: { nationalId: id } }),
  });
  const valid = /^[23]\d{13}$/.test(nationalId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) lookup.mutate(nationalId);
  };

  return (
    <>
      <PageHeader title="متابعة طلب الانضمام" subtitle="اكتب رقمك القومي لمعرفة حالة طلبك وعرض كارنيه العضوية. لا تحتاج حساباً." />
      <div className="container-page grid max-w-3xl gap-5 py-8">
        <Card className="p-6">
          <form onSubmit={submit} className="flex flex-wrap items-end gap-3" noValidate>
            <div className="min-w-0 flex-1 basis-60">
              <Input
                label="الرقم القومي"
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                value={nationalId}
                onChange={(e) => setNationalId(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 14))}
                hint="14 رقماً كما في البطاقة."
              />
            </div>
            <Button type="submit" disabled={!valid} loading={lookup.isPending} className="mb-6"><Search className="size-5" /> عرض</Button>
          </form>
          {lookup.error && (
            <Alert>
              {(lookup.error as ApiError).message}
              {(lookup.error as ApiError).status === 404 && <> <LinkButton to="/join" variant="ghost" size="sm" className="!px-1 underline">قدّم طلب انضمام</LinkButton></>}
            </Alert>
          )}
        </Card>
        {lookup.data && <Result data={lookup.data} />}
      </div>
    </>
  );
}
