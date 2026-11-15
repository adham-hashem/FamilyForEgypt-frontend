import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Building2, CalendarClock, Download, ExternalLink, FileText, Globe, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AdSlot } from '../components/AdSlot';
import { PageHeader } from '../components/Layout';
import { PostGrid, PostGridSkeleton } from '../components/PostCard';
import { Badge, EmptyState, ErrorState, LinkButton, PageLoader, Pagination, cx } from '../components/ui';
import { api, mediaUrl, toQuery, type ApiError } from '../lib/api';
import {
  CATEGORY_LABELS, COURSE_KIND_LABELS, DUE_LABELS, TERMS, academicYearLabel, currentAcademicYear, formatDate, formatDateTime, formatNumber, formatSize, levelLabel, levelOptions, levelWord,
} from '../lib/format';
import type { College, CollegeDetail, Course, Paged, Resource, ResourceCategory } from '../lib/types';
import { CollegeTile } from './Home';
import { usePostList } from './Posts';

export default function Colleges() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['colleges'], queryFn: () => api<College[]>('/api/colleges'), staleTime: 300_000,
  });

  return (
    <>
      <PageHeader title="كليات الجامعة" subtitle="اختر كليتك لمتابعة أخبارها وفعالياتها والوصول إلى الجداول والمحاضرات." />
      <div className="container-page py-8">
        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-24" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState title="لم تُضف كليات بعد" text="ستظهر الكليات هنا فور إضافتها من إدارة الأسرة." action={<LinkButton to="/" variant="outline" size="sm">العودة للرئيسية</LinkButton>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((college) => <CollegeTile key={college.id} college={college} />)}
          </div>
        )}
      </div>
    </>
  );
}

const TABS: Array<{ key: string; label: string; category?: ResourceCategory }> = [
  { key: 'news', label: 'الأخبار والفعاليات' },
  { key: 'courses', label: 'المقررات' },
  { key: 'schedules', label: 'جداول المحاضرات', category: 'Schedule' },
  { key: 'exams', label: 'جداول الامتحانات', category: 'ExamSchedule' },
  { key: 'pastexams', label: 'امتحانات سابقة', category: 'PastExam' },
  { key: 'lectures', label: 'المحاضرات', category: 'Lecture' },
  { key: 'tutorials', label: 'السكاشن', category: 'Tutorial' },
  { key: 'summaries', label: 'الملخصات', category: 'Summary' },
  { key: 'assignments', label: 'التكليفات', category: 'Assignment' },
  { key: 'events', label: 'أحداث تعليمية', category: 'EducationalEvent' },
  { key: 'materials', label: 'مذكرات وملفات', category: 'Material' },
  { key: 'other', label: 'أخرى', category: 'Other' },
];

/** The deadline or date of an item, highlighted while it is still ahead. */
function DueBadge({ resource }: { resource: Resource }) {
  if (!resource.dueAt) return null;
  const upcoming = new Date(resource.dueAt).getTime() > Date.now();
  return (
    <span className={cx('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold', upcoming ? 'bg-amber-100 text-amber-800' : 'bg-ink-100 text-ink-500')}>
      <CalendarClock className="size-3.5" /> {DUE_LABELS[resource.category] ?? 'الموعد'}: {formatDateTime(resource.dueAt)}
    </span>
  );
}

