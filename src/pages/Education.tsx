import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BookOpen, CalendarClock, CalendarDays, Check, ClipboardList, GraduationCap, Link2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdSlot } from '../components/AdSlot';
import { PageHeader } from '../components/Layout';
import { Badge, EmptyState, ErrorState, Pagination, cx, useToast } from '../components/ui';
import { api, mediaUrl, toQuery } from '../lib/api';
import {
  CATEGORY_LABELS, COURSE_KIND_LABELS, DUE_LABELS, TERMS, academicYearLabel, currentAcademicYear, currentTerm, formatDateTime, formatNumber, levelOptions, levelWord,
} from '../lib/format';
import type { College, Course, Paged, Resource, ResourceCategory } from '../lib/types';
import { ResourceCard } from './Colleges';

const REMEMBER_KEY = 'ffe_education_filter';

interface Filter { college: number; year: number; level: number; term: number }

/** The categories listed under «كل المحتوى». Schedules have their own place at the top. */
const CONTENT_CATEGORIES: ResourceCategory[] = ['Lecture', 'Tutorial', 'Summary', 'Assignment', 'PastExam', 'EducationalEvent', 'Material', 'Other'];

function readRemembered(): Partial<Filter> {
  try {
    return JSON.parse(localStorage.getItem(REMEMBER_KEY) ?? '{}') as Partial<Filter>;
  } catch {
    return {};
  }
}

/** How far away a date is, in words a student reads at a glance. */
function untilText(iso: string) {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  if (days <= 10) return `بعد ${formatNumber(days)} أيام`;
  return `بعد ${formatNumber(days)} يوماً`;
}

