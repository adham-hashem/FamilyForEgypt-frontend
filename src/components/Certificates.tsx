import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDate } from '../lib/format';
import { FlagName } from './FlagName';
import './report.css';

/** One certificate: who gets it and what for. */
export interface Certificate {
  name: string;
  /** Under the name: the college, for example. */
  line?: string | null;
  /** The sentence of appreciation. */
  reason: string;
  /** What the certificate is called: «شهادة شكر وتقدير» by default. */
  title?: string;
}

function CertificateSheet({ items }: { items: Certificate[] }) {
  const today = formatDate(new Date().toISOString());
  return createPortal(
    <div className="print-root certificate-print" dir="rtl">
      {items.map((c, i) => (
        <section className="certificate" key={i}>
          <div className="certificate-frame">
            <img className="certificate-logo" src="/brand/logo.webp" alt="" />
            <p className="certificate-org">أسرة طلاب <FlagName /> — جامعة دمياط</p>
            <h1>{c.title ?? 'شهادة شكر وتقدير'}</h1>
            <p className="certificate-lead">تُمنح هذه الشهادة إلى</p>
            <p className="certificate-name">{c.name}</p>
            {c.line ? <p className="certificate-line">{c.line}</p> : null}
            <p className="certificate-reason">{c.reason}</p>
            <div className="certificate-foot">
              <div><span>رائد الأسرة</span></div>
              <div className="certificate-date">{today}</div>
              <div><span>رعاية الطلاب</span></div>
            </div>
          </div>
        </section>
      ))}
    </div>,
    document.body,
  );
}

/** Prints certificates: `print(items)` opens the print dialog (which also saves as PDF), one certificate per page. */
export function useCertificatePrinter() {
  const [items, setItems] = useState<Certificate[] | null>(null);

  useEffect(() => {
    if (!items) return;
    const done = () => setItems(null);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [items]);

  return { print: (list: Certificate[]) => list.length > 0 && setItems(list), sheet: items ? <CertificateSheet items={items} /> : null };
}