export function ResourceCard({ resource, showCategory, system }: { resource: Resource; showCategory?: boolean; system?: number }) {
  const images = resource.files.filter((f) => f.isImage);
  const documents = resource.files.filter((f) => !f.isImage);
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        {showCategory && <Badge tone="dark">{CATEGORY_LABELS[resource.category]}</Badge>}
        <Badge tone="brand">{levelLabel(resource.level, system)}</Badge>
        {resource.sequence ? <Badge tone="dark">رقم {resource.sequence}</Badge> : null}
        {resource.term > 0 && <Badge>{TERMS[resource.term]}</Badge>}
        {resource.department && <Badge>{resource.department}</Badge>}
        {resource.courseName && <Badge tone="gold">{resource.courseName}</Badge>}
        <span className="ms-auto text-xs font-semibold text-ink-400">{formatDate(resource.createdAt)}</span>
      </div>
      <h3 className="mt-2.5 text-lg font-extrabold">{resource.title}</h3>
      {resource.dueAt && <div className="mt-2 flex"><DueBadge resource={resource} /></div>}
      {resource.description && <p className="mt-1 whitespace-pre-line leading-7 text-ink-600">{resource.description}</p>}

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image) => (
            <a key={image.id} href={mediaUrl(image.url)} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-ink-200 bg-ink-100">
              <img src={mediaUrl(image.thumbUrl ?? image.url)} alt={resource.title} loading="lazy" className="aspect-[4/3] size-full object-cover transition hover:scale-105" />
            </a>
          ))}
        </div>
      )}

      {(documents.length > 0 || resource.externalUrl) && (
        <div className="mt-4 flex flex-col gap-2">
          {documents.map((file) => (
            <a
              key={file.id}
              href={mediaUrl(file.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-ink-200 bg-sand px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <FileText className="size-5 shrink-0 text-brand-600" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-bold" dir="auto">{file.name}</span>
              <span className="shrink-0 text-xs font-semibold text-ink-500">{formatSize(file.size)}</span>
              <Download className="size-4 shrink-0 text-ink-500" aria-hidden />
            </a>
          ))}
          {resource.externalUrl && (
            <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 rounded-xl border border-ink-200 bg-sand px-4 py-3 font-bold text-brand-700 hover:bg-brand-50">
              <ExternalLink className="size-5 shrink-0" aria-hidden /> فتح الرابط
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Resources({ collegeId, category, levelsCount, system }: { collegeId: number; category: ResourceCategory; levelsCount: number; system: number }) {
  const [level, setLevel] = useState(0);
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ['resources', collegeId, category, level, page],
    queryFn: () => api<Paged<Resource>>(`/api/resources${toQuery({ collegeId, category, level: level || undefined, page, pageSize: 10 })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label={levelWord(system)}>
        {[levelLabel(0, system), ...levelOptions(levelsCount, system).map((o) => o.label)].map((label, index) => (
          <button
            key={label}
            onClick={() => { setLevel(index); setPage(1); }}
            aria-pressed={level === index}
            className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition', level === index ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500')}
          >
            {label}
          </button>
        ))}
      </div>
      {isPending ? (
        <div className="grid gap-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-32" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={`لا يوجد محتوى في «${CATEGORY_LABELS[category]}»`}
          text={level ? `جرّب اختيار ${system === 1 ? 'مستوى' : 'فرقة'} أخرى أو عرض الكل.` : 'سيظهر المحتوى هنا فور إضافته من مسؤولي الكلية.'}
        />
      ) : (
        <div className={cx('grid gap-4 transition-opacity', isPlaceholderData && 'opacity-60')}>
          {data.items.map((resource) => <ResourceCard key={resource.id} resource={resource} system={system} />)}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

function CollegeCourses({ collegeId, system }: { collegeId: number; system: number }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['courses', collegeId, currentAcademicYear()],
    queryFn: () => api<Course[]>(`/api/colleges/${collegeId}/courses${toQuery({ academicYear: currentAcademicYear() })}`),
  });
  if (isPending) return <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-28" />)}</div>;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  const hub = <LinkButton to={`/education?college=${collegeId}`} variant="outline" size="sm">تصفح حسب العام والفرقة والترم</LinkButton>;
  if (data.length === 0) return <EmptyState title={`لم تُضف مقررات ${academicYearLabel(currentAcademicYear())} بعد`} text="يضيف رائد الأسرة بالكلية المقررات ومحتواها هنا." action={hub} />;

  const levels = [...new Set(data.map((c) => c.level))].sort((a, b) => (a || 99) - (b || 99));
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-ink-600">مقررات العام الجامعي {academicYearLabel(currentAcademicYear())}</p>
        {hub}
      </div>
      {levels.map((level) => (
        <section key={level}>
          <h3 className="mb-3 text-lg font-black">{levelLabel(level, system)}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.filter((c) => c.level === level).map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`} className="group rounded-2xl border border-ink-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><BookOpen className="size-5" /></span>
                  <div className="min-w-0">
                    <p className="font-extrabold group-hover:text-brand-700">{course.name}</p>
                    <p className="text-xs font-semibold text-ink-500">
                      {[course.code, course.term > 0 ? TERMS[course.term] : null, course.kind ? COURSE_KIND_LABELS[course.kind] : null, course.creditHours ? `${course.creditHours} ساعات` : null, course.department, course.instructor].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold text-ink-600">{formatNumber(course.resourcesCount)} عنصر</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CollegePosts({ collegeId }: { collegeId: number }) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = usePostList({ collegeId, page, pageSize: 9 });
  if (isPending) return <PostGridSkeleton count={3} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (data.items.length === 0) return <EmptyState title="لا توجد أخبار لهذه الكلية بعد" text="ستظهر أخبار وفعاليات الكلية هنا فور نشرها." />;
  return (
    <>
      <PostGrid posts={data.items} />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
    </>
  );
}

export function CollegeDetailPage() {
  const { id } = useParams();
  const collegeId = Number(id);
  const [search, setSearch] = useSearchParams();
  const tab = TABS.find((t) => t.key === search.get('tab')) ?? TABS[0];

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['college', collegeId],
    queryFn: () => api<CollegeDetail>(`/api/colleges/${collegeId}`),
    retry: (count, err) => (err as ApiError).status !== 404 && count < 2,
  });

  if (isPending) return <PageLoader />;
  if (error) {
    return (
      <div className="container-page py-16">
        {(error as ApiError).status === 404 ? (
          <EmptyState title="الكلية غير موجودة" text="ربما تم إيقافها أو أن الرابط غير صحيح." action={<LinkButton to="/colleges" variant="primary">كل الكليات</LinkButton>} />
        ) : (
          <ErrorState onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  const { college } = data;
  return (
    <>
      <PageHeader title={college.name}>
        <Link to="/colleges" className="absolute top-4 flex items-center gap-1 text-sm font-bold text-ink-300 hover:text-white">
          <ArrowRight className="size-4" /> كل الكليات
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-ink-300">
          {college.deanName && <span className="flex items-center gap-1.5"><UserRound className="size-4 text-gold-300" /> عميد الكلية: {college.deanName}</span>}
          {college.websiteUrl && (
            <a href={college.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-bold text-gold-300 hover:underline">
              <Globe className="size-4" /> موقع الكلية
            </a>
          )}
        </div>
        <span className="absolute end-6 top-1/2 hidden size-24 -translate-y-1/2 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lift sm:flex">
          {college.logoUrl ? <img src={mediaUrl(college.logoThumbUrl ?? college.logoUrl)} alt="" className="size-full object-contain" /> : <Building2 className="size-10 text-ink-400" />}
        </span>
      </PageHeader>

      <div className="container-page py-8">
        {college.description && <p className="mb-7 max-w-3xl whitespace-pre-line text-lg leading-8 text-ink-700">{college.description}</p>}

        <div className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-ink-200 px-4 sm:mx-0 sm:px-0" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.key}
              role="tab"
              aria-selected={tab.key === item.key}
              onClick={() => setSearch(item.key === 'news' ? {} : { tab: item.key }, { replace: true })}
              className={cx(
                '-mb-px shrink-0 border-b-[3px] px-4 py-3 text-[15px] font-extrabold transition',
                tab.key === item.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-900',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab.category ? <Resources key={tab.key} collegeId={collegeId} category={tab.category} levelsCount={college.levelsCount} system={college.studySystem ?? 0} />
          : tab.key === 'courses' ? <CollegeCourses collegeId={collegeId} system={college.studySystem ?? 0} /> : <CollegePosts collegeId={collegeId} />}
        <AdSlot placement="Content" className="mt-10" wide />
      </div>
    </>
  );
}

/** One course and everything filed under it: lectures, tutorials, summaries, assignments, schedules… */
export function CourseDetailPage() {
  const { id } = useParams();
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [page, setPage] = useState(1);
  const course = useQuery({
    queryKey: ['course', id], queryFn: () => api<Course>(`/api/courses/${id}`),
    retry: (count, err) => (err as ApiError).status !== 404 && count < 2,
  });
  const collegeList = useQuery({ queryKey: ['colleges'], queryFn: () => api<College[]>('/api/colleges'), staleTime: 300_000 });
  const system = collegeList.data?.find((x) => x.id === course.data?.collegeId)?.studySystem ?? 0;
  const resources = useQuery({
    queryKey: ['resources', 'course', id, category, page],
    queryFn: () => api<Paged<Resource>>(`/api/resources${toQuery({ collegeId: course.data!.collegeId, courseId: id, category: category || undefined, page, pageSize: 10 })}`),
    enabled: !!course.data,
    placeholderData: keepPreviousData,
  });

  if (course.isPending) return <PageLoader />;
  if (course.error) {
    return (
      <div className="container-page py-16">
        {(course.error as ApiError).status === 404
          ? <EmptyState title="المقرر غير موجود" action={<LinkButton to="/colleges">الكليات</LinkButton>} />
          : <ErrorState onRetry={() => void course.refetch()} />}
      </div>
    );
  }

  const c = course.data;
  return (
    <>
      <PageHeader title={c.name} subtitle={[c.collegeName, levelLabel(c.level, system), c.term > 0 ? TERMS[c.term] : null, c.code].filter(Boolean).join(' · ')}>
        <Link to={`/colleges/${c.collegeId}?tab=courses`} className="absolute top-4 flex items-center gap-1 text-sm font-bold text-ink-300 hover:text-white">
          <ArrowRight className="size-4" /> مقررات الكلية
        </Link>
        {c.instructor && <p className="mt-3 flex items-center gap-1.5 text-ink-300"><UserRound className="size-4 text-gold-300" /> {c.instructor}</p>}
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-ink-300">
          {c.department && <span>{c.department}</span>}
          {c.kind > 0 && <span>{COURSE_KIND_LABELS[c.kind]}</span>}
          {c.creditHours ? <span>{c.creditHours} ساعات</span> : null}
          {c.language && <span>{c.language}</span>}
          {c.prerequisite && <span>المتطلب السابق: {c.prerequisite}</span>}
        </p>
      </PageHeader>
      <div className="container-page py-8">
        {c.description && <p className="mb-6 max-w-3xl whitespace-pre-line text-lg leading-8 text-ink-700">{c.description}</p>}
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {(['', ...Object.keys(CATEGORY_LABELS)] as Array<ResourceCategory | ''>).map((key) => (
            <button key={key || 'all'} onClick={() => { setCategory(key); setPage(1); }} aria-pressed={category === key}
              className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition', category === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500')}>
              {key ? CATEGORY_LABELS[key] : 'الكل'}
            </button>
          ))}
        </div>
        {resources.isPending ? (
          <div className="grid gap-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-32" />)}</div>
        ) : resources.isError ? (
          <ErrorState onRetry={() => void resources.refetch()} />
        ) : resources.data.items.length === 0 ? (
          <EmptyState title="لا يوجد محتوى هنا بعد" text="يظهر محتوى المقرر هنا فور إضافته." />
        ) : (
          <div className={cx('grid gap-4 transition-opacity', resources.isPlaceholderData && 'opacity-60')}>
            {resources.data.items.map((r) => <ResourceCard key={r.id} resource={r} showCategory={!category} />)}
            <Pagination page={resources.data.page} pageSize={resources.data.pageSize} total={resources.data.total} onChange={setPage} />
          </div>
        )}
        <AdSlot placement="Content" className="mt-10" wide />
      </div>
    </>
  );
}
