import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Copy, KeyRound, Pencil, Plus, Search, ShieldCheck, UserCog, UserX } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Badge, Button, Card, EmptyState, ErrorState, Input, LinkButton, Modal, PageLoader, Pagination, Select, Spinner, Textarea, cx, useToast,
} from '../../components/ui';
import { api, fetchBlobUrl, toQuery, type ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { ReportActions, fetchAllPages } from '../../components/ReportActions';
import { StudentCardPanel } from '../../components/StudentCard';
import { COMMITTEES, GOVERNORATES, LEVELS, ROLE_HINTS, ROLE_LABELS, STATUS_LABELS, formatDate, levelLabel, normalizeDigits } from '../../lib/format';
import type { AdminUser, ApplicationDetail, ApplicationListItem, ApplicationStatus, Paged, UserRole } from '../../lib/types';
import { AdminTitle } from './AdminLayout';
import { useManagedColleges } from './Content';

const STATUS_TONE: Record<ApplicationStatus, 'amber' | 'green' | 'brand' | 'gold'> = {
  Pending: 'amber', Approved: 'green', Rejected: 'brand', NeedsChanges: 'gold',
};

function useDebounced(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative min-w-52 flex-1">
      <span className="sr-only">بحث</span>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-ink-300 bg-white pe-3 ps-9 text-sm focus:border-flame-500 focus:outline-none focus:ring-4 focus:ring-flame-500/15" />
    </label>
  );
}

const selectClass = 'h-10 rounded-xl border border-ink-300 bg-white px-3 text-sm font-semibold focus:border-flame-500 focus:outline-none';

// ---------- membership applications ----------

