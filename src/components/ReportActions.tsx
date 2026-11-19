import { FileSpreadsheet, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, toQuery, type ApiError } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { Paged } from '../lib/types';
import { buildXlsx, downloadBlob, type Cell, type Sheet } from '../lib/xlsx';
import { FlagName } from './FlagName';
import { Button, useToast } from './ui';
import './report.css';

/** What a report holds: one or more tables under a title. Printed as a page, or saved as an Excel file. */
export interface ReportDoc {
  title: string;
  /** Shown under the title: the filters used, for example "العام الجامعي 2026/2027 — الفصل الأول". */
  subtitle?: string;
  sections: { heading?: string; columns: string[]; rows: Cell[][] }[];
}

/** Every page of a paged admin list (fifty rows at a time), up to 5,000 rows. */
export async function fetchAllPages<T>(path: string, params: Record<string, string | number | boolean | undefined | null> = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await api<Paged<T>>(`${path}${toQuery({ ...params, page, pageSize: 50 })}`);
    items.push(...result.items);
    if (page * result.pageSize >= result.total) break;
  }
  return items;
}

const cellText = (value: Cell) => (value === null || value === undefined ? '' : String(value));

function ReportSheet({ doc }: { doc: ReportDoc }) {
  const wide = doc.sections.some((section) => section.columns.length > 6);
  return createPortal(
    <div className={`print-root report-print ${wide ? 'report-landscape' : 'report-portrait'}`} dir="rtl">
      <header className="report-head">
        <img src="/brand/logo.webp" alt="" />
        <div>
          <strong>أسرة طلاب <FlagName /> — جامعة دمياط</strong>
          <h1>{doc.title}</h1>
          {doc.subtitle ? <p>{doc.subtitle}</p> : null}
        </div>
        <span className="report-date">{formatDateTime(new Date().toISOString())}</span>
      </header>
      {doc.sections.map((section, index) => (
        <section key={index} className="report-section">
          {section.heading ? <h2>{section.heading} <small>({section.rows.length})</small></h2> : null}
          <table>
            <thead>
              <tr><th className="report-n">#</th>{section.columns.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {section.rows.map((row, r) => (
                <tr key={r}><td className="report-n">{r + 1}</td>{section.columns.map((_, c) => <td key={c}>{cellText(row[c])}</td>)}</tr>
              ))}
              {section.rows.length === 0 && <tr><td colSpan={section.columns.length + 1} className="report-empty">لا توجد بيانات.</td></tr>}
            </tbody>
          </table>
        </section>
      ))}
    </div>,
    document.body,
  );
}

/**
 * Two buttons for any list: print it (the browser's print dialog also saves as PDF) or download it as an
 * Excel file. The data is built when a button is pressed, so a list can load every page of its rows first.
 */
export function ReportActions({ build, fileName, disabled, size = 'sm', printLabel = 'طباعة / PDF', xlsxLabel = 'Excel' }: {
  build: () => Promise<ReportDoc>; fileName: string; disabled?: boolean; size?: 'sm' | 'md'; printLabel?: string; xlsxLabel?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<'print' | 'xlsx' | null>(null);
  const [doc, setDoc] = useState<ReportDoc | null>(null);

  // The printed copy is added under <body> only while the print dialog is open.
  useEffect(() => {
    if (!doc) return;
    const done = () => setDoc(null);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [doc]);

  const run = async (kind: 'print' | 'xlsx') => {
    setBusy(kind);
    try {
      const built = await build();
      if (kind === 'print') {
        setDoc(built);
      } else {
        const sheets: Sheet[] = built.sections.map((section, i) => ({ name: section.heading ?? built.title ?? `ورقة ${i + 1}`, columns: ['#', ...section.columns], rows: section.rows.map((row, r) => [r + 1, ...row]) }));
        downloadBlob(buildXlsx(sheets), `${fileName}.xlsx`);
      }
    } catch (error) {
      toast((error as ApiError).message || 'تعذر تجهيز التقرير.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size={size} loading={busy === 'print'} disabled={disabled || busy !== null} onClick={() => void run('print')}>
          <Printer className="size-4" /> {printLabel}
        </Button>
        <Button variant="outline" size={size} loading={busy === 'xlsx'} disabled={disabled || busy !== null} onClick={() => void run('xlsx')}>
          <FileSpreadsheet className="size-4" /> {xlsxLabel}
        </Button>
      </div>
      {doc && <ReportSheet doc={doc} />}
    </>
  );
}
