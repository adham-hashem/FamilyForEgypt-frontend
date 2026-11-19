import { useMutation } from '@tanstack/react-query';
import { CalendarCheck, Search, Trophy } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageHeader } from '../components/Layout';
import { Alert, Badge, Button, Card, Input } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { formatDate, formatNumber, normalizeDigits } from '../lib/format';
import type { PointsResult } from '../lib/types';

const RANKS = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'];

function Result({ data }: { data: PointsResult }) {
  return (
    <div className="grid gap-5">
      <Card className="p-6">
        <p className="text-sm font-bold text-ink-500">{data.fullName}{data.collegeName ? ` — ${data.collegeName}` : ''}{data.membershipNumber ? ` — ${data.membershipNumber}` : ''}</p>
        <p className="mt-1 text-5xl font-black text-brand-700">{formatNumber(data.total)} <span className="text-xl text-ink-600">نقطة</span></p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="green">{formatNumber(data.attendancePoints)} من الحضور</Badge>
          <Badge tone="gold">{formatNumber(data.competitionPoints)} من المسابقات</Badge>
        </div>
        {!data.isMember && <p className="mt-3 text-sm text-ink-600">أنت لست عضواً في الأسرة بعد، فلا تُحتسب نقاط الحضور. انضم من صفحة «انضم للأسرة» لتبدأ في جمعها.</p>}
      </Card>

      {data.isMember && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><CalendarCheck className="size-5 text-emerald-600" /> الفعاليات التي حضرتها ({formatNumber(data.events.length)})</h2>
          {data.events.length === 0 ? <p className="text-ink-600">لم يُسجَّل حضورك في فعالية بعد. امسح كارنيهك عند باب الفعالية لتكسب النقاط.</p> : (
            <ul className="grid gap-2">
              {data.events.map((e, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 px-3 py-2">
                  <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{e.title}</span><span className="text-xs font-semibold text-ink-500">{formatDate(e.startsAt)}</span></span>
                  <Badge tone="green">+{formatNumber(e.points)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Trophy className="size-5 text-gold-500" /> المسابقات التي شاركت فيها ({formatNumber(data.competitions.length)})</h2>
        {data.competitions.length === 0 ? <p className="text-ink-600">لم تشارك في مسابقة بعد.</p> : (
          <ul className="grid gap-2">
            {data.competitions.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{c.title}</span>
                  <span className="text-xs font-semibold text-ink-500">
                    {formatDate(c.enteredAt)} · {!c.resultsPublished ? 'النتيجة لم تُعلن بعد' : c.isWinner ? `فائز${c.rank ? ` بالمركز ${RANKS[c.rank] ?? c.rank}` : ''}` : c.score !== null ? `درجتك ${formatNumber(c.score!)}` : c.isCorrect === true ? 'إجابة صحيحة' : c.isCorrect === false ? 'إجابة خاطئة' : 'تم التقييم'}
                  </span>
                </span>
                <Badge tone="gold">+{formatNumber(c.points)}</Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-500">المشاركة 5 نقاط. وبعد إعلان النتيجة: 10 للفزورة الصحيحة، ونقطتان لكل إجابة صحيحة في الاختبار، وللفائزين 50 و30 و20 للمراكز الثلاثة الأولى و10 لغيرهم.</p>
      </Card>
    </div>
  );
}

/** A student's activity points, looked up with the national ID (there are no student accounts). */
export default function Points() {
  const [nationalId, setNationalId] = useState('');
  const lookup = useMutation({
    mutationFn: () => api<PointsResult>('/api/points', { method: 'POST', body: { nationalId: normalizeDigits(nationalId).trim() } }),
  });
  const ready = normalizeDigits(nationalId).trim().length === 14;
  const submit = (e: FormEvent) => { e.preventDefault(); if (ready) lookup.mutate(); };

  return (
    <>
      <PageHeader title="نقاطي" subtitle="اكتب رقمك القومي لتعرف ما جمعته من نقاط الحضور والمسابقات." />
      <div className="container-page grid max-w-2xl gap-5 py-8">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <Input label="الرقم القومي" dir="ltr" inputMode="numeric" maxLength={14} value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="14 رقماً" />
            {lookup.error && <Alert>{(lookup.error as ApiError).message}</Alert>}
            <Button type="submit" loading={lookup.isPending} disabled={!ready}><Search className="size-4" /> اعرض نقاطي</Button>
          </form>
        </Card>
        {lookup.data && <Result data={lookup.data} />}
      </div>
    </>
  );
}
