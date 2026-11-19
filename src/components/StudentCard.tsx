import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { api, fetchBlobUrl } from '../lib/api';
import { currentAcademicYear, levelLabel } from '../lib/format';
import { FlagName } from './FlagName';
import { Button } from './ui';
import './student-card.css';

export interface CardStudent {
  fullName: string;
  collegeName: string;
  department: string | null;
  level: number;
  studentCode: string;
  membershipNumber: string | null;
  /** The academic year the membership is valid for; the current year when unknown. */
  validYear?: number | null;
}

/** The academic year runs from September: in November 2026 it is "2026 / 2027". */
export function academicYear(date = new Date()) {
  const year = date.getFullYear();
  return date.getMonth() >= 8 ? `${year} / ${year + 1}` : `${year - 1} / ${year}`;
}

/** Long values get a smaller font instead of being cut. Based on length, so it is the same on screen and paper. */
const fit = (text: string, fitsChars: number) => ({ '--fit': Math.max(0.62, Math.min(1, fitsChars / Math.max(1, text.length))) }) as CSSProperties;

/** The flag of Egypt. */
function EgyptFlag() {
  return <img className="sid-egypt" src="/brand/egypt-flag.webp" alt="علم مصر" />;
}

function Value({ text, fitsChars }: { text: string; fitsChars: number }) {
  return <span className="sid-v" style={fit(text, fitsChars)}>{text}</span>;
}

/** Both sides of the card. photo and qr are image URLs; either may be missing. */
export function StudentIdCard({ student, photo, qr }: { student: CardStudent; photo?: string | null; qr?: string | null }) {
  const year = student.validYear ? `${student.validYear} / ${student.validYear + 1}` : academicYear();
  const department = student.department?.trim() || '—';

  return (
    <>
      <div className="sid-frame">
        <section className="sid-card" aria-label="وجه الكارنيه">
          <div className="sid-head">
            <img className="sid-logo" src="/brand/logo.webp" alt="شعار الأسرة" />
            <div className="sid-titles">
              <div className="sid-t1">أسرة طلاب <FlagName /></div>
              <div className="sid-t2">جامعة دمياط · بطاقة عضوية طالب</div>
            </div>
            <div className="sid-uni"><img src="/brand/university.webp" alt="شعار جامعة دمياط" /></div>
          </div>
          <div className="sid-flag"><i /><i /><i /></div>

          <div className="sid-body">
            <img className="sid-watermark" src="/brand/logo.webp" alt="" />
            <div>
              <div className="sid-badge-row">
                <span className="sid-badge">عضو الأسرة</span>
                <EgyptFlag />
              </div>
              <div className="sid-field sid-name"><span className="sid-k">اسم الطالب</span><Value text={student.fullName} fitsChars={28} /></div>
              <div className="sid-field"><span className="sid-k">الكلية</span><Value text={student.collegeName} fitsChars={36} /></div>
              <div className="sid-pair">
                <div className="sid-field"><span className="sid-k">القسم / الشعبة</span><Value text={department} fitsChars={17} /></div>
                <div className="sid-field"><span className="sid-k">المستوى</span><Value text={levelLabel(student.level)} fitsChars={17} /></div>
              </div>
            </div>
            <div className="sid-photo">
              <div className="sid-photo-in">
                {photo ? <img src={photo} alt="صورة الطالب" /> : (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-9 2.2-9 5.5V22h18v-2.5c0-3.3-4.6-5.5-9-5.5Z" /></svg>
                )}
              </div>
            </div>
          </div>

          <div className="sid-idbar">
            <span className="sid-idbar-k">ID الطالب</span>
            <span className="sid-idbar-v sid-ltr">{student.studentCode}</span>
            <span className="sid-idbar-y">العام الجامعي <span className="sid-ltr">{year}</span></span>
          </div>
        </section>
      </div>

      <div className="sid-frame">
        <section className="sid-card sid-back" aria-label="ظهر الكارنيه">
          <div className="sid-dots" />
          <img className="sid-bigmark" src="/brand/logo.webp" alt="" />
          <div className="sid-content">
            <div>
              <h3>تعليمات البطاقة</h3>
              <ul>
                <li>البطاقة شخصية، ولا يجوز استخدامها لغير صاحبها.</li>
                <li>امسح الكود عند حضور فعاليات الأسرة لتسجيل حضورك.</li>
                <li>صالحة للعام الجامعي <span className="sid-ltr">{year}</span> فقط.</li>
                <li>عند العثور عليها تُسلَّم إلى الإدارة العامة لرعاية الطلاب — جامعة دمياط.</li>
              </ul>
            </div>
            <div className="sid-qr">
              {qr ? <img src={qr} alt="كود الحضور" /> : <div className="sid-qr-empty">كود الحضور</div>}
              <div className="sid-qr-k">رقم العضوية</div>
              <div className="sid-qr-v sid-ltr">{student.membershipNumber ?? '—'}</div>
            </div>
          </div>
          <div className="sid-sign">توقيع رائد الأسرة وختم رعاية الطلاب</div>
          <div className="sid-site"><span className="sid-ltr">ffe-front.vercel.app</span></div>
          <div className="sid-flag"><i /><i /><i /></div>
        </section>
      </div>
    </>
  );
}

