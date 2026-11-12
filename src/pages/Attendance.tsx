import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import jsQR from 'jsqr';
import { ArrowRight, Camera, CameraOff, Download, Printer, QrCode, ScanLine, UserCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Input, LinkButton, PageLoader, useToast } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime, formatNumber, formatTime } from '../lib/format';
import type { Attendees, CheckInResult, PostDetail } from '../lib/types';
import { AdminTitle } from './admin/AdminLayout';

const FONT = '"Cairo Variable", "Cairo", sans-serif';

// ---------- the personal check-in QR ----------

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** Draws the card that is saved to the phone or computer: the family's name, the owner's name and the QR. */
async function drawCard(code: string, fullName: string) {
  const width = 900;
  const height = 1240;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  await Promise.all([document.fonts.load(`900 40px ${FONT}`), document.fonts.load(`700 40px ${FONT}`)]).catch(() => undefined);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#14110f';
  ctx.fillRect(0, 0, width, 250);
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(0, 250, width, 12);

  const logo = await loadImage('/brand/logo.webp');
  if (logo) ctx.drawImage(logo, width / 2 - 65, 22, 130, 130);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 40px ${FONT}`;
  ctx.fillText('أسرة طلاب من أجل مصر — جامعة دمياط', width / 2, 215);

  ctx.fillStyle = '#6b6560';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText('رمز الحضور', width / 2, 330);
  ctx.fillStyle = '#14110f';
  ctx.font = `900 50px ${FONT}`;
  ctx.fillText(fullName, width / 2, 400, width - 80);

  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, code, { width: 640, margin: 2, errorCorrectionLevel: 'M' });
  ctx.drawImage(qr, (width - 640) / 2, 450);

  ctx.fillStyle = '#6b6560';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText('أظهر هذا الرمز لمنظّم الفعالية عند الدخول', width / 2, 1150);
  ctx.fillText('الرمز خاص بك فلا تشاركه', width / 2, 1195);
  return canvas;
}

export function CheckInCard() {
  const { user } = useAuth();
  const toast = useToast();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [saving, setSaving] = useState(false);
  const { data, isError } = useQuery({
    queryKey: ['checkin-code'], queryFn: () => api<{ code: string }>('/api/auth/checkin-code'), staleTime: Infinity,
  });

  useEffect(() => {
    if (data && canvas.current) void QRCode.toCanvas(canvas.current, data.code, { width: 200, margin: 1, errorCorrectionLevel: 'M' });
  }, [data]);

  const download = async () => {
    if (!data || !user) return;
    setSaving(true);
    try {
      const card = await drawCard(data.code, user.fullName);
      const blob = await new Promise<Blob | null>((resolve) => card.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('empty');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'attendance-code.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('تم تنزيل الرمز. احتفظ بالصورة على هاتفك.');
    } catch {
      toast('تعذر تنزيل الرمز. حاول مرة أخرى.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isError) return null;
  return (
    <Card className="flex flex-wrap items-center gap-5 p-6">
      <div className="rounded-2xl border border-ink-200 bg-white p-2">
        {data ? <canvas ref={canvas} aria-label="رمز الحضور" className="size-[200px]" /> : <div className="skeleton size-[200px]" />}
      </div>
      <div className="min-w-48 flex-1">
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><QrCode className="size-5 text-brand-600" /> رمز الحضور</h2>
        <p className="mt-1 text-ink-600">
          أظهر هذا الرمز لمنظّم الفعالية عند الدخول ليُسجَّل حضورك ويُطبع كارنيه الفعالية باسمك.
          الرمز ثابت لحسابك، فنزّله واحتفظ به على هاتفك ليعمل حتى بدون إنترنت. لا تشاركه مع أحد.
        </p>
        <div className="mt-3">
          <Button variant="outline" size="sm" loading={saving} disabled={!data} onClick={() => void download()}>
            <Download className="size-4" /> تنزيل الرمز كصورة
          </Button>
        </div>
      </div>
    </Card>
  );
}

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
  userId: string;
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
        <div className="event-badge" key={badge.userId}>
          <div className="event-badge-head">
            <img src="/brand/logo.webp" alt="" />
            <div>
              <strong>أسرة طلاب من أجل مصر</strong>
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
  const toast = useToast();
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
  const manual = useMutation({
    mutationFn: (userId: string) => api<CheckInResult>(`/api/admin/posts/${id}/attendees/${userId}/check-in`, { method: 'POST' }),
    onSuccess: (result) => {
      toast(`تم تسجيل حضور ${result.fullName}.`);
      setLast(result);
      refresh();
      if (autoPrint && !result.alreadyCheckedIn) setPrinting([result]);
    },
    onError: (error) => toast((error as ApiError).message, 'error'),
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
        <Card className="p-4"><p className="text-3xl font-black">{formatNumber(data.total)}</p><p className="text-sm font-bold text-ink-500">سجّلوا «سأحضر»</p></Card>
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
          وجّه رمز الطالب (من هاتفه أو مطبوعاً) إلى الكاميرا، فيُسجَّل حضوره ويجهز كارنيه الفعالية للطباعة.
          يمكن أيضاً المسح من تطبيق الموبايل، أو بقارئ QR موصّل بالكمبيوتر والمؤشر داخل الخانة.
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
            <Input label="الرمز" dir="ltr" autoFocus={!camera} value={code} onChange={(e) => setCode(e.target.value)} placeholder="FFE1.…" />
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
        <EmptyState title="لم يسجّل أحد حضوره بعد" text="سيظهر هنا كل من يضغط «سأحضر» أو يُسجَّل حضوره عند الدخول." />
      ) : (
        <div className="grid gap-2">
          {data.items.map((item) => (
            <Card key={item.userId} className="flex flex-wrap items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{item.fullName}</p>
                <p className="text-xs font-semibold text-ink-500">
                  {item.collegeName ? `${item.collegeName} · ` : ''}
                  {item.membershipNumber ? <span dir="ltr">{item.membershipNumber}</span> : 'ليس عضواً'}
                </p>
              </div>
              {item.checkedInAt && item.badgeNumber !== null ? (
                <>
                  <Badge tone="green"><UserCheck className="size-3.5" /> حضر {formatTime(item.checkedInAt)}</Badge>
                  <Button variant="ghost" size="sm" aria-label={`طباعة كارنيه ${item.fullName}`} onClick={() => setPrinting([{ ...item, badgeNumber: item.badgeNumber! }])}>
                    <Printer className="size-4" /> كارنيه <span dir="ltr">#{item.badgeNumber}</span>
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" loading={manual.isPending && manual.variables === item.userId} onClick={() => manual.mutate(item.userId)}>تسجيل حضوره</Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {printing && <BadgeSheet badges={printing} post={post.data} />}
    </>
  );
}