export function AdminApplications() {
  const { hasRole } = useAuth();
  const [search, setSearch] = useSearchParams();
  const [term, setTerm] = useState('');
  const q = useDebounced(term.trim());
  const colleges = useManagedColleges();
  const status = search.get('status') ?? '';
  const collegeId = search.get('college') ?? '';
  const page = Number(search.get('page') ?? 1);

  const set = (changes: Record<string, string>) => setSearch((current) => {
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    return next;
  }, { replace: true });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'applications', status, collegeId, q, page],
    queryFn: () => api<Paged<ApplicationListItem>>(`/api/admin/applications${toQuery({ status, collegeId, q, page, pageSize: 20 })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <AdminTitle title="طلبات العضوية" subtitle="راجع بيانات الطلاب وصور البطاقات ثم اقبل أو ارفض."
        action={<ReportActions fileName={status === 'Approved' ? 'أعضاء-الأسرة' : 'طلبات-العضوية'} build={async () => {
          const items = await fetchAllPages<ApplicationListItem>('/api/admin/applications', { status, collegeId, q });
          return {
            title: status === 'Approved' ? 'أعضاء الأسرة' : 'طلبات العضوية',
            subtitle: [status && STATUS_LABELS[status as ApplicationStatus], colleges.data?.find((c) => String(c.id) === collegeId)?.name, q && `بحث: ${q}`].filter(Boolean).join(' — '),
            sections: [{
              columns: ['الاسم', 'الرقم الجامعي', 'الكلية', 'المستوى', 'الهاتف', 'الحالة', 'تاريخ التقديم'],
              rows: items.map((a) => [a.fullName, a.studentCode, a.collegeName, levelLabel(a.level, colleges.data?.find((c) => c.id === a.collegeId)?.studySystem), a.phone, STATUS_LABELS[a.status], formatDate(a.createdAt)]),
            }],
          };
        }} />} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={term} onChange={setTerm} placeholder="ابحث بالاسم، الرقم الجامعي، الموبايل أو الرقم القومي كاملاً" />
        <select aria-label="الحالة" className={selectClass} value={status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        {hasRole('UniversityAdmin') && (
          <select aria-label="الكلية" className={selectClass} value={collegeId} onChange={(e) => set({ college: e.target.value })}>
            <option value="">كل الكليات</option>
            {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState title="لا توجد طلبات" text={status || q ? 'لا توجد طلبات مطابقة للتصفية الحالية.' : 'ستظهر طلبات الانضمام هنا فور تقديمها.'} />
      ) : (
        <>
          <div className="grid gap-2">
            {data.items.map((item) => (
              <Link key={item.id} to={`/admin/applications/${item.id}`} className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3.5 shadow-card transition hover:border-brand-300 hover:shadow-lift">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{item.fullName}</p>
                  <p className="truncate text-xs font-semibold text-ink-500">
                    {item.collegeName} · {levelLabel(item.level)} · <span dir="ltr">{item.studentCode}</span>
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                  <p className="mt-1 text-xs font-semibold text-ink-400">{formatDate(item.updatedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(next) => set({ page: String(next) })} />
        </>
      )}
    </>
  );
}

/** A national ID scan. It is fetched with the session token and never given a shareable URL. */
function SecureImage({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let created = '';
    fetchBlobUrl(path, controller.signal)
      .then((blob) => { created = blob; setUrl(blob); })
      .catch((error) => { if ((error as Error).name !== 'AbortError') setFailed(true); });
    return () => {
      controller.abort();
      if (created) URL.revokeObjectURL(created);
    };
  }, [path]);

  return (
    <figure>
      <figcaption className="mb-1.5 text-sm font-bold text-ink-700">{label}</figcaption>
      <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-ink-100">
        {failed ? <span className="text-sm font-semibold text-ink-500">تعذر تحميل الصورة</span>
          : url ? <button type="button" onClick={() => setZoom(true)} className="size-full" aria-label={`تكبير ${label}`}><img src={url} alt={label} className="size-full object-contain" /></button>
          : <Spinner />}
      </div>
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 animate-fade" onClick={() => setZoom(false)} role="dialog" aria-label={label}>
          <img src={url} alt={label} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </figure>
  );
}

function Row({ label, children, ltr }: { label: string; children: ReactNode; ltr?: boolean }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-ink-100 py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm font-bold text-ink-500">{label}</dt>
      <dd className={cx('min-w-0 whitespace-pre-line font-semibold text-ink-900', ltr && 'text-start')} dir={ltr ? 'ltr' : undefined}>{children}</dd>
    </div>
  );
}

type EditForm = {
  fullName: string; nationalId: string; studentCode: string; collegeId: string; department: string; level: string;
  phone: string; whatsApp: string; email: string; governorate: string; city: string; address: string;
  preferredCommittee: string; skills: string; previousActivities: string; motivation: string;
};

/** Lets a reviewer correct what the student entered. The decision and the ID scans are left as they are. */
function EditApplication({ data, onClose }: { data: ApplicationDetail; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const colleges = useManagedColleges();
  const [form, setForm] = useState<EditForm>({
    fullName: data.fullName, nationalId: data.nationalId ?? '', studentCode: data.studentCode, collegeId: String(data.collegeId),
    department: data.department ?? '', level: String(data.level), phone: data.phone, whatsApp: data.whatsApp ?? '', email: data.email,
    governorate: data.governorate, city: data.city ?? '', address: data.address, preferredCommittee: data.preferredCommittee ?? '',
    skills: data.skills ?? '', previousActivities: data.previousActivities ?? '', motivation: data.motivation ?? '',
  });
  const set = (key: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const setDigits = (key: keyof EditForm, max: number) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, max) }));

  const save = useMutation({
    mutationFn: () => api(`/api/admin/applications/${data.id}`, {
      method: 'PUT',
      body: {
        ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || null])),
        collegeId: Number(form.collegeId),
        level: Number(form.level),
      },
    }),
    onSuccess: () => {
      toast('تم حفظ التعديلات.');
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
  });

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="grid gap-4" noValidate>
      {save.error && <Alert>{(save.error as ApiError).message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Input label="الاسم رباعي" required value={form.fullName} onChange={set('fullName')} /></div>
        <Input label="الرقم القومي" required dir="ltr" inputMode="numeric" value={form.nationalId} onChange={setDigits('nationalId', 14)} />
        <Input label="الرقم الجامعي" required dir="ltr" value={form.studentCode} onChange={set('studentCode')} />
        <Select label="الكلية" required value={form.collegeId} onChange={set('collegeId')}>
          {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          {!colleges.data && <option value={form.collegeId}>{data.collegeName}</option>}
        </Select>
        <Select label="المستوى" required value={form.level} onChange={set('level')}>
          {LEVELS.map((name, i) => <option key={name} value={i + 1}>المستوى {name}</option>)}
        </Select>
        <Input label="القسم / الشعبة" value={form.department} onChange={set('department')} />
        <Input label="الموبايل" required dir="ltr" inputMode="numeric" value={form.phone} onChange={setDigits('phone', 11)} />
        <Input label="الواتساب" dir="ltr" inputMode="numeric" value={form.whatsApp} onChange={setDigits('whatsApp', 11)} />
        <Input label="البريد الإلكتروني" required type="email" dir="ltr" value={form.email} onChange={set('email')} />
        <Select label="المحافظة" required value={form.governorate} onChange={set('governorate')}>
          {GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
        </Select>
        <Input label="المدينة / المركز" value={form.city} onChange={set('city')} />
        <div className="sm:col-span-2"><Input label="العنوان" required value={form.address} onChange={set('address')} /></div>
        <div className="sm:col-span-2">
          <Select label="اللجنة المفضلة" value={form.preferredCommittee} onChange={set('preferredCommittee')}>
            <option value="">بدون تحديد</option>
            {COMMITTEES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <Textarea label="المهارات" value={form.skills} onChange={set('skills')} maxLength={1000} />
        <Textarea label="أنشطة سابقة" value={form.previousActivities} onChange={set('previousActivities')} maxLength={1000} />
        <div className="sm:col-span-2"><Textarea label="سبب الانضمام" value={form.motivation} onChange={set('motivation')} maxLength={1500} /></div>
      </div>
      <p className="text-xs text-ink-500">التعديل لا يغيّر قرار الطلب ولا صور البطاقة، ويُسجَّل في سجل العمليات.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={save.isPending}>حفظ التعديلات</Button>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
      </div>
    </form>
  );
}

export function ApplicationDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [decision, setDecision] = useState<ApplicationStatus | null>(null);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['admin', 'application', id],
    queryFn: () => api<ApplicationDetail>(`/api/admin/applications/${id}`),
    retry: false,
  });
  const review = useMutation({
    mutationFn: () => api(`/api/admin/applications/${id}/review`, { method: 'POST', body: { status: decision, note: note.trim() || null } }),
    onSuccess: () => {
      toast('تم حفظ القرار.');
      setDecision(null);
      setNote('');
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  if (isPending) return <PageLoader />;
  if (error) {
    return (error as ApiError).status === 404
      ? <EmptyState title="الطلب غير موجود" text="ربما لا يتبع كليتك أو تم حذفه." action={<LinkButton to="/admin/applications">رجوع للطلبات</LinkButton>} />
      : <ErrorState onRetry={() => void refetch()} />;
  }

  const base = `/api/admin/applications/${data.id}/files`;
  const labels: Record<string, string> = { Approved: 'قبول الطلب', Rejected: 'رفض الطلب', NeedsChanges: 'طلب تعديل' };

  return (
    <>
      <Link to="/admin/applications" className="mb-2 flex items-center gap-1 text-sm font-bold text-ink-500 hover:text-brand-700"><ArrowRight className="size-4" /> رجوع للطلبات</Link>
      <AdminTitle title={data.fullName} subtitle={`${data.collegeName} — ${levelLabel(data.level)}`} action={<div className="flex flex-wrap items-center gap-2"><Badge tone={STATUS_TONE[data.status]}>{STATUS_LABELS[data.status]}</Badge>{data.status === 'Approved' && hasRole('CollegeAdmin') && <LinkButton to={`/admin/users?appoint=${data.id}`} variant="outline" size="sm"><ShieldCheck className="size-4" /> تعيين مسؤولاً</LinkButton>}</div>} />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-5">
          <Card className="p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">البيانات</h2>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="size-4" /> تعديل البيانات</Button>
            </div>
            <dl>
              <Row label="الرقم الجامعي" ltr>{data.studentCode}</Row>
              <Row label="الرقم القومي" ltr>{data.nationalId ?? 'تعذر فك التشفير'}</Row>
              <Row label="تاريخ الميلاد" ltr>{data.birthDate}</Row>
              <Row label="النوع">{data.gender === 'Male' ? 'ذكر' : 'أنثى'}</Row>
              <Row label="القسم / البرنامج">{data.department}</Row>
              <Row label="الموبايل" ltr><a href={`tel:${data.phone}`} className="text-brand-700 hover:underline">{data.phone}</a></Row>
              <Row label="الواتساب" ltr>{data.whatsApp}</Row>
              <Row label="البريد الإلكتروني" ltr>{data.email}</Row>
              <Row label="بريد الحساب القديم" ltr>{data.accountEmail && data.accountEmail !== data.email ? data.accountEmail : ''}</Row>
              <Row label="العنوان">{[data.governorate, data.city, data.address].filter(Boolean).join(' — ')}</Row>
              <Row label="اللجنة المفضلة">{data.preferredCommittee}</Row>
              <Row label="المهارات">{data.skills}</Row>
              <Row label="أنشطة سابقة">{data.previousActivities}</Row>
              <Row label="سبب الانضمام">{data.motivation}</Row>
              <Row label="تاريخ التقديم">{formatDate(data.createdAt)}</Row>
              <Row label="رقم العضوية" ltr>{data.membershipNumber}</Row>
            </dl>
          </Card>

          {data.reviewedAt && (
            <Card className="p-5">
              <h2 className="text-lg font-extrabold">آخر مراجعة</h2>
              <p className="mt-1 text-ink-600">{data.reviewedByName ?? 'مسؤول'} — {formatDate(data.reviewedAt)}</p>
              {data.reviewNote && <p className="mt-2 whitespace-pre-line rounded-xl bg-sand p-3 font-semibold">{data.reviewNote}</p>}
            </Card>
          )}
        </div>

        <div className="grid content-start gap-5">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><ShieldCheck className="size-5 text-emerald-600" /> صور البطاقة</h2>
            <div className="grid gap-4">
              <SecureImage path={`${base}/front`} label="وجه البطاقة" />
              <SecureImage path={`${base}/back`} label="ظهر البطاقة" />
              {data.hasPhoto && <SecureImage path={`${base}/photo`} label="الصورة الشخصية" />}
            </div>
            <p className="mt-3 text-xs text-ink-500">بيانات سرّية. يُسجَّل كل اطلاع على هذا الطلب في سجل العمليات.</p>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-extrabold">القرار</h2>
            <div className="mt-3 grid gap-2">
              <Button onClick={() => setDecision('Approved')} disabled={data.status === 'Approved'} className="!bg-emerald-600 hover:!bg-emerald-700">قبول الطلب</Button>
              <Button variant="outline" onClick={() => setDecision('NeedsChanges')}>طلب تعديل من الطالب</Button>
              <Button variant="danger" onClick={() => setDecision('Rejected')} disabled={data.status === 'Rejected'}>رفض الطلب</Button>
            </div>
          </Card>
        </div>
      </div>

      {data.status === 'Approved' && (
        <Card className="mt-5 p-5">
          <h2 className="text-lg font-extrabold">كارنيه العضو</h2>
          <p className="mb-5 mt-1 text-sm text-ink-600">جاهز للطباعة. الكود اللي على الظهر هو كود حضور العضو في الفعاليات.</p>
          <StudentCardPanel student={data} photoPath={data.hasPhoto ? `${base}/photo` : null} codePath={`/api/admin/applications/${data.id}/card-code`} />
        </Card>
      )}

      <Modal open={editing} title="تعديل بيانات الطالب" onClose={() => setEditing(false)} wide>
        {editing && <EditApplication data={data} onClose={() => setEditing(false)} />}
      </Modal>

      <Modal open={!!decision} title={decision ? labels[decision] : ''} onClose={() => setDecision(null)}>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); review.mutate(); }} className="grid gap-4">
          {review.error && <Alert>{(review.error as ApiError).message}</Alert>}
          <Textarea
            label={decision === 'Approved' ? 'ملاحظة للطالب (اختياري)' : 'السبب (يظهر للطالب)'}
            required={decision !== 'Approved'}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder={decision === 'NeedsChanges' ? 'مثال: صورة ظهر البطاقة غير واضحة، برجاء إعادة رفعها.' : ''}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDecision(null)}>تراجع</Button>
            <Button type="submit" loading={review.isPending} disabled={decision !== 'Approved' && !note.trim()}>تأكيد</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ---------- staff and roles ----------

function TemporaryPassword({ password, emailSent, onClose }: { password: string | null; emailSent: boolean; onClose: () => void }) {
  const toast = useToast();
  return (
    <Modal open={!!password} title="كلمة المرور المؤقتة" onClose={onClose}>
      {emailSent && <Alert tone="success">أُرسل بريد إلى صاحب الحساب فيه رابط لاختيار كلمة المرور بنفسه. كلمة المرور المؤقتة أدناه احتياطية إن لم يصله البريد.</Alert>}
      <Alert tone="warning">انسخها الآن وسلّمها لصاحب الحساب بشكل آمن. لن تظهر مرة أخرى، وسيُطلب منه تغييرها عند أول دخول.</Alert>
      <div className="mt-4 flex items-center gap-2">
        <code dir="ltr" className="flex-1 select-all rounded-xl bg-ink-900 px-4 py-3 text-center text-xl font-black tracking-widest text-gold-300">{password}</code>
        <Button variant="outline" onClick={() => { void navigator.clipboard?.writeText(password ?? ''); toast('تم النسخ.'); }} aria-label="نسخ"><Copy className="size-4" /></Button>
      </div>
      <div className="mt-5 text-end"><Button onClick={onClose}>تم</Button></div>
    </Modal>
  );
}

function RoleFields({ role, setRole, collegeId, setCollegeId, roles }: {
  role: UserRole | ''; setRole: (role: UserRole) => void; collegeId: string; setCollegeId: (id: string) => void; roles: UserRole[];
}) {
  const { hasRole } = useAuth();
  const colleges = useManagedColleges();
  const scoped = role === 'CollegeAdmin' || role === 'CollegeEditor';
  return (
    <>
      <Select label="الدور" required value={role} onChange={(e) => setRole(e.target.value as UserRole)} hint={role ? ROLE_HINTS[role] : undefined}>
        <option value="" disabled>اختر الدور</option>
        {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </Select>
      {scoped && hasRole('UniversityAdmin') && (
        <Select label="الكلية" required value={collegeId} onChange={(e) => setCollegeId(e.target.value)}>
          <option value="">اختر الكلية</option>
          {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      )}
    </>
  );
}

/** Pick an approved member of the family to appoint: fills in the name, email and college from their application. */
function MemberPicker({ onPick }: { onPick: (member: { fullName: string; email: string; collegeId: number }) => void }) {
  const [term, setTerm] = useState('');
  const q = useDebounced(term.trim());
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: ['admin', 'member-picker', q],
    queryFn: () => api<Paged<ApplicationListItem>>(`/api/admin/applications${toQuery({ status: 'Approved', q, pageSize: 6 })}`),
    enabled: q.length >= 2,
  });
  const pick = async (item: ApplicationListItem) => {
    setBusy(true);
    try {
      const detail = await api<ApplicationDetail>(`/api/admin/applications/${item.id}`);
      onPick({ fullName: detail.fullName, email: detail.email, collegeId: detail.collegeId });
      setTerm('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl bg-ink-50 p-3">
      <Input label="تعيين عضو من الأسرة" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ابحث باسم العضو أو رقمه الجامعي" hint="يملأ الاسم والبريد والكلية من طلب عضويته المقبول." />
      {q.length >= 2 && (
        <ul className="mt-2 grid gap-1">
          {list.isPending ? <li className="text-sm text-ink-500">جارٍ البحث…</li>
            : list.data && list.data.items.length === 0 ? <li className="text-sm text-ink-500">لا يوجد عضو مقبول بهذا الاسم.</li>
            : list.data?.items.map((item) => (
              <li key={item.id}>
                <button type="button" disabled={busy} onClick={() => void pick(item)} className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-start hover:border-brand-400">
                  <span className="block font-extrabold">{item.fullName}</span>
                  <span className="block text-xs font-semibold text-ink-500">{item.collegeName} · {item.studentCode}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export function AdminUsers() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useSearchParams();
  const [term, setTerm] = useState('');
  const q = useDebounced(term.trim());
  const staffOnly = search.get('staff') !== '0';
  const page = Number(search.get('page') ?? 1);
  const isUniversity = hasRole('UniversityAdmin');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', role: '' as UserRole | '', collegeId: '' });
  const appoint = search.get('appoint');
  useEffect(() => {
    if (!appoint) return;
    api<ApplicationDetail>(`/api/admin/applications/${appoint}`)
      .then((a) => { setForm({ fullName: a.fullName, email: a.email, role: '', collegeId: String(a.collegeId) }); setCreating(true); })
      .catch(() => toast('تعذر تحميل بيانات العضو.', 'error'))
      .finally(() => setSearch((c) => { const n = new URLSearchParams(c); n.delete('appoint'); return n; }, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appoint]);

  const roles = useQuery({ queryKey: ['admin', 'assignable-roles'], queryFn: () => api<UserRole[]>('/api/admin/users/assignable-roles'), staleTime: 300_000 });
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', staffOnly, q, page],
    queryFn: () => api<Paged<AdminUser>>(`/api/admin/users${toQuery({ staffOnly, q, page, pageSize: 20 })}`),
    placeholderData: keepPreviousData,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });
  const fail = (error: unknown) => toast((error as ApiError).message, 'error');

  const create = useMutation({
    mutationFn: () => api<{ temporaryPassword: string | null; promoted: boolean; emailSent: boolean }>('/api/admin/users', {
      method: 'POST', body: { fullName: form.fullName.trim(), email: form.email.trim(), role: form.role, collegeId: form.collegeId ? Number(form.collegeId) : null },
    }),
    onSuccess: (result) => {
      setCreating(false);
      setForm({ fullName: '', email: '', role: '', collegeId: '' });
      if (result.temporaryPassword) { setEmailSent(result.emailSent); setPassword(result.temporaryPassword); }
      else toast('تمت ترقية الحساب الموجود ومنحه الدور.');
      refresh();
    },
  });
  const changeRole = useMutation({
    mutationFn: () => api(`/api/admin/users/${editing!.id}/role`, { method: 'PUT', body: { role: form.role, collegeId: form.collegeId ? Number(form.collegeId) : null } }),
    onSuccess: () => { setEditing(null); toast('تم تحديث الدور.'); refresh(); },
  });
  const setActive = useMutation({
    mutationFn: (user: AdminUser) => api(`/api/admin/users/${user.id}/active`, { method: 'PUT', body: { isActive: !user.isActive } }),
    onSuccess: (_, user) => { toast(user.isActive ? 'تم إيقاف الحساب.' : 'تم تفعيل الحساب.'); refresh(); },
    onError: fail,
  });
  const reset = useMutation({
    mutationFn: (user: AdminUser) => api<{ temporaryPassword: string; emailSent: boolean }>(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' }),
    onSuccess: (result) => { setEmailSent(result.emailSent); setPassword(result.temporaryPassword); },
    onError: fail,
  });

  const openEdit = (user: AdminUser) => {
    setForm({ fullName: user.fullName, email: user.email, role: user.role, collegeId: user.collegeId ? String(user.collegeId) : '' });
    changeRole.reset();
    setEditing(user);
  };
  const needsCollege = (form.role === 'CollegeAdmin' || form.role === 'CollegeEditor') && isUniversity && !form.collegeId;

  return (
    <>
      <AdminTitle
        title="المسؤولون والصلاحيات"
        subtitle={isUniversity ? 'عيّن مسؤولي الكليات والمحررين وتحكم في صلاحياتهم.' : 'أضف محرري كليتك وتحكم في حساباتهم.'}
        action={<div className="flex flex-wrap gap-2">
          <ReportActions fileName={staffOnly ? 'المسؤولون' : 'حسابات-الطلاب'} build={async () => {
            const items = await fetchAllPages<AdminUser>('/api/admin/users', { staffOnly, q });
            return {
              title: staffOnly ? 'المسؤولون والصلاحيات' : 'حسابات الطلاب',
              subtitle: q ? `بحث: ${q}` : undefined,
              sections: [{
                columns: ['الاسم', 'البريد الإلكتروني', 'الصلاحية', 'الكلية', 'الحالة', 'آخر دخول', 'تاريخ الإنشاء'],
                rows: items.map((u) => [u.fullName, u.email, ROLE_LABELS[u.role], u.collegeName, u.isActive ? 'مفعّل' : 'موقوف', u.lastLoginAt ? formatDate(u.lastLoginAt) : 'لم يدخل بعد', formatDate(u.createdAt)]),
              }],
            };
          }} />
          <Button onClick={() => { create.reset(); setForm({ fullName: '', email: '', role: '', collegeId: '' }); setCreating(true); }}><Plus className="size-4" /> إضافة مسؤول</Button>
        </div>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={term} onChange={setTerm} placeholder="ابحث بالاسم أو البريد الإلكتروني" />
        {isUniversity && (
          <select aria-label="نوع الحسابات" className={selectClass} value={staffOnly ? '1' : '0'} onChange={(e) => setSearch(e.target.value === '0' ? { staff: '0' } : {}, { replace: true })}>
            <option value="1">المسؤولون فقط</option>
            <option value="0">كل الحسابات (مع الطلاب)</option>
          </select>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-2">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-18" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState title="لا توجد حسابات مطابقة" />
      ) : (
        <>
          <div className="grid gap-2">
            {data.items.map((user) => (
              <Card key={user.id} className={cx('flex flex-wrap items-center gap-3 p-3.5', !user.isActive && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold">{user.fullName}</span>
                    <Badge tone={user.role === 'Student' ? 'neutral' : user.role === 'SuperAdmin' ? 'dark' : 'brand'}>{ROLE_LABELS[user.role]}</Badge>
                    {user.collegeName && <Badge>{user.collegeName}</Badge>}
                    {!user.isActive && <Badge tone="amber">موقوف</Badge>}
                    {user.mustChangePassword && <Badge tone="gold">كلمة مرور مؤقتة</Badge>}
                  </div>
                  <p className="truncate text-xs font-semibold text-ink-500" dir="ltr">{user.email}</p>
                </div>
                {user.canManage ? (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user)}><UserCog className="size-4" /> الدور</Button>
                    <Button variant="ghost" size="sm" onClick={() => reset.mutate(user)} loading={reset.isPending && reset.variables?.id === user.id}><KeyRound className="size-4" /> كلمة المرور</Button>
                    <Button variant={user.isActive ? 'danger' : 'outline'} size="sm" onClick={() => setActive.mutate(user)} loading={setActive.isPending && setActive.variables?.id === user.id}>
                      <UserX className="size-4" /> {user.isActive ? 'إيقاف' : 'تفعيل'}
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-ink-400">للعرض فقط</span>
                )}
              </Card>
            ))}
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(next) => setSearch((c) => { const n = new URLSearchParams(c); n.set('page', String(next)); return n; })} />
        </>
      )}

      <Modal open={creating} title="إضافة مسؤول" onClose={() => setCreating(false)}>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          {create.error && <Alert>{(create.error as ApiError).message}</Alert>}
          <MemberPicker onPick={(m) => setForm((f) => ({ ...f, fullName: m.fullName, email: m.email, collegeId: isUniversity ? String(m.collegeId) : f.collegeId }))} />
          <Input label="الاسم بالكامل" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          <Input label="البريد الإلكتروني" type="email" dir="ltr" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} hint="يُنشأ له حساب إداري ويصله بريد ليختار كلمة المرور. اكتبه يدوياً لمن ليس عضواً بالأسرة." />
          <RoleFields role={form.role} setRole={(role) => setForm((f) => ({ ...f, role }))} collegeId={form.collegeId} setCollegeId={(collegeId) => setForm((f) => ({ ...f, collegeId }))} roles={roles.data ?? []} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>تراجع</Button>
            <Button type="submit" loading={create.isPending} disabled={form.fullName.trim().length < 5 || !form.email || !form.role || needsCollege}>إضافة</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} title={`تغيير دور: ${editing?.fullName ?? ''}`} onClose={() => setEditing(null)}>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); changeRole.mutate(); }}>
          {changeRole.error && <Alert>{(changeRole.error as ApiError).message}</Alert>}
          <RoleFields role={form.role} setRole={(role) => setForm((f) => ({ ...f, role }))} collegeId={form.collegeId} setCollegeId={(collegeId) => setForm((f) => ({ ...f, collegeId }))} roles={[...(roles.data ?? []), 'Student']} />
          {form.role === 'Student' && <Alert tone="warning">سيتم سحب كل الصلاحيات الإدارية من هذا الحساب فوراً.</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>تراجع</Button>
            <Button type="submit" loading={changeRole.isPending} disabled={!form.role || needsCollege}>حفظ</Button>
          </div>
        </form>
      </Modal>

      <TemporaryPassword password={password} emailSent={emailSent} onClose={() => setPassword(null)} />
    </>
  );
}
