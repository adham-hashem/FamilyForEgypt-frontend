import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, Download, ExternalLink, FileText, Globe, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { PostGrid, PostGridSkeleton } from '../components/PostCard';
import { Badge, EmptyState, ErrorState, LinkButton, PageLoader, Pagination, cx } from '../components/ui';
import { api, mediaUrl, toQuery, type ApiError } from '../lib/api';
import { CATEGORY_LABELS, LEVELS, TERMS, formatDate, formatSize, levelLabel } from '../lib/format';
import type { College, CollegeDetail, Paged, Resource, ResourceCategory } from '../lib/types';
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
  { key: 'schedules', label: 'الجداول الدراسية', category: 'Schedule' },
  { key: 'exams', label: 'جداول الامتحانات', category: 'ExamSchedule' },
  { key: 'lectures', label: 'المحاضرات', category: 'Lecture' },
  { key: 'materials', label: 'مذكرات وملفات', category: 'Material' },
  { key: 'other', label: 'أخرى', category: 'Other' },
];

function ResourceCard({ resource }: { resource: Resource }) {
  const images = resource.files.filter((f) => f.isImage);
  const documents = resource.files.filter((f) => !f.isImage);
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{levelLabel(resource.level)}</Badge>
        {resource.term > 0 && <Badge>{TERMS[resource.term]}</Badge>}
        {resource.department && <Badge>{resource.department}</Badge>}
        {resource.courseName && <Badge tone="gold">{resource.courseName}</Badge>}
        <span className="ms-auto text-xs font-semibold text-ink-400">{formatDate(resource.createdAt)}</span>
      </div>
      <h3 className="mt-2.5 text-lg font-extrabold">{resource.title}</h3>
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

function Resources({ collegeId, category }: { collegeId: number; category: ResourceCategory }) {
  const [level, setLevel] = useState(0);
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ['resources', collegeId, category, level, page],
    queryFn: () => api<Paged<Resource>>(`/api/resources${toQuery({ collegeId, category, level: level || undefined, page, pageSize: 10 })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="الفرقة الدراسية">
        {['كل الفرق', ...LEVELS.slice(0, 5).map((name) => `الفرقة ${name}`)].map((label, index) => (
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
          text={level ? 'جرّب اختيار فرقة أخرى أو عرض كل الفرق.' : 'سيظهر المحتوى هنا فور إضافته من مسؤولي الكلية.'}
        />
      ) : (
        <div className={cx('grid gap-4 transition-opacity', isPlaceholderData && 'opacity-60')}>
          {data.items.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </div>
      )}
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
          {college.logoUrl ? <img src={mediaUrl(college.logoUrl)} alt="" className="size-full object-contain" /> : <Building2 className="size-10 text-ink-400" />}
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

        {tab.category ? <Resources key={tab.key} collegeId={collegeId} category={tab.category} /> : <CollegePosts collegeId={collegeId} />}
      </div>
    </>
  );
}