function Segmented<T extends number>({ label, options, value, onChange }: { label: string; options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-extrabold text-ink-500">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
            className={cx('rounded-full border px-3.5 py-1.5 text-sm font-bold transition', value === o.value ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** First visit: pick the college from big, easy cards. */
function CollegePicker({ colleges, onPick }: { colleges: College[]; onPick: (id: number) => void }) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-black">اختر كليتك</h2>
      <p className="mb-4 text-ink-600">سنتذكر اختيارك في المرة القادمة.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {colleges.map((college) => (
          <button key={college.id} onClick={() => onPick(college.id)}
            className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-start shadow-card transition hover:-translate-y-0.5 hover:border-brand-300">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-sand">
              {college.logoUrl ? <img src={mediaUrl(college.logoThumbUrl ?? college.logoUrl)} alt="" className="size-full object-contain" /> : <GraduationCap className="size-6 text-ink-400" />}
            </span>
            <span className="font-extrabold">{college.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The lecture and exam schedules of the chosen year, level and term: what students open most. */
function Schedules({ filter }: { filter: Filter }) {
  const query = (category: ResourceCategory) => ({
    queryKey: ['education', 'schedules', filter, category],
    queryFn: () => api<Paged<Resource>>(`/api/resources${toQuery({ collegeId: filter.college, academicYear: filter.year, level: filter.level, term: filter.term, category, pageSize: 2 })}`),
  });
  const lectures = useQuery(query('Schedule'));
  const exams = useQuery(query('ExamSchedule'));
  const items = [
    { title: 'جدول المحاضرات', icon: CalendarDays, data: lectures.data?.items[0], pending: lectures.isPending, tone: 'from-sky-50 to-white' },
    { title: 'جدول الامتحانات', icon: ClipboardList, data: exams.data?.items[0], pending: exams.isPending, tone: 'from-amber-50 to-white' },
  ];
  return (
    <section>
      <h2 className="mb-3 text-lg font-black">الجداول</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(({ title, icon: Icon, data, pending, tone }) => {
          const file = data?.files[0];
          const href = file ? mediaUrl(file.url) : data?.externalUrl ?? null;
          return (
            <div key={title} className={cx('rounded-2xl border border-ink-200 bg-gradient-to-br p-5 shadow-card', tone)}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-7 shrink-0 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black">{title}</p>
                  {pending ? <div className="skeleton mt-2 h-4 w-40" />
                    : data ? <p className="truncate text-sm font-semibold text-ink-600">{data.title} · {formatDateTime(data.updatedAt)}</p>
                    : <p className="text-sm text-ink-500">لم يُرفع بعد لهذا الاختيار.</p>}
                </div>
              </div>
              {data && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {href && <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink-900 px-4 text-sm font-extrabold text-white hover:bg-ink-700">فتح الجدول</a>}
                  {(data.files.length > 1 || (!href && data.description)) && <a href="#all-content" className="inline-flex h-10 items-center rounded-xl border border-ink-300 bg-white px-4 text-sm font-bold">كل التفاصيل</a>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Deadlines, exams and events still ahead, soonest first. */
function Upcoming({ filter }: { filter: Filter }) {
  const { data } = useQuery({
    queryKey: ['education', 'upcoming', filter],
    queryFn: () => api<Paged<Resource>>(`/api/resources${toQuery({ collegeId: filter.college, academicYear: filter.year, level: filter.level, term: filter.term, upcoming: true, pageSize: 6 })}`),
  });
  if (!data || data.items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><CalendarClock className="size-5 text-flame-600" /> مواعيد قادمة</h2>
      <div className="grid gap-2 md:grid-cols-2">
        {data.items.map((item) => (
          <a key={item.id} href={`#resource-${item.id}`} className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 transition hover:border-amber-400">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-center text-xs font-black leading-tight text-amber-800">{untilText(item.dueAt!)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold">{item.title}</span>
              <span className="block truncate text-xs font-semibold text-ink-600">{DUE_LABELS[item.category] ?? CATEGORY_LABELS[item.category]}: {formatDateTime(item.dueAt)}{item.courseName ? ` · ${item.courseName}` : ''}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Courses({ filter }: { filter: Filter }) {
  const [department, setDepartment] = useState('');
  const { data: all, isPending } = useQuery({
    queryKey: ['education', 'courses', filter],
    queryFn: () => api<Course[]>(`/api/colleges/${filter.college}/courses${toQuery({ academicYear: filter.year, level: filter.level, term: filter.term })}`),
  });
  const departments = [...new Set((all ?? []).map((c) => c.department).filter((d): d is string => !!d))];
  const data = department ? all?.filter((c) => c.department === department) : all;
  return (
    <section>
      <h2 className="mb-3 text-lg font-black">المقررات {data && data.length > 0 && <span className="text-sm font-bold text-ink-500">({formatNumber(data.length)})</span>}</h2>
      {departments.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="القسم">
          {['', ...departments].map((d) => (
            <button key={d || 'all'} onClick={() => setDepartment(d)} aria-pressed={department === d}
              className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition', department === d ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500')}>
              {d || 'كل الأقسام'}
            </button>
          ))}
        </div>
      )}
      {isPending ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-24" />)}</div>
        : !data || data.length === 0 ? <p className="rounded-2xl border border-dashed border-ink-300 p-5 text-center text-ink-500">لم تُضف مقررات لهذا الاختيار بعد.</p>
        : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`} className="group rounded-2xl border border-ink-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><BookOpen className="size-5" /></span>
                  <div className="min-w-0">
                    <p className="font-extrabold group-hover:text-brand-700">{course.name}</p>
                    <p className="text-xs font-semibold text-ink-500">{[course.code, course.kind ? COURSE_KIND_LABELS[course.kind] : null, course.creditHours ? `${course.creditHours} ساعات` : null, course.instructor, course.department].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold text-ink-600">{formatNumber(course.resourcesCount)} عنصر</p>
              </Link>
            ))}
          </div>
        )}
    </section>
  );
}

function AllContent({ filter }: { filter: Filter }) {
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filter, category, term]);
  useEffect(() => { const t = setTimeout(() => setTerm(search.trim()), 350); return () => clearTimeout(t); }, [search]);
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ['education', 'content', filter, category, term, page],
    queryFn: () => api<Paged<Resource>>(`/api/resources${toQuery({
      collegeId: filter.college, academicYear: filter.year, level: filter.level, term: filter.term, category: category || undefined, q: term || undefined, page, pageSize: 10,
    })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <section id="all-content" className="scroll-mt-40">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-black">كل المحتوى</h2>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالعنوان أو اسم المقرر"
            className="h-10 w-full rounded-xl border border-ink-300 bg-white pe-9 ps-9 text-sm font-semibold outline-none focus:border-brand-500" />
          {search && <button onClick={() => setSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700" aria-label="مسح البحث"><X className="size-4" /></button>}
        </label>
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(['', 'Schedule', 'ExamSchedule', ...CONTENT_CATEGORIES] as Array<ResourceCategory | ''>).map((key) => (
          <button key={key || 'all'} onClick={() => setCategory(key)} aria-pressed={category === key}
            className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition', category === key ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500')}>
            {key ? CATEGORY_LABELS[key] : 'الكل'}
          </button>
        ))}
      </div>
      {isPending ? <div className="grid gap-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-32" />)}</div>
        : isError ? <ErrorState onRetry={() => void refetch()} />
        : data.items.length === 0 ? <EmptyState title="لا يوجد محتوى مطابق" text={term ? 'جرّب كلمة بحث أخرى.' : 'يظهر هنا ما يرفعه رائد الأسرة لهذا العام والفرقة والترم.'} />
        : (
          <div className={cx('grid gap-4 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {data.items.map((r) => <div key={r.id} id={`resource-${r.id}`} className="scroll-mt-40"><ResourceCard resource={r} showCategory={!category} /></div>)}
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </div>
        )}
    </section>
  );
}

/**
 * The students' study hub: pick a college, academic year, level and term once, and see that term's
 * schedules, coming dates, courses and every file. The choice lives in the address (so it can be shared)
 * and is remembered on this device for next time.
 */
export default function Education() {
  const toast = useToast();
  const [search, setSearch] = useSearchParams();
  const colleges = useQuery({ queryKey: ['colleges'], queryFn: () => api<College[]>('/api/colleges'), staleTime: 300_000 });
  const remembered = useMemo(readRemembered, []);
  const number = (key: string) => Number(search.get(key)) || undefined;

  const filter: Partial<Filter> = {
    college: number('college') ?? remembered.college,
    year: number('year') ?? currentAcademicYear(),
    level: number('level') ?? remembered.level ?? 1,
    term: number('term') ?? currentTerm(),
  };
  const college = colleges.data?.find((c) => c.id === filter.college);
  const years = useQuery({
    queryKey: ['academic-years', filter.college],
    queryFn: () => api<number[]>(`/api/colleges/${filter.college}/academic-years`),
    enabled: !!college,
  });

  const update = (changes: Partial<Filter>) => {
    const next = { ...filter, ...changes } as Filter;
    if (changes.college && college && changes.college !== college.id) {
      const levels = colleges.data?.find((c) => c.id === changes.college)?.levelsCount ?? 4;
      if (next.level > levels) next.level = 1;
    }
    setSearch({ college: String(next.college), year: String(next.year), level: String(next.level), term: String(next.term) }, { replace: true });
    try {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ college: next.college, level: next.level }));
    } catch {
      /* remembering is only a convenience */
    }
  };

  const ready = !!college && !!filter.year && !!filter.level && !!filter.term;
  const full = filter as Filter;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('تم نسخ الرابط. شاركه مع زملائك.');
    } catch {
      toast('انسخ الرابط من شريط العنوان.', 'error');
    }
  };

  return (
    <>
      <PageHeader title="العملية التعليمية" subtitle="جداول المحاضرات والامتحانات، المقررات، المحاضرات والسكاشن والملخصات والتكليفات: اختر كليتك وفرقتك والترم." />
      <div className="container-page py-8">
        {colleges.isPending ? <div className="skeleton h-40" /> : colleges.isError ? <ErrorState onRetry={() => void colleges.refetch()} />
          : !college ? <CollegePicker colleges={colleges.data} onPick={(id) => update({ college: id, level: 1 })} />
          : (
            <div className="grid gap-8">
              {/* The filter stays in reach while scrolling. */}
              <div className="sticky top-[67px] z-20 -mx-4 border-b border-ink-200 bg-sand/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white/95 sm:px-5 sm:shadow-card">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.6fr)_auto] lg:items-end">
                  <label>
                    <span className="mb-1.5 block text-xs font-extrabold text-ink-500">الكلية</span>
                    <select value={college.id} onChange={(e) => update({ college: Number(e.target.value) })}
                      className="h-10 w-full rounded-xl border border-ink-300 bg-white px-3 font-bold outline-none focus:border-brand-500">
                      {colleges.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-extrabold text-ink-500">العام الجامعي</span>
                    <select value={full.year} onChange={(e) => update({ year: Number(e.target.value) })}
                      className="h-10 w-full rounded-xl border border-ink-300 bg-white px-3 font-bold outline-none focus:border-brand-500">
                      {(years.data ?? [full.year]).map((y) => <option key={y} value={y}>{academicYearLabel(y)}{y === currentAcademicYear() ? ' (الحالي)' : ''}</option>)}
                    </select>
                  </label>
                  <Segmented label={levelWord(college.studySystem)} options={levelOptions(college.levelsCount, college.studySystem)} value={full.level} onChange={(level) => update({ level })} />
                  <Segmented label="الترم" options={[1, 2, 3].map((t) => ({ value: t, label: TERMS[t] }))} value={full.term} onChange={(term) => update({ term })} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone="dark"><Check className="size-3.5" /> {college.name}</Badge>
                  <Badge tone="brand">{levelOptions(college.levelsCount, college.studySystem)[full.level - 1]?.label}</Badge>
                  <Badge tone="gold">{TERMS[full.term]} · {academicYearLabel(full.year)}</Badge>
                  <button onClick={() => void share()} className="ms-auto flex items-center gap-1 font-bold text-brand-700 hover:underline"><Link2 className="size-4" /> نسخ رابط الاختيار</button>
                </div>
              </div>

              {ready && (
                <>
                  <Schedules filter={full} />
                  <Upcoming filter={full} />
                  <Courses filter={full} />
                  <AdSlot placement="Content" wide />
                  <AllContent filter={full} />
                </>
              )}
            </div>
          )}
      </div>
    </>
  );
}
