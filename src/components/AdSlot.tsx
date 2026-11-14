import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { api, mediaUrl } from '../lib/api';
import type { Ad, AdPlacement } from '../lib/types';
import { cx } from './ui';

/** The running ads, all placements in one request shared by every slot on the page. */
function useAds() {
  return useQuery({ queryKey: ['ads'], queryFn: () => api<Ad[]>('/api/ads'), staleTime: 120_000 });
}

/** Spreads the ads of a placement over the slots of a page, so the same ad does not show twice in a row. */
export function useAdFor(placement: AdPlacement, index = 0) {
  const { data } = useAds();
  const ads = data?.filter((ad) => ad.placement === placement) ?? [];
  return ads.length ? ads[index % ads.length] : null;
}

/**
 * One advertisement, always marked «إعلان» so it is never mistaken for the family's own content.
 * Clicks go through the API, which counts them and sends the visitor on.
 */
export function AdCard({ ad, className, wide }: { ad: Ad; className?: string; wide?: boolean }) {
  const body = (
    <>
      <span className="absolute start-3 top-3 z-10 rounded-full bg-ink-950/70 px-2.5 py-0.5 text-[11px] font-extrabold text-white backdrop-blur">إعلان</span>
      <img
        src={mediaUrl(ad.imageUrl)}
        srcSet={`${mediaUrl(ad.thumbUrl)} 720w, ${mediaUrl(ad.imageUrl)} 1920w`}
        sizes={wide ? '(min-width: 1280px) 1216px, 100vw' : '(min-width: 1024px) 400px, 100vw'}
        width={ad.imageWidth || undefined}
        height={ad.imageHeight || undefined}
        alt={ad.title}
        loading="lazy"
        decoding="async"
        className={cx('w-full bg-ink-100 object-cover', wide ? 'max-h-72' : 'aspect-[16/9]')}
      />
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{ad.title}</p>
          <p className="truncate text-sm text-ink-500">{ad.description ?? ad.advertiserName}</p>
        </div>
        {ad.hasLink && <ExternalLink className="size-4 shrink-0 text-ink-400" aria-hidden />}
      </div>
    </>
  );
  const classes = cx('relative block overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition', ad.hasLink && 'hover:-translate-y-0.5 hover:shadow-lift', className);
  return ad.hasLink ? (
    <a href={mediaUrl(`/api/ads/${ad.id}/go`)} target="_blank" rel="noopener sponsored" className={classes} aria-label={`إعلان: ${ad.title} — ${ad.advertiserName}`}>{body}</a>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/** A slot for one ad of a placement. Takes no space at all when there is nothing to show. */
export function AdSlot({ placement, index = 0, className, wide }: { placement: AdPlacement; index?: number; className?: string; wide?: boolean }) {
  const ad = useAdFor(placement, index);
  return ad ? <AdCard ad={ad} className={className} wide={wide} /> : null;
}

/** The home page's sponsor strip: up to three ads side by side, under a small heading. */
export function HomeAds() {
  const { data } = useAds();
  const ads = data?.filter((ad) => ad.placement === 'Home').slice(0, 3) ?? [];
  if (ads.length === 0) return null;
  return (
    <section className="border-y border-ink-200 bg-white py-10" aria-label="إعلانات">
      <div className="container-page">
        <p className="mb-4 text-sm font-extrabold tracking-wide text-ink-500">شركاء وإعلانات</p>
        <div className={cx('grid gap-4', ads.length === 1 ? '' : ads.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
          {ads.map((ad) => <AdCard key={ad.id} ad={ad} wide={ads.length === 1} />)}
        </div>
      </div>
    </section>
  );
}
