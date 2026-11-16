import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Pencil, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FlagName } from '../components/FlagName';
import { PageHeader } from '../components/Layout';
import { AdSlot } from '../components/AdSlot';
import { CoverFallback, PostGrid, PostGridSkeleton } from '../components/PostCard';
import { Badge, EmptyState, ErrorState, LinkButton, PageLoader, Pagination, cx } from '../components/ui';
import { api, mediaUrl, toQuery, type ApiError } from '../lib/api';
import { POST_TYPE_LABELS, formatDate, formatDateTime, formatNumber, formatTime } from '../lib/format';
import type { College, Paged, PostDetail, PostListItem } from '../lib/types';

const VIEWS = [
  { key: 'all', label: 'الكل' },
  { key: 'upcoming', label: 'فعاليات قادمة' },
  { key: 'past', label: 'فعاليات سابقة' },
  { key: 'events', label: 'كل الفعاليات' },
  { key: 'updates', label: 'أخبار وإعلانات' },
  { key: 'news', label: 'أخبار' },
  { key: 'announcements', label: 'إعلانات' },
];

function viewToParams(view: string) {
  switch (view) {
    case 'upcoming': return { when: 'upcoming' };
    case 'past': return { when: 'past' };
    case 'events': return { type: 'Event' };
    case 'updates': return { excludeEvents: 'true' };
    case 'news': return { type: 'News' };
    case 'announcements': return { type: 'Announcement' };
    default: return {};
  }
}

