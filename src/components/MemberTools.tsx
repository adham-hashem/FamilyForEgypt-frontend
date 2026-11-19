import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileUp, Mail, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type ApiError } from '../lib/api';
import { academicYearLabel, currentAcademicYear, formatNumber } from '../lib/format';
import type { College } from '../lib/types';
import { buildXlsx, downloadBlob } from '../lib/xlsx';
import { readSpreadsheet } from '../lib/xlsxRead';
import { Alert, Button, Input, Modal, Select, Textarea, useToast } from './ui';

// ---------- renewal for a new academic year ----------

/** Renews every approved member (of the chosen college) for an academic year, so their cards carry the new year. */
export function RenewMembers({ collegeId, collegeName }: { collegeId: string; collegeName?: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const thisYear = currentAcademicYear();
  const [year, setYear] = useState(thisYear);
  const renew = useMutation({
    mutationFn: () => api<{ renewed: number }>('/api/admin/members/renew', { method: 'POST', body: { academicYear: year, collegeId: collegeId ? Number(collegeId) : null } }),
    onSuccess: (result) => {
      toast(result.renewed > 0 ? `تم تجديد عضوية ${formatNumber(result.renewed)} عضو.` : 'كل الأعضاء مجدَّدون بالفعل لهذا العام.');
      void queryClient.invalidateQueries();
      setOpen(false);
    },
  });
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { renew.reset(); setOpen(true); }}><RefreshCw className="size-4" /> تجديد العضوية</Button>
      <Modal open={open} title="تجديد العضوية لعام جامعي" onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <p className="text-ink-600">
            يُجدَّد كل الأعضاء المقبولين في <strong>{collegeName || 'كل الكليات'}</strong> للعام الجامعي المختار، فيتغير العام المكتوب على كارنيهاتهم. من جُدِّدت عضويتهم لنفس العام أو أحدث لا يتأثرون.
          </p>
          {renew.error && <Alert>{(renew.error as ApiError).message}</Alert>}
          <Select label="العام الجامعي" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear + 1, thisYear, thisYear - 1].map((y) => <option key={y} value={y}>{academicYearLabel(y)}</option>)}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => renew.mutate()} loading={renew.isPending}>تجديد</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ---------- a message to the members ----------