/** Fetches a private image with the session token and keeps it as a local URL while the card is shown. */
function usePrivateImage(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let created = '';
    fetchBlobUrl(path, controller.signal)
      .then((blob) => { created = blob; setUrl(blob); })
      .catch(() => setUrl(null));
    return () => {
      controller.abort();
      if (created) URL.revokeObjectURL(created);
    };
  }, [path]);
  return path ? url : null;
}

/**
 * The card with its photo and check-in QR loaded, plus a print button.
 * Staff pass API paths (photoPath is fetched with their session; codePath returns { code }). The status
 * page passes what the lookup already gave: photoSrc, a plain image address, and code itself.
 */
export function StudentCardPanel({ student, photoPath = null, photoSrc = null, codePath = null, code = null }: {
  student: CardStudent; photoPath?: string | null; photoSrc?: string | null; codePath?: string | null; code?: string | null;
}) {
  const privatePhoto = usePrivateImage(photoPath);
  const photo = photoSrc ?? privatePhoto;
  const { data: qr } = useQuery({
    queryKey: ['card-qr', codePath, code],
    queryFn: async () => {
      const value = code ?? (await api<{ code: string }>(codePath!)).code;
      return QRCode.toDataURL(value, { width: 360, margin: 1, errorCorrectionLevel: 'M' });
    },
    enabled: !!(code || codePath),
    staleTime: Infinity,
    retry: false,
  });
  const [printing, setPrinting] = useState(false);

  // The print copy is added under <body> only while the print dialog is open.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  const expired = !!student.validYear && student.validYear < currentAcademicYear();

  return (
    <div>
      {expired && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          هذه العضوية كانت للعام الجامعي {student.validYear} / {student.validYear! + 1}. يجدّدها رائد الأسرة للعام الحالي، وبعدها يظهر العام الجديد على الكارنيه.
        </p>
      )}
      <div className="@container">
        <div className="grid justify-items-center gap-5 @2xl:grid-cols-2">
          <StudentIdCard student={student} photo={photo} qr={qr} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button variant="dark" onClick={() => setPrinting(true)}><Printer className="size-5" /> طباعة الكارنيه</Button>
        <p className="text-sm text-ink-500">يُطبع الوش والظهر بمقاس الكارنيه الحقيقي (85.6 × 54 مم). اختر «الحجم الفعلي» في نافذة الطباعة، أو احفظه PDF.</p>
      </div>
      {printing && createPortal(
        <div className="print-root card-print" dir="rtl">
          <StudentIdCard student={student} photo={photo} qr={qr} />
        </div>,
        document.body,
      )}
    </div>
  );
}
