import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReportActions, type ReportDoc } from '../../components/ReportActions';
import { Badge, Button, Card, EmptyState, ErrorState, Input } from '../../components/ui';
import { api, toQuery } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { TERMS, academicYearLabel, currentAcademicYear, formatDateTime, formatNumber, levelLabel, periodLabel } from '../../lib/format';
import type { AttendanceReport } from '../../lib/types';
import { AdminTitle } from './AdminLayout';
import { useManagedColleges } from './Content';

const selectClass = 'h-10 rounded-xl border border-ink-300 bg-white px-3 text-sm font-semibold focus:border-flame-500 focus:outline-none';
const PAGE = 100;

/**
 * Attendance over an academic year or one term of it. Events can happen several times a year, so the
 * numbers are per period: how many events there were, who came to each, and how many each member attended.
 */
export function AdminAttendanceReport() {
  const { hasRole } = useAuth();
  const thisYear = currentAcademicYear();
  const [year, setYear] = useState(thisYear);
  const [term, setTerm] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [q, setQ] = useState('');
  const [onlyAbsent, setOnlyAbsent] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const colleges = useManagedColleges();
  const isUniversity = hasRole('UniversityAdmin');

  const params = { academicYear: year, term: term || undefined, collegeId: collegeId || undefined };
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'attendance-report', params],
    queryFn: () => api<AttendanceReport>(`/api/admin/attendance/report${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });

  const members = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.members ?? []).filter((m) =>
      (!onlyAbsent || m.attended === 0)
      && (!needle || m.fullName.toLowerCase().includes(needle) || (m.membershipNumber ?? '').toLowerCase().includes(needle) || m.studentCode.includes(needle)));
  }, [data, q, onlyAbsent]);

  const period = periodLabel(year, term ? Number(term) : null);
  const collegeName = colleges.data?.find((c) => String(c.id) === collegeId)?.name;
  const eventsCount = data?.events.length ?? 0;
  const checkIns = data?.events.reduce((sum, e) => sum + e.checkedIn, 0) ?? 0;
  const activeMembers = data?.members.filter((m) => m.attended > 0).length ?? 0;

  const build = async (): Promise<ReportDoc> => {
    const report = data ?? await api<AttendanceReport>(`/api/admin/attendance/report${toQuery(params)}`);
    return {
      title: 'تقرير الحضور',
      subtitle: [period, collegeName].filter(Boolean).join(' — '),
      sections: [
        {
          heading: 'الفعاليات',
          columns: ['الفعالية', 'الجهة', 'الموعد', 'الفصل', 'المسجّلون', 'الحاضرون'],
          rows: report.events.map((e) => [e.title, e.collegeName ?? 'الأسرة', formatDateTime(e.startsAt), TERMS[e.term], e.registered, e.checkedIn]),
        },
        {
          heading: 'الأعضاء',
          columns: ['الاسم', 'رقم العضوية', 'الكلية', 'المستوى', 'حضر', `من أصل`],
          rows: report.members.map((m) => [m.fullName, m.membershipNumber, m.collegeName, levelLabel(m.level), m.attended, report.events.length]),
        },
      ],
    };
  };

  return (
    <>
      <AdminTitle
        title="تقرير الحضور"
        subtitle="حضور الفعاليات على مستوى العام الجامعي أو الفصل، حتى لو تكررت الفعالية أكثر من مرة."
        action={<ReportActions build={build} fileName={`تقرير-الحضور-${year}-${year + 1}${term ? `-ف${term}` : ''}`} disabled={!data} />}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <select aria-label="العام الجامعي" value={year} onChange={(e) => { setYear(Number(e.target.value)); setShown(PAGE); }} className={selectClass}>
          {Array.from({ length: 5 }, (_, i) => thisYear + 1 - i).map((y) => <option key={y} value={y}>العام الجامعي {academicYearLabel(y)}</option>)}
        </select>
        <select aria-label="الفصل" value={term} onChange={(e) => setTerm(e.target.value)} className={selectClass}>
          <option value="">كل العام</option>
          {[1, 2, 3].map((t) => <option key={t} value={t}>{TERMS[t]}</option>)}
        </select>
        {isUniversity && (
          <select aria-label="الكلية" value={collegeId} onChange={(e) => { setCollegeId(e.target.value); setShown(PAGE); }} className={selectClass}>
            <option value="">كل الكليات</option>
            {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'فعالية في هذه الفترة', value: eventsCount },
              { label: 'تسجيلات حضور', value: checkIns },
              { label: 'أعضاء', value: data.members.length },
              { label: 'أعضاء حضروا مرة على الأقل', value: activeMembers },
            ].map((s) => <Card key={s.label} className="p-4"><p className="text-3xl font-black">{formatNumber(s.value)}</p><p className="text-sm font-bold text-ink-500">{s.label}</p></Card>)}
          </div>

          <h2 className="mb-2 text-lg font-extrabold">الفعاليات <span className="text-sm font-semibold text-ink-500">({period})</span></h2>
          {data.events.length === 0 ? (
            <EmptyState title="لا توجد فعاليات منشورة في هذه الفترة" text="جرّب عاماً أو فصلاً آخر." />
          ) : (
            <div className="grid gap-2">
              {data.events.map((e) => (
                <Card key={e.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/posts/${e.id}/attendees`} className="block truncate font-extrabold hover:text-brand-700">{e.title}</Link>
                    <p className="text-xs font-semibold text-ink-500">{e.collegeName ?? 'الأسرة (مركزي)'} · {formatDateTime(e.startsAt)}{e.location ? ` · ${e.location}` : ''}</p>
                  </div>
                  <Badge tone="neutral">{TERMS[e.term]}</Badge>
                  <Badge tone="gold">{formatNumber(e.registered)} مسجّل</Badge>
                  <Badge tone="green">{formatNumber(e.checkedIn)} حضر</Badge>
                </Card>
              ))}
            </div>
          )}

          <div className="mb-2 mt-8 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-extrabold">الأعضاء وحضورهم <span className="text-sm font-semibold text-ink-500">({formatNumber(members.length)})</span></h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-56"><Input label="بحث" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="الاسم أو رقم العضوية" /></div>
              <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm font-bold text-ink-700">
                <input type="checkbox" className="size-4 accent-brand-600" checked={onlyAbsent} onChange={(e) => { setOnlyAbsent(e.target.checked); setShown(PAGE); }} />
                لم يحضروا أي فعالية
              </label>
            </div>
          </div>
          {members.length === 0 ? (
            <EmptyState title="لا يوجد أعضاء بهذا الاختيار" />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-sm text-ink-600">
                    <th className="p-3 text-start">العضو</th><th className="p-3 text-start">الكلية</th><th className="p-3 text-start">المستوى</th><th className="p-3 text-start">حضر</th>
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, shown).map((m) => (
                    <tr key={m.memberId} className="border-b border-ink-100 last:border-0">
                      <td className="p-3"><p className="font-extrabold">{m.fullName}</p><p className="text-xs font-semibold text-ink-500" dir="ltr">{m.membershipNumber ?? m.studentCode}</p></td>
                      <td className="p-3 text-sm font-semibold">{m.collegeName}</td>
                      <td className="p-3 text-sm font-semibold">{levelLabel(m.level)}</td>
                      <td className="p-3"><Badge tone={m.attended === 0 ? 'amber' : 'green'}>{formatNumber(m.attended)} من {formatNumber(eventsCount)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length > shown && (
                <div className="p-3 text-center"><Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>عرض المزيد ({formatNumber(members.length - shown)})</Button></div>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
