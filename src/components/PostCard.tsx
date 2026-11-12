import { CalendarDays, Clock, Images, MapPin, Pin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mediaUrl } from '../lib/api';
import { POST_TYPE_LABELS, formatDate, formatDay, formatMonth, formatTime } from '../lib/format';
import type { PostListItem } from '../lib/types';
import { Badge, cx } from './ui';

/** Branded placeholder so posts without photos still look intentional. */
export function CoverFallback({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center justify-center bg-gradient-to-br from-ink-800 via-ink-900 to-brand-900', className)}>
      <img src="/brand/logo-sm.webp" alt="" className="size-16 opacity-80" loading="lazy" />
    </div>
  );
}

export function PostCard({ post }: { post: PostListItem }) {
  const isEvent = post.type === 'Event';
  return (
    <Link
      to={`/activities/${post.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
        {post.coverThumbUrl ? (
          <img
            src={mediaUrl(post.coverThumbUrl)}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <CoverFallback className="size-full" />
        )}
        <div className="absolute start-3 top-3 flex gap-1.5">
          <Badge tone={isEvent ? 'brand' : post.type === 'Announcement' ? 'gold' : 'dark'}>{POST_TYPE_LABELS[post.type]}</Badge>
          {post.isPinned && <Badge tone="gold"><Pin className="size-3" /> مثبّت</Badge>}
        </div>
        {post.imagesCount > 1 && (
          <span className="absolute bottom-3 end-3 flex items-center gap-1 rounded-full bg-ink-950/70 px-2 py-0.5 text-xs font-bold text-white">
            <Images className="size-3.5" /> {post.imagesCount}
          </span>
        )}
        {isEvent && post.eventStartsAt && (
          <div className="absolute bottom-3 start-3 w-14 overflow-hidden rounded-xl bg-white text-center shadow-lift">
            <div className="bg-brand-600 py-0.5 text-[11px] font-bold text-white">{formatMonth(post.eventStartsAt)}</div>
            <div className="py-0.5 text-xl font-black leading-7 text-ink-900">{formatDay(post.eventStartsAt)}</div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1 text-xs font-bold text-brand-600">{post.collegeName ?? 'أسرة طلاب من أجل مصر'}</p>
        <h3 className="line-clamp-2 text-lg font-extrabold leading-7 text-ink-900 group-hover:text-brand-700">{post.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-500">{post.summary}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[13px] font-semibold text-ink-500">
          {isEvent && post.eventStartsAt ? (
            <>
              <span className="flex items-center gap-1"><Clock className="size-4" /> {formatTime(post.eventStartsAt)}</span>
              {post.location && <span className="flex min-w-0 items-center gap-1"><MapPin className="size-4 shrink-0" /><span className="truncate">{post.location}</span></span>}
            </>
          ) : (
            <span className="flex items-center gap-1"><CalendarDays className="size-4" /> {formatDate(post.publishedAt)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PostGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <div className="skeleton aspect-[16/10] !rounded-none" />
          <div className="space-y-2.5 p-4">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PostGrid({ posts }: { posts: PostListItem[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
