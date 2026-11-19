import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCertificatePrinter } from '../../components/Certificates';
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
/** Every event a member attends earns this many activity points. */
const POINTS_PER_EVENT = 10;

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
  const certificates = useCertificatePrinter();
  const [minForCertificate, setMinForCertificate] = useState('1');
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

  const ranked = useMemo(
    () => [...(data?.members ?? [])].filter((m) => m.attended > 0).sort((a, b) => b.attended - a.attended || a.fullName.localeCompare(b.fullName, 'ar')),
    [data],
  );
  const byCollege = useMemo(() => {
    const map = new Map<string, { members: number; active: number; attended: number }>();
    for (const m of data?.members ?? []) {
      const row = map.get(m.collegeName) ?? { members: 0, active: 0, attended: 0 };
      row.members++;
      if (m.attended > 0) row.active++;
      row.attended += m.attended;
      map.set(m.collegeName, row);
    }
    return [...map.entries()].map(([name, v]) => ({ name, ...v, points: v.attended * POINTS_PER_EVENT })).sort((a, b) => b.points - a.points);
  }, [data]);

  const certificateFor = (m: AttendanceReport['members'][number]) => ({
    name: m.fullName,
    line: `${m.collegeName} — ${levelLabel(m.level)}`,
    reason: `تقديراً لحضوره ومشاركته في ${m.attended} ${m.attended > 2 && m.attended < 11 ? 'فعاليات' : 'فعالية'} من فعاليات الأسرة خلال ${period}، وشكراً على عطائه ومساهمته في خدمة زملائه وجامعته.`,
  });

  /** The yearly summary for the university: the numbers, each college, the events and the most active members. */
  const buildYearly = async (): Promise<ReportDoc> => {
    const report = data ?? await api<AttendanceReport>(`/api/admin/attendance/report${toQuery(params)}`);
    const top = [...report.members].filter((m) => m.attended > 0).sort((a, b) => b.attended - a.attended).slice(0, 20);
    const perCollege = new Map<string, { members: number; active: number; attended: number }>();
    for (const m of report.members) {
      const row = perCollege.get(m.collegeName) ?? { members: 0, active: 0, attended: 0 };
      row.members++;
      if (m.attended > 0) row.active++;
      row.attended += m.attended;
      perCollege.set(m.collegeName, row);
    }
    return {
      title: 'التقرير السنوي للأسرة',
      subtitle: [period, collegeName].filter(Boolean).join(' — '),
      sections: [
        {
          heading: 'ملخص',
          columns: ['البند', 'العدد'],
          rows: [
            ['الفعاليات', report.events.length],
            ['إجمالي المسجلين', report.events.reduce((s, e) => s + e.registered, 0)],
            ['إجمالي الحضور', report.events.reduce((s, e) => s + e.checkedIn, 0)],
            ['الأعضاء', report.members.length],
            ['أعضاء حضروا مرة على الأقل', report.members.filter((m) => m.attended > 0).length],
          ],
        },
        {
          heading: 'الكليات',
          columns: ['الكلية', 'الأعضاء', 'حضروا مرة على الأقل', 'مرات الحضور', 'النقاط'],
          rows: [...perCollege.entries()].sort((a, b) => b[1].attended - a[1].attended).map(([name, v]) => [name, v.members, v.active, v.attended, v.attended * POINTS_PER_EVENT]),
        },
        {
          heading: 'الفعاليات',
          columns: ['الفعالية', 'الجهة', 'الموعد', 'الفصل', 'المسجّلون', 'الحاضرون'],
          rows: report.events.map((e) => [e.title, e.collegeName ?? 'الأسرة', formatDateTime(e.startsAt), TERMS[e.term], e.registered, e.checkedIn]),
        },
        {
          heading: 'الأعضاء الأكثر نشاطاً',
          columns: ['الاسم', 'الكلية', 'حضر', 'النقاط'],
          rows: top.map((m) => [m.fullName, m.collegeName, m.attended, m.attended * POINTS_PER_EVENT]),
        },
      ],
    };
  };

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
          columns: ['الاسم', 'رقم العضوية', 'الكلية', 'المستوى', 'حضر', 'من أصل', 'النقاط'],
          rows: report.members.map((m) => [m.fullName, m.membershipNumber, m.collegeName, levelLabel(m.level), m.attended, report.events.length, m.attended * POINTS_PER_EVENT]),
        },
      ],
    };
  };

  return (
    <>
      <AdminTitle
        title="تقرير الحضور"
        subtitle="حضور الفعاليات على مستوى العام الجامعي أو الفصل، حتى لو تكررت الفعالية أكثر من مرة."
        action={<div className="flex flex-wrap gap-2">
          <ReportActions build={build} fileName={`تقرير-الحضور-${year}-${year + 1}${term ? `-ف${term}` : ''}`} disabled={!data} />
          <ReportActions build={buildYearly} fileName={`التقرير-السنوي-${year}-${year + 1}`} disabled={!data} printLabel="تقرير سنوي PDF" xlsxLabel="تقرير سنوي Excel" />
        </div>}
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

          {ranked.length > 0 && (
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 text-lg font-extrabold">لوحة الشرف <span className="text-sm font-semibold text-ink-500">(كل حضور = {POINTS_PER_EVENT} نقاط)</span></h2>
                <ol className="grid gap-1.5">
                  {ranked.slice(0, 10).map((m, i) => (
                    <li key={m.memberId} className="flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold-300 text-sm font-black">{i + 1}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{m.fullName}</span><span className="block truncate text-xs font-semibold text-ink-500">{m.collegeName}</span></span>
                      <Badge tone="gold">{formatNumber(m.attended * POINTS_PER_EVENT)} نقطة</Badge>
                    </li>
                  ))}
                </ol>
              </Card>
              {byCollege.length > 1 && (
                <Card className="p-5">
                  <h2 className="mb-3 text-lg font-extrabold">الكليات بالنقاط</h2>
                  <ul className="grid gap-1.5">
                    {byCollege.map((c) => (
                      <li key={c.name} className="flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2">
                        <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{c.name}</span><span className="block text-xs font-semibold text-ink-500">{formatNumber(c.active)} من {formatNumber(c.members)} عضو حضروا</span></span>
                        <Badge tone="brand">{formatNumber(c.points)} نقطة</Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

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
              <div className="flex items-end gap-2">
                <select aria-label="الحد الأدنى للحضور" value={minForCertificate} onChange={(e) => setMinForCertificate(e.target.value)} className={selectClass}>
                  {[1, 2, 3, 5, 8].map((n) => <option key={n} value={n}>حضروا {n} فأكثر</option>)}
                </select>
                <Button variant="outline" size="sm" className="mb-1" disabled={!ranked.some((m) => m.attended >= Number(minForCertificate))}
                  onClick={() => certificates.print(ranked.filter((m) => m.attended >= Number(minForCertificate)).map(certificateFor))}>
                  شهادات للجميع ({formatNumber(ranked.filter((m) => m.attended >= Number(minForCertificate)).length)})
                </Button>
              </div>
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
                    <th className="p-3 text-start">العضو</th><th className="p-3 text-start">الكلية</th><th className="p-3 text-start">المستوى</th><th className="p-3 text-start">حضر</th><th className="p-3 text-start">النقاط</th><th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, shown).map((m) => (
                    <tr key={m.memberId} className="border-b border-ink-100 last:border-0">
                      <td className="p-3"><p className="font-extrabold">{m.fullName}</p><p className="text-xs font-semibold text-ink-500" dir="ltr">{m.membershipNumber ?? m.studentCode}</p></td>
                      <td className="p-3 text-sm font-semibold">{m.collegeName}</td>
                      <td className="p-3 text-sm font-semibold">{levelLabel(m.level)}</td>
                      <td className="p-3"><Badge tone={m.attended === 0 ? 'amber' : 'green'}>{formatNumber(m.attended)} من {formatNumber(eventsCount)}</Badge></td>
                      <td className="p-3 text-sm font-extrabold">{formatNumber(m.attended * POINTS_PER_EVENT)}</td>
                      <td className="p-3">{m.attended > 0 && <Button variant="ghost" size="sm" onClick={() => certificates.print([certificateFor(m)])}>شهادة</Button>}</td>
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
      {certificates.sheet}
    </>
  );
}
