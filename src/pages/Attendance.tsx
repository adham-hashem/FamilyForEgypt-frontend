import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import jsQR from 'jsqr';
import { ArrowRight, Camera, CameraOff, Printer, ScanLine, UserCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlagName } from '../components/FlagName';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Input, LinkButton, PageLoader } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { formatDateTime, formatNumber, formatTime } from '../lib/format';
import type { Attendees, CheckInResult, PostDetail } from '../lib/types';
import { AdminTitle } from './admin/AdminLayout';


// ---------- reading a QR with the computer's camera ----------

function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const handler = useRef(onCode);
  handler.current = onCode;
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;
      const element = video.current;
      if (ctx && element && element.readyState >= 2 && element.videoWidth > 0) {
        // A small frame is plenty for a QR held up to the camera, and keeps every frame cheap.
        const scale = Math.min(1, 640 / element.videoWidth);
        canvas.width = Math.round(element.videoWidth * scale);
        canvas.height = Math.round(element.videoHeight * scale);
        ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
        if (found?.data) handler.current(found.data);
      }
      frame = requestAnimationFrame(tick);
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('هذا المتصفح لا يتيح استخدام الكاميرا. استخدم Chrome أو Edge، أو اكتب الرمز في الخانة.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (video.current) {
          video.current.srcObject = media;
          void video.current.play().catch(() => undefined);
        }
        tick();
      })
      .catch((reason: DOMException) => {
        setError(reason.name === 'NotAllowedError'
          ? 'الكاميرا غير مسموح بها. اسمح بها من أيقونة القفل بجوار عنوان الموقع ثم أعد المحاولة.'
          : reason.name === 'NotFoundError'
            ? 'لا توجد كاميرا متصلة بهذا الجهاز. اكتب الرمز في الخانة أو استخدم تطبيق الموبايل.'
            : 'تعذر تشغيل الكاميرا. تأكد أنها غير مستخدمة في برنامج آخر.');
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (error) return <Alert>{error}</Alert>;
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl bg-black">
      <video ref={video} muted playsInline className="size-full object-cover" />
      <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80" />
    </div>
  );
}

// ---------- the printed event badge ----------

interface BadgeData {
  memberId: number;
  fullName: string;
  collegeName: string | null;
  membershipNumber: string | null;
  badgeNumber: number;
}

/**
 * The badges live outside the page, straight under <body>. On screen they are hidden; when printing,
 * everything else is hidden instead (see index.css), so the paper carries only badges.
 */