export function usePostList(params: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => api<Paged<PostListItem>>(`/api/posts${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export default function Posts() {
  const [search, setSearch] = useSearchParams();
  const view = search.get('view') ?? 'all';
  const collegeId = search.get('college') ?? '';
  const q = search.get('q') ?? '';
  const page = Number(search.get('page') ?? 1);
  const [term, setTerm] = useState(q);

  const update = useCallback((changes: Record<string, string>) => {
    setSearch((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!('page' in changes)) next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearch]);

  // Search as the user types, without firing a request for every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => term !== q && update({ q: term.trim() }), 400);
    return () => clearTimeout(timer);
  }, [term, q, update]);

  const colleges = useQuery({ queryKey: ['colleges'], queryFn: () => api<College[]>('/api/colleges'), staleTime: 300_000 });
  const { data, isPending, isError, isPlaceholderData, refetch } = usePostList({
    ...viewToParams(view), collegeId: collegeId === 'central' ? undefined : collegeId, scope: collegeId === 'central' ? 'central' : undefined, q, page, pageSize: 12,
  });
  const filtered = view !== 'all' || collegeId || q;

  return (
    <>
      <PageHeader title="الأنشطة والفعاليات" subtitle="كل ما تنظمه الأسرة والكليات: فعاليات قادمة، أنشطة سابقة، أخبار وإعلانات." />
      <div className="container-page py-8">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="تصنيف المحتوى">
            {VIEWS.map((item) => (
              <button
                key={item.key}
                role="tab"
                aria-selected={view === item.key}
                onClick={() => update({ view: item.key === 'all' ? '' : item.key })}
                className={cx(
                  'shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition',
                  view === item.key ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1 lg:w-64">
              <span className="sr-only">بحث</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="ابحث بالعنوان…"
                className="h-11 w-full rounded-xl border border-ink-300 bg-white pe-3 ps-9 text-[15px] focus:border-flame-500 focus:outline-none focus:ring-4 focus:ring-flame-500/15"
              />
            </label>
            <select
              aria-label="الجهة"
              value={collegeId}
              onChange={(event) => update({ college: event.target.value })}
              className="h-11 max-w-[11rem] rounded-xl border border-ink-300 bg-white px-3 text-[15px] focus:border-flame-500 focus:outline-none"
            >
              <option value="">كل الجهات</option>
              <option value="central">الأسرة (مركزي)</option>
              {colleges.data?.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
            </select>
          </div>
        </div>

        {isPending ? (
          <PostGridSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            title={filtered ? 'لا توجد نتائج مطابقة' : 'لا يوجد محتوى بعد'}
            text={filtered ? 'جرّب تغيير التصنيف أو كلمة البحث.' : 'ستظهر الأنشطة والأخبار هنا فور نشرها.'}
            action={filtered ? <LinkButton to="/activities" variant="outline" size="sm" onClick={() => setTerm('')}>عرض كل المحتوى</LinkButton> : undefined}
          />
        ) : (
          <div className={cx('transition-opacity', isPlaceholderData && 'opacity-60')}>
            <PostGrid posts={data.items} withAd />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(next) => { update({ page: String(next) }); window.scrollTo({ top: 0 }); }} />
          </div>
        )}
      </div>
    </>
  );
}

/** Full-screen viewer for a post's photos, with keyboard and swipe-free button navigation. */
function Lightbox({ images, index, onClose, onMove }: { images: PostDetail['images']; index: number; onClose: () => void; onMove: (index: number) => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      // In a right-to-left page the "next" photo is to the left.
      if (event.key === 'ArrowLeft') onMove((index + 1) % images.length);
      if (event.key === 'ArrowRight') onMove((index - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, images.length, onClose, onMove]);

  const arrow = 'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/95 animate-fade" role="dialog" aria-modal="true" aria-label="عرض الصور" onClick={onClose}>
      <img src={mediaUrl(images[index].url)} alt="" className="max-h-[88vh] max-w-[94vw] rounded-lg object-contain" onClick={(event) => event.stopPropagation()} />
      <button className="absolute end-4 top-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/25" onClick={onClose} aria-label="إغلاق"><X className="size-6" /></button>
      {images.length > 1 && (
        <>
          <button className={cx(arrow, 'start-3')} onClick={(event) => { event.stopPropagation(); onMove((index - 1 + images.length) % images.length); }} aria-label="الصورة السابقة"><ChevronRight className="size-6" /></button>
          <button className={cx(arrow, 'end-3')} onClick={(event) => { event.stopPropagation(); onMove((index + 1) % images.length); }} aria-label="الصورة التالية"><ChevronLeft className="size-6" /></button>
          <span className="absolute bottom-5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white">{index + 1} / {images.length}</span>
        </>
      )}
    </div>
  );
}

/** Plain text with clickable links. Nothing here is ever parsed as HTML. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <div className="whitespace-pre-line break-words text-lg leading-9 text-ink-800">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="font-bold text-brand-700 underline">{part}</a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </div>
  );
}

export function PostDetailPage() {
  const { id } = useParams();
  const [viewer, setViewer] = useState<number | null>(null);
  const { data: post, isPending, error, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api<PostDetail>(`/api/posts/${id}`),
    retry: (count, err) => (err as ApiError).status !== 404 && count < 2,
  });

  if (isPending) return <PageLoader />;
  if (error) {
    const missing = (error as ApiError).status === 404;
    return (
      <div className="container-page py-16">
        {missing ? (
          <EmptyState title="المنشور غير موجود" text="ربما تم حذفه أو أن الرابط غير صحيح." action={<LinkButton to="/activities" variant="primary">تصفح الأنشطة</LinkButton>} />
        ) : (
          <ErrorState onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  const isEvent = post.type === 'Event';
  const cover = post.images[0];
  const ended = isEvent && new Date(post.eventEndsAt ?? post.eventStartsAt ?? 0) < new Date();

  return (
    <article className="pb-16">
      <div className="relative bg-ink-900">
        {cover ? (
          <button className="block w-full" onClick={() => setViewer(0)} aria-label="عرض الصورة بالحجم الكامل">
            <img src={mediaUrl(cover.url)} alt="" className="max-h-[32rem] w-full object-cover opacity-90" fetchPriority="high" />
          </button>
        ) : (
          <CoverFallback className="h-56" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" aria-hidden />
      </div>

      <div className="container-page relative -mt-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-ink-200 bg-white p-6 shadow-lift sm:p-9">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link to="/activities" className="flex items-center gap-1 text-sm font-bold text-ink-500 hover:text-brand-700">
              <ArrowRight className="size-4" /> كل الأنشطة
            </Link>
            {post.canEdit && (
              <div className="flex gap-2">
                {isEvent && <LinkButton to={`/admin/posts/${post.id}/attendees`} variant="outline" size="sm">الحضور</LinkButton>}
                <LinkButton to={`/admin/posts/${post.id}`} variant="outline" size="sm"><Pencil className="size-4" /> تعديل</LinkButton>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isEvent ? 'brand' : 'dark'}>{POST_TYPE_LABELS[post.type]}</Badge>
            {post.status === 'Draft' && <Badge tone="amber">مسودة — غير منشور</Badge>}
            {ended && <Badge>انتهت</Badge>}
            {post.collegeId ? (
              <Link to={`/colleges/${post.collegeId}`} className="text-sm font-bold text-brand-700 hover:underline">{post.collegeName}</Link>
            ) : (
              <span className="text-sm font-bold text-brand-700">أسرة طلاب <FlagName /></span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-snug sm:text-4xl">{post.title}</h1>
          <p className="mt-2 text-sm font-semibold text-ink-500">نُشر في {formatDate(post.publishedAt ?? post.createdAt)}</p>

          {isEvent && post.eventStartsAt && (
            <div className="mt-6 grid gap-3 rounded-2xl bg-sand p-5 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><CalendarDays className="size-5" /></span>
                <div>
                  <p className="text-xs font-bold text-ink-500">الموعد</p>
                  <p className="font-extrabold">{formatDateTime(post.eventStartsAt)}</p>
                  {post.eventEndsAt && <p className="text-sm text-ink-600">حتى {formatTime(post.eventEndsAt)}</p>}
                </div>
              </div>
              {post.location && (
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white"><MapPin className="size-5" /></span>
                  <div>
                    <p className="text-xs font-bold text-ink-500">المكان</p>
                    <p className="font-extrabold">{post.location}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isEvent && post.attendeesCount > 0 && (
            <p className="mt-4 text-sm font-bold text-ink-600">حضر {formatNumber(post.attendeesCount)} من أعضاء الأسرة.</p>
          )}

          <div className="mt-7"><RichText text={post.body} /></div>
          <AdSlot placement="Content" className="mt-9" wide />

          {post.images.length > 1 && (
            <section className="mt-9">
              <h2 className="mb-3 text-xl font-extrabold">الصور ({post.images.length})</h2>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {post.images.map((image, index) => (
                  <button key={image.id} onClick={() => setViewer(index)} className="group overflow-hidden rounded-xl bg-ink-100" aria-label={`عرض الصورة ${index + 1}`}>
                    <img src={mediaUrl(image.thumbUrl)} alt="" loading="lazy" className="aspect-square size-full object-cover transition duration-300 group-hover:scale-105" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {viewer !== null && <Lightbox images={post.images} index={viewer} onClose={() => setViewer(null)} onMove={setViewer} />}
    </article>
  );
}