/** An email to the approved members of a college and level, or of the whole family. */
export function MessageMembers({ colleges, collegeId }: { colleges: College[] | undefined; collegeId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', college: collegeId, level: '' });
  useEffect(() => { if (open) setForm((f) => ({ ...f, college: collegeId })); }, [open, collegeId]);
  const university = colleges && colleges.length > 1;
  const chosen = colleges?.find((c) => String(c.id) === form.college);

  const filter = { collegeId: form.college ? Number(form.college) : null, level: form.level ? Number(form.level) : null };
  const count = useQuery({
    queryKey: ['admin', 'message-count', filter],
    queryFn: () => api<{ recipients: number }>('/api/admin/members/message', { method: 'POST', body: { subject: 'xxx', body: 'xxxxx', ...filter, countOnly: true } }),
    enabled: open,
  });
  const send = useMutation({
    mutationFn: () => api<{ recipients: number }>('/api/admin/members/message', { method: 'POST', body: { subject: form.subject.trim(), body: form.body.trim(), ...filter } }),
    onSuccess: (result) => {
      toast(`تم إرسال الرسالة إلى ${formatNumber(result.recipients)} عضو.`);
      setOpen(false);
      setForm((f) => ({ ...f, subject: '', body: '' }));
    },
  });
  const levels = chosen?.levelsCount ?? Math.max(0, ...(colleges ?? []).map((c) => c.levelsCount));

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { send.reset(); setOpen(true); }}><Mail className="size-4" /> رسالة للأعضاء</Button>
      <Modal open={open} title="رسالة بريد للأعضاء" onClose={() => setOpen(false)} wide>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          {send.error && <Alert>{(send.error as ApiError).message}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            {university && (
              <Select label="الكلية" value={form.college} onChange={(e) => setForm((f) => ({ ...f, college: e.target.value, level: '' }))}>
                <option value="">كل الكليات</option>
                {colleges?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            <Select label="المستوى" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
              <option value="">كل المستويات</option>
              {Array.from({ length: levels }, (_, i) => <option key={i + 1} value={i + 1}>المستوى {i + 1}</option>)}
            </Select>
          </div>
          <Input label="العنوان" required maxLength={150} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          <Textarea label="الرسالة" required rows={7} maxLength={5000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} hint="تبدأ كل رسالة بـ «أهلاً» واسم العضو." />
          <p className="text-sm font-bold text-ink-600">
            {count.isPending ? 'جارٍ حساب المستلمين…' : `ستصل الرسالة إلى ${formatNumber(count.data?.recipients ?? 0)} عضو.`}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" loading={send.isPending} disabled={form.subject.trim().length < 3 || form.body.trim().length < 5 || !count.data?.recipients}>إرسال</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ---------- importing former members ----------

const COLUMNS = ['الاسم', 'الرقم الجامعي', 'الرقم القومي', 'الكلية', 'المستوى', 'الموبايل', 'البريد الإلكتروني', 'القسم', 'المحافظة'];

/** The column that holds each field, found by words in the header so a slightly different heading still works. */
const FIELD_WORDS: Record<string, string[]> = {
  fullName: ['اسم', 'name'], studentCode: ['جامع', 'code'], nationalId: ['قومي', 'national'], college: ['كلية', 'college'],
  level: ['مستوى', 'فرقة', 'level'], phone: ['موبايل', 'هاتف', 'تليفون', 'phone', 'mobile'], email: ['بريد', 'mail'], department: ['قسم', 'شعبة', 'department'], governorate: ['محافظ', 'governorate'],
};

interface ImportResultView { imported: number; skipped: { row: number; name: string; reason: string }[] }

/** Brings former members in from an Excel or CSV list, as approved members with membership numbers and cards. */
export function ImportMembers() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [readError, setReadError] = useState('');
  const [result, setResult] = useState<ImportResultView | null>(null);

  const reset = () => { setRows([]); setFileName(''); setReadError(''); setResult(null); };

  const pick = async (file: File | undefined) => {
    reset();
    if (!file) return;
    setFileName(file.name);
    try {
      const table = await readSpreadsheet(file);
      if (table.length < 2) throw new Error('الملف فارغ. ضع العناوين في الصف الأول والبيانات بعده.');
      const header = table[0].map((h) => h.toLowerCase());
      const index = Object.fromEntries(Object.entries(FIELD_WORDS).map(([field, words]) => [field, header.findIndex((h) => words.some((w) => h.includes(w)))]));
      const missing = ['fullName', 'studentCode', 'nationalId', 'college', 'level', 'phone', 'email'].filter((f) => index[f] < 0);
      if (missing.length) throw new Error('أعمدة ناقصة في الملف. حمّل النموذج واستخدم نفس العناوين.');
      setRows(table.slice(1).map((r) => {
        const cell = (field: string) => (index[field] >= 0 ? (r[index[field]] ?? '').trim() : '');
        let phone = cell('phone').replace(/\s/g, '');
        if (/^1[0125]\d{8}$/.test(phone)) phone = `0${phone}`; // Excel drops the leading zero of a number
        return { fullName: cell('fullName'), studentCode: cell('studentCode'), nationalId: cell('nationalId').replace(/\.0+$/, ''), college: cell('college'), level: cell('level'), phone, email: cell('email'), department: cell('department'), governorate: cell('governorate') };
      }));
    } catch (error) {
      setReadError((error as Error).message || 'تعذر قراءة الملف.');
    }
  };

  const importRows = useMutation({
    mutationFn: async () => {
      // Sent in batches of 500, the most the server takes at once.
      const total: ImportResultView = { imported: 0, skipped: [] };
      for (let from = 0; from < rows.length; from += 500) {
        const part = await api<ImportResultView>('/api/admin/members/import', {
          method: 'POST',
          body: { rows: rows.slice(from, from + 500).map((r) => ({ ...r, level: Number(r.level) || 0 })) },
        });
        total.imported += part.imported;
        total.skipped.push(...part.skipped.map((s) => ({ ...s, row: s.row + from })));
      }
      return total;
    },
    onSuccess: (r) => { setResult(r); toast(`تم استيراد ${formatNumber(r.imported)} عضو.`); void queryClient.invalidateQueries(); },
  });

  const template = () => downloadBlob(buildXlsx([{
    name: 'الأعضاء', columns: COLUMNS,
    rows: [['اسم الطالب الرباعي', 'CS2024001', '29901011234567', 'اكتب اسم الكلية كما يظهر في الموقع', 1, '01012345678', 'student@example.com', 'علوم الحاسب', 'دمياط']],
  }]), 'نموذج-استيراد-الأعضاء.xlsx');

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { reset(); importRows.reset(); setOpen(true); }}><FileUp className="size-4" /> استيراد أعضاء</Button>
      <Modal open={open} title="استيراد أعضاء سابقين من ملف" onClose={() => setOpen(false)} wide>
        <div className="grid gap-4">
          <p className="text-ink-600">
            للأعضاء الذين انضموا قبل الموقع: ارفع ملف Excel أو CSV، فيُسجَّل كل واحد عضواً مقبولاً برقم عضوية وكارنيه (بدون صور البطاقة). الاسم المكتوب للكلية يجب أن يطابق اسمها في الموقع، والصفوف المكررة أو الخاطئة تُتخطى ويظهر سببها.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={template}>تحميل النموذج</Button>
            <input type="file" accept=".xlsx,.csv" aria-label="ملف الأعضاء" onChange={(e) => void pick(e.target.files?.[0])} className="text-sm font-semibold" />
          </div>
          {readError && <Alert>{readError}</Alert>}
          {importRows.error && <Alert>{(importRows.error as ApiError).message}</Alert>}

          {rows.length > 0 && !result && (
            <>
              <p className="font-bold">{fileName}: {formatNumber(rows.length)} صف جاهز للاستيراد.</p>
              <div className="max-h-56 overflow-auto rounded-xl border border-ink-200">
                <table className="w-full text-sm">
                  <thead><tr className="bg-ink-50 text-start"><th className="p-2 text-start">الاسم</th><th className="p-2 text-start">الكلية</th><th className="p-2 text-start">المستوى</th><th className="p-2 text-start">الرقم الجامعي</th></tr></thead>
                  <tbody>{rows.slice(0, 8).map((r, i) => <tr key={i} className="border-t border-ink-100"><td className="p-2">{r.fullName}</td><td className="p-2">{r.college}</td><td className="p-2">{r.level}</td><td className="p-2" dir="ltr">{r.studentCode}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="flex justify-end"><Button onClick={() => importRows.mutate()} loading={importRows.isPending}>استيراد {formatNumber(rows.length)} عضو</Button></div>
            </>
          )}

          {result && (
            <div className="grid gap-3">
              <Alert tone="success">تم استيراد {formatNumber(result.imported)} عضو{result.skipped.length ? `، وتخطي ${formatNumber(result.skipped.length)} صف` : ''}.</Alert>
              {result.skipped.length > 0 && (
                <ul className="max-h-48 overflow-auto rounded-xl border border-ink-200 text-sm">
                  {result.skipped.map((s, i) => <li key={i} className="border-b border-ink-100 p-2 last:border-0"><strong>الصف {s.row + 1}</strong> — {s.name || 'بدون اسم'}: {s.reason}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