function BadgeSheet({ badges, post }: { badges: BadgeData[]; post: PostDetail | undefined }) {
  return createPortal(
    <div className="print-root" dir="rtl">
      {badges.map((badge) => (
        <div className="event-badge" key={badge.memberId}>
          <div className="event-badge-head">
            <img src="/brand/logo.webp" alt="" />
            <div>
              <strong>أسرة طلاب <FlagName /></strong>
              <span>جامعة دمياط</span>
            </div>
          </div>
          <div className="event-badge-event">
            <strong>{post?.title ?? 'فعالية'}</strong>
            {post?.eventStartsAt ? <span>{formatDateTime(post.eventStartsAt)}</span> : null}
            {post?.location ? <span>{post.location}</span> : null}
          </div>
          <div className="event-badge-body">
            <span className="event-badge-label">الاسم</span>
            <strong className="event-badge-name">{badge.fullName}</strong>
            {badge.collegeName ? <span className="event-badge-college">{badge.collegeName}</span> : null}
            <span className="event-badge-role">{badge.membershipNumber ? `عضو الأسرة — ${badge.membershipNumber}` : 'مشارك'}</span>
          </div>
          <div className="event-badge-foot">
            <span>رقم الكارنيه</span>
            <strong dir="ltr">#{String(badge.badgeNumber).padStart(3, '0')}</strong>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}

const AUTO_PRINT_KEY = 'ffe_auto_print_badge';
const readAutoPrint = () => {
  try {
    return localStorage.getItem(AUTO_PRINT_KEY) === '1';
  } catch {
    return false;
  }
};

// ---------- organisers: who is coming, check-in and badges ----------

export function AdminAttendees() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const [autoPrint, setAutoPrint] = useState(readAutoPrint);
  const [last, setLast] = useState<CheckInResult | null>(null);
  const [printing, setPrinting] = useState<BadgeData[] | null>(null);
  // The camera sees the same code many times a second; this lets one through at a time.
  const busy = useRef(false);

  const post = useQuery({ queryKey: ['post', id], queryFn: () => api<PostDetail>(`/api/posts/${id}`) });
  // Refreshed on its own, so people checked in from a phone at the door show up here ready to print.
  const attendees = useQuery({
    queryKey: ['admin', 'attendees', id], queryFn: () => api<Attendees>(`/api/admin/posts/${id}/attendees`),
    retry: false, refetchInterval: 8000,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'attendees', id] });

  const scan = useMutation({
    mutationFn: (value: string) => api<CheckInResult>(`/api/admin/posts/${id}/check-in`, { method: 'POST', body: { code: value.trim() } }),
    onSuccess: (result) => {
      setLast(result);
      setCode('');
      refresh();
      if (autoPrint && !result.alreadyCheckedIn) setPrinting([result]);
    },
    onSettled: () => setTimeout(() => { busy.current = false; }, 1800),
  });

  // Printing starts once the badges are on the page, and they are removed again when the dialog closes.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  if (attendees.isPending) return <PageLoader />;
  if (attendees.error) {
    return (attendees.error as ApiError).status === 404 || (attendees.error as ApiError).status === 403
      ? <EmptyState title="لا يمكن عرض الحضور" text="هذا المنشور ليس فعالية أو أنه يتبع جهة أخرى." action={<LinkButton to="/admin/posts">رجوع للقائمة</LinkButton>} />
      : <ErrorState onRetry={() => void attendees.refetch()} />;
  }
  const data = attendees.data;
  const present = data.items
    .filter((item) => item.badgeNumber !== null)
    .map((item) => ({ ...item, badgeNumber: item.badgeNumber! }))
    .sort((a, b) => a.badgeNumber - b.badgeNumber);

  const toggleAutoPrint = (value: boolean) => {
    setAutoPrint(value);
    try {
      localStorage.setItem(AUTO_PRINT_KEY, value ? '1' : '0');
    } catch {
      /* the choice simply lasts for this visit */
    }
  };

  return (
    <>
      <Link to="/admin/posts" className="mb-2 flex items-center gap-1 text-sm font-bold text-ink-500 hover:text-brand-700"><ArrowRight className="size-4" /> رجوع للقائمة</Link>
      <AdminTitle title="الحضور والكارنيهات" subtitle={post.data?.title} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><p className="text-3xl font-black">{formatNumber(data.total)}</p><p className="text-sm font-bold text-ink-500">في القائمة</p></Card>
        <Card className="p-4"><p className="text-3xl font-black text-emerald-600">{formatNumber(data.checkedIn)}</p><p className="text-sm font-bold text-ink-500">حضروا فعلياً</p></Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><ScanLine className="size-5 text-brand-600" /> تسجيل الحضور بالرمز</h2>
          <Button variant={camera ? 'outline' : 'primary'} size="sm" onClick={() => { scan.reset(); setCamera((open) => !open); }}>
            {camera ? <><CameraOff className="size-4" /> إيقاف الكاميرا</> : <><Camera className="size-4" /> مسح بالكاميرا</>}
          </Button>
        </div>
        <p className="mt-1 text-sm text-ink-600">
          وجّه الكود اللي على ظهر كارنيه العضوية (مطبوعاً أو على هاتف العضو) إلى الكاميرا، فيُسجَّل حضوره ويجهز كارنيه الفعالية للطباعة.
          لو الكارنيه مش معاه اكتب رقم العضوية. يمكن أيضاً المسح من تطبيق الموبايل، أو بقارئ QR موصّل بالكمبيوتر والمؤشر داخل الخانة.
        </p>

        {camera && (
          <div className="mt-3">
            <QrScanner onCode={(value) => {
              if (busy.current) return;
              busy.current = true;
              scan.mutate(value);
            }} />
          </div>
        )}

        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) scan.mutate(code); }}>
          <div className="min-w-56 flex-1">
            <Input label="الكود أو رقم العضوية" dir="ltr" autoFocus={!camera} value={code} onChange={(e) => setCode(e.target.value)} placeholder="DU-2026-00001" />
          </div>
          <Button type="submit" variant="outline" loading={scan.isPending && !camera} disabled={!code.trim()}>تسجيل الحضور</Button>
        </form>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
          <input type="checkbox" className="size-4 accent-brand-600" checked={autoPrint} onChange={(e) => toggleAutoPrint(e.target.checked)} />
          اطبع الكارنيه تلقائياً بعد كل تسجيل حضور
        </label>

        <div className="mt-3 grid gap-2" aria-live="polite">
          {scan.error && <Alert>{(scan.error as ApiError).message}</Alert>}
          {last && !scan.error && (
            <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${last.alreadyCheckedIn ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-lg font-black" dir="ltr">#{last.badgeNumber}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">{last.fullName}</p>
                <p className="text-sm font-semibold text-ink-600">
                  {last.alreadyCheckedIn ? `مسجَّل حضوره من قبل (${formatTime(last.checkedInAt)})` : 'تم تسجيل الحضور'}
                  {last.collegeName ? ` · ${last.collegeName}` : ''}
                  {last.membershipNumber ? ` · عضو ${last.membershipNumber}` : ' · ليس عضواً بالأسرة'}
                </p>
              </div>
              <Button variant="gold" size="sm" onClick={() => setPrinting([last])}><Printer className="size-4" /> طباعة الكارنيه</Button>
            </div>
          )}
        </div>
      </Card>

      <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">القائمة</h2>
        {present.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setPrinting(present)}>
            <Printer className="size-4" /> طباعة كل الكارنيهات ({formatNumber(present.length)})
          </Button>
        )}
      </div>
      {data.items.length === 0 ? (
        <EmptyState title="لم يسجّل أحد حضوره بعد" text="سيظهر هنا كل عضو يُمسح كارنيهه عند الدخول." />
      ) : (
        <div className="grid gap-2">
          {data.items.map((item) => (
            <Card key={item.memberId} className="flex flex-wrap items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{item.fullName}</p>
                <p className="text-xs font-semibold text-ink-500">
                  {item.collegeName ? `${item.collegeName} · ` : ''}
                  {item.membershipNumber ? <span dir="ltr">{item.membershipNumber}</span> : 'ليس عضواً'}
                </p>
              </div>
              {item.checkedInAt && item.badgeNumber !== null && (
                <>
                  <Badge tone="green"><UserCheck className="size-3.5" /> حضر {formatTime(item.checkedInAt)}</Badge>
                  <Button variant="ghost" size="sm" aria-label={`طباعة كارنيه ${item.fullName}`} onClick={() => setPrinting([{ ...item, badgeNumber: item.badgeNumber! }])}>
                    <Printer className="size-4" /> كارنيه <span dir="ltr">#{item.badgeNumber}</span>
                  </Button>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {printing && <BadgeSheet badges={printing} post={post.data} />}
    </>
  );
}
