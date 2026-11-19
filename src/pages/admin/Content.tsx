import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Eye, FileText, ImagePlus, Paperclip, Pencil, Plus, Star, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, ErrorState, Input, LinkButton, PageLoader, Pagination, Select, Textarea, cx, useToast,
} from '../../components/ui';
import { api, mediaUrl, toQuery, type ApiError } from '../../lib/api';
import { MAX_PICKED_IMAGE } from '../../lib/images';
import { useAuth } from '../../lib/auth';
import {
  CATEGORY_LABELS, DUE_LABELS, POST_TYPE_LABELS, TERMS, academicYearLabel, currentAcademicYear, currentTerm, formatDate, formatDateTime, periodLabel, formatSize, fromLocalInput, levelLabel, levelOptions, levelWord, toLocalInput,
} from '../../lib/format';
import type { College, Course, Paged, PostDetail, PostImage, PostListItem, PostType, Resource, ResourceCategory, ResourceFile } from '../../lib/types';
import { ReportActions, fetchAllPages } from '../../components/ReportActions';
import { DepartmentPicker } from '../../components/Departments';
import { RepeatEvent } from '../../components/RepeatEvent';
import { AdminTitle } from './AdminLayout';

const MAX_IMAGE = MAX_PICKED_IMAGE;
const MAX_DOCUMENT = 25 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];

export function useManagedColleges() {
  return useQuery({ queryKey: ['admin', 'colleges'], queryFn: () => api<College[]>('/api/admin/colleges'), staleTime: 60_000 });
}

function useFilters() {
  const [search, setSearch] = useSearchParams();
  const set = (changes: Record<string, string>) => setSearch((current) => {
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    return next;
  }, { replace: true });
  return [search, set] as const;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl border border-ink-300 bg-white px-3 text-sm font-semibold focus:border-flame-500 focus:outline-none">
      {children}
    </select>
  );
}

// ---------- posts ----------

export function AdminPosts() {
  const { hasRole } = useAuth();
  const [search, set] = useFilters();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [removing, setRemoving] = useState<PostListItem | null>(null);
  const colleges = useManagedColleges();
  const isUniversity = hasRole('UniversityAdmin');

  const params = {
    status: search.get('status') ?? '', type: search.get('type') ?? '',
    collegeId: search.get('college') === 'central' ? '' : search.get('college') ?? '',
    scope: search.get('college') === 'central' ? 'central' : '',
    academicYear: search.get('year') ?? '', term: search.get('term') ?? '',
    page: Number(search.get('page') ?? 1), pageSize: 15,
  };
  const thisYear = currentAcademicYear();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'posts', params],
    queryFn: () => api<Paged<PostListItem>>(`/api/admin/posts${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/posts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('تم حذف المنشور.');
      setRemoving(null);
      void queryClient.invalidateQueries();
    },
    onError: (error) => { toast((error as ApiError).message, 'error'); setRemoving(null); },
  });

  return (
    <>
      <AdminTitle title="الأخبار والفعاليات" subtitle="انشر أخبار وفعاليات وإعلانات كليتك." action={
        <div className="flex flex-wrap gap-2">
          <ReportActions fileName="الأخبار-والفعاليات" build={async () => {
            const items = await fetchAllPages<PostListItem>('/api/admin/posts', { status: params.status, type: params.type, collegeId: params.collegeId, scope: params.scope, academicYear: params.academicYear, term: params.term });
            return {
              title: 'الأخبار والفعاليات',
              subtitle: [
                params.type && POST_TYPE_LABELS[params.type as PostType],
                params.status === 'Published' ? 'منشورة' : params.status === 'Draft' ? 'مسودات' : '',
                params.academicYear && periodLabel(Number(params.academicYear), params.term ? Number(params.term) : null),
                colleges.data?.find((c) => String(c.id) === params.collegeId)?.name,
              ].filter(Boolean).join(' — '),
              sections: [{
                columns: ['العنوان', 'النوع', 'الجهة', 'الحالة', 'موعد الفعالية', 'العام الجامعي', 'الفصل', 'المكان', 'تاريخ الإنشاء'],
                rows: items.map((p) => [
                  p.title, POST_TYPE_LABELS[p.type], p.collegeName ?? 'الأسرة (مركزي)', p.status === 'Draft' ? 'مسودة' : 'منشور',
                  p.eventStartsAt ? formatDateTime(p.eventStartsAt) : '', p.academicYear ? academicYearLabel(p.academicYear) : '', p.term ? TERMS[p.term] : '',
                  p.location, formatDate(p.createdAt),
                ]),
              }],
            };
          }} />
          <LinkButton to="/admin/posts/new"><Plus className="size-4" /> منشور جديد</LinkButton>
        </div>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect label="النوع" value={params.type} onChange={(v) => set({ type: v })}>
          <option value="">كل الأنواع</option>
          {Object.entries(POST_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </FilterSelect>
        <FilterSelect label="الحالة" value={params.status} onChange={(v) => set({ status: v })}>
          <option value="">كل الحالات</option>
          <option value="Published">منشور</option>
          <option value="Draft">مسودة</option>
        </FilterSelect>
        <FilterSelect label="العام الجامعي" value={params.academicYear} onChange={(v) => set(v ? { year: v } : { year: '', term: '' })}>
          <option value="">كل الأعوام</option>
          {Array.from({ length: 5 }, (_, i) => thisYear + 1 - i).map((y) => <option key={y} value={y}>فعاليات {academicYearLabel(y)}</option>)}
        </FilterSelect>
        {params.academicYear && (
          <FilterSelect label="الفصل" value={params.term} onChange={(v) => set({ term: v })}>
            <option value="">كل العام</option>
            {[1, 2, 3].map((t) => <option key={t} value={t}>{TERMS[t]}</option>)}
          </FilterSelect>
        )}
        {isUniversity && (
          <FilterSelect label="الجهة" value={search.get('college') ?? ''} onChange={(v) => set({ college: v })}>
            <option value="">كل الجهات</option>
            <option value="central">الأسرة (مركزي)</option>
            {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-2">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState title="لا توجد منشورات" text="ابدأ بنشر أول خبر أو فعالية." action={<LinkButton to="/admin/posts/new"><Plus className="size-4" /> منشور جديد</LinkButton>} />
      ) : (
        <>
          <div className="grid gap-2">
            {data.items.map((post) => (
              <Card key={post.id} className="flex items-center gap-3 p-3">
                <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                  {post.coverThumbUrl && <img src={mediaUrl(post.coverThumbUrl)} alt="" loading="lazy" className="size-full object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={post.type === 'Event' ? 'brand' : 'dark'}>{POST_TYPE_LABELS[post.type]}</Badge>
                    {post.status === 'Draft' ? <Badge tone="amber">مسودة</Badge> : <Badge tone="green">منشور</Badge>}
                    {post.isPinned && <Badge tone="gold">مثبّت</Badge>}
                    {post.type === 'Event' && post.term ? <Badge tone="neutral">{TERMS[post.term]} {academicYearLabel(post.academicYear!)}</Badge> : null}
                    {post.seriesId && <Badge tone="gold">متكررة</Badge>}
                  </div>
                  <Link to={`/admin/posts/${post.id}`} className="mt-1 block truncate font-extrabold hover:text-brand-700">{post.title}</Link>
                  <p className="truncate text-xs font-semibold text-ink-500">{post.collegeName ?? 'الأسرة (مركزي)'} · {post.type === 'Event' && post.eventStartsAt ? formatDateTime(post.eventStartsAt) : formatDate(post.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {post.type === 'Event' && <Link to={`/admin/posts/${post.id}/attendees`} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="الحضور" title="الحضور"><Users className="size-5" /></Link>}
                  <Link to={`/activities/${post.id}`} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="معاينة" title="معاينة"><Eye className="size-5" /></Link>
                  <Link to={`/admin/posts/${post.id}`} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="تعديل" title="تعديل"><Pencil className="size-5" /></Link>
                  <button onClick={() => setRemoving(post)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label="حذف" title="حذف"><Trash2 className="size-5" /></button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => set({ page: String(page) })} />
        </>
      )}

      <ConfirmDialog
        open={!!removing}
        title="حذف المنشور"
        message={`سيتم حذف «${removing?.title ?? ''}» وصوره نهائياً. لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائي"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

interface NewImage { key: string; file: File; preview: string }

function ImagesField({ existing, setExisting, added, setAdded, max }: {
  existing: PostImage[]; setExisting: (images: PostImage[]) => void; added: NewImage[]; setAdded: (images: NewImage[]) => void; max: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState('');
  const total = existing.length + added.length;
  // Object URLs must be released when the editor goes away.
  const latest = useRef(added);
  latest.current = added;
  useEffect(() => () => latest.current.forEach((image) => URL.revokeObjectURL(image.preview)), []);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const accepted: NewImage[] = [];
    let rejected = '';
    for (const file of Array.from(list)) {
      if (!IMAGE_TYPES.includes(file.type)) rejected = 'بعض الملفات ليست صوراً بصيغة مسموحة (JPG, PNG, WEBP).';
      else if (file.size > MAX_IMAGE) rejected = 'بعض الصور أكبر من 25 ميجابايت.';
      else if (total + accepted.length >= max) rejected = `الحد الأقصى ${max} صورة.`;
      else accepted.push({ key: `${file.name}-${file.size}-${Math.random()}`, file, preview: URL.createObjectURL(file) });
    }
    setProblem(rejected);
    setAdded([...added, ...accepted]);
    if (input.current) input.current.value = '';
  };

  const tile = 'group relative aspect-square overflow-hidden rounded-xl border border-ink-200 bg-ink-100';
  const actions = 'absolute inset-x-1.5 top-1.5 flex justify-between';
  const chip = 'rounded-full bg-ink-950/70 p-1.5 text-white hover:bg-ink-950';
  const coverIsExisting = existing.length > 0;

  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-ink-800">الصور <span className="font-semibold text-ink-500">({total} / {max})</span></p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {existing.map((image, index) => (
          <div key={image.id} className={tile}>
            <img src={mediaUrl(image.thumbUrl)} alt="" className="size-full object-cover" />
            <div className={actions}>
              <button type="button" className={chip} onClick={() => setExisting(existing.filter((i) => i.id !== image.id))} aria-label="إزالة الصورة"><X className="size-4" /></button>
              {index > 0 && <button type="button" className={chip} onClick={() => setExisting([image, ...existing.filter((i) => i.id !== image.id)])} aria-label="اجعلها صورة الغلاف" title="اجعلها الغلاف"><Star className="size-4" /></button>}
            </div>
            {index === 0 && <span className="absolute inset-x-0 bottom-0 bg-brand-600 py-0.5 text-center text-xs font-bold text-white">الغلاف</span>}
          </div>
        ))}
        {added.map((image, index) => (
          <div key={image.key} className={tile}>
            <img src={image.preview} alt="" className="size-full object-cover" />
            <div className={actions}>
              <button type="button" className={chip} onClick={() => { URL.revokeObjectURL(image.preview); setAdded(added.filter((i) => i.key !== image.key)); }} aria-label="إزالة الصورة"><X className="size-4" /></button>
              {index > 0 && !coverIsExisting && <button type="button" className={chip} onClick={() => setAdded([image, ...added.filter((i) => i.key !== image.key)])} aria-label="اجعلها صورة الغلاف" title="اجعلها الغلاف"><Star className="size-4" /></button>}
            </div>
            <span className={cx('absolute inset-x-0 bottom-0 py-0.5 text-center text-xs font-bold text-white', index === 0 && !coverIsExisting ? 'bg-brand-600' : 'bg-ink-900/70')}>
              {index === 0 && !coverIsExisting ? 'الغلاف' : 'جديدة'}
            </span>
          </div>
        ))}
        {total < max && (
          <button type="button" onClick={() => input.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-300 text-ink-500 transition hover:border-flame-500 hover:text-flame-600">
            <ImagePlus className="size-7" aria-hidden />
            <span className="text-sm font-bold">إضافة صور</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" multiple accept={IMAGE_TYPES.join(',')} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files)} />
      {problem ? <p role="alert" className="mt-1.5 text-sm font-semibold text-brand-700">{problem}</p> : <p className="mt-1.5 text-[13px] text-ink-500">يمكنك اختيار عدة صور مرة واحدة. أول صورة هي صورة الغلاف.</p>}
    </div>
  );
}

function EditorShell({ title, back, children }: { title: string; back: string; children: React.ReactNode }) {
  return (
    <>
      <Link to={back} className="mb-2 flex items-center gap-1 text-sm font-bold text-ink-500 hover:text-brand-700"><ArrowRight className="size-4" /> رجوع للقائمة</Link>
      <AdminTitle title={title} />
      {children}
    </>
  );
}

function CollegeField({ value, onChange, allowCentral, error }: { value: string; onChange: (value: string) => void; allowCentral: boolean; error?: string }) {
  const { user, hasRole } = useAuth();
  const colleges = useManagedColleges();
  if (!hasRole('UniversityAdmin')) {
    return <Input label="الجهة الناشرة" value={user?.collegeName ?? ''} disabled hint="تنشر باسم كليتك فقط." />;
  }
  return (
    <Select label="الجهة الناشرة" value={value} onChange={(e) => onChange(e.target.value)} required={!allowCentral} error={error}>
      {allowCentral ? <option value="">الأسرة (مركزي — على مستوى الجامعة)</option> : <option value="">اختر الكلية</option>}
      {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isActive ? '' : ' (موقوفة)'}</option>)}
    </Select>
  );
}

export function PostEditor() {
  const { id } = useParams();
  const editing = !!id;
  const existing = useQuery({ queryKey: ['post', id], queryFn: () => api<PostDetail>(`/api/posts/${id}`), enabled: editing });

  if (editing && existing.isPending) return <PageLoader />;
  if (editing && existing.error) {
    return <EmptyState title="المنشور غير موجود" text="ربما تم حذفه." action={<LinkButton to="/admin/posts">رجوع للقائمة</LinkButton>} />;
  }
  if (existing.data && !existing.data.canEdit) {
    return <EmptyState title="لا يمكنك تعديل هذا المنشور" text="هذا المنشور يتبع جهة أخرى." action={<LinkButton to="/admin/posts">رجوع للقائمة</LinkButton>} />;
  }
  return <PostForm key={id ?? 'new'} post={existing.data ?? null} />;
}

function PostForm({ post }: { post: PostDetail | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    type: (post?.type ?? 'News') as PostType,
    title: post?.title ?? '',
    body: post?.body ?? '',
    collegeId: post?.collegeId ? String(post.collegeId) : '',
    isPinned: post?.isPinned ?? false,
    eventStartsAt: toLocalInput(post?.eventStartsAt),
    eventEndsAt: toLocalInput(post?.eventEndsAt),
    location: post?.location ?? '',
    capacity: post?.capacity ? String(post.capacity) : '',
  });
  const [existing, setExisting] = useState<PostImage[]>(post?.images ?? []);
  const [added, setAdded] = useState<NewImage[]>([]);
  const [touched, setTouched] = useState(false);
  const isEvent = form.type === 'Event';

  const errors = {
    title: form.title.trim().length < 3 ? 'اكتب عنواناً واضحاً.' : '',
    body: form.body.trim().length < 10 ? 'اكتب محتوى المنشور (10 أحرف على الأقل).' : '',
    eventStartsAt: isEvent && !form.eventStartsAt ? 'حدد موعد بداية الفعالية.' : '',
    eventEndsAt: isEvent && form.eventEndsAt && form.eventEndsAt < form.eventStartsAt ? 'موعد النهاية يجب أن يكون بعد البداية.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : '');

  const save = useMutation({
    mutationFn: (status: 'Published' | 'Draft') => {
      const body = new FormData();
      body.append('type', form.type);
      body.append('title', form.title.trim());
      body.append('body', form.body);
      body.append('status', status);
      body.append('isPinned', String(form.isPinned));
      if (form.collegeId) body.append('collegeId', form.collegeId);
      if (isEvent) {
        body.append('eventStartsAt', fromLocalInput(form.eventStartsAt));
        if (form.eventEndsAt) body.append('eventEndsAt', fromLocalInput(form.eventEndsAt));
        body.append('location', form.location.trim());
        if (form.capacity) body.append('capacity', form.capacity);
      }
      existing.forEach((image) => body.append('keepImageIds', String(image.id)));
      added.forEach((image) => body.append('images', image.file));
      return api<PostDetail>(post ? `/api/admin/posts/${post.id}` : '/api/admin/posts', { method: post ? 'PUT' : 'POST', form: body });
    },
    onSuccess: (saved) => {
      toast(saved.status === 'Published' ? 'تم النشر.' : 'تم الحفظ كمسودة.');
      void queryClient.invalidateQueries();
      navigate('/admin/posts');
    },
  });

  const submit = (status: 'Published' | 'Draft') => (event?: FormEvent) => {
    event?.preventDefault();
    setTouched(true);
    if (valid) save.mutate(status);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <EditorShell title={post ? 'تعديل المنشور' : 'منشور جديد'} back="/admin/posts">
      <form onSubmit={submit('Published')} className="grid gap-5" noValidate>
        {save.error && <Alert>{(save.error as ApiError).message}</Alert>}
        <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-bold text-ink-800">نوع المنشور</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(POST_TYPE_LABELS) as PostType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={form.type === type}
                  onClick={() => setForm((f) => ({ ...f, type }))}
                  className={cx('rounded-xl border-2 py-2.5 font-extrabold transition', form.type === type ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-400')}
                >
                  {POST_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Input label="العنوان" required maxLength={200} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={show('title')} />
          </div>
          {isEvent && (
            <>
              <Input label="موعد البداية" type="datetime-local" required value={form.eventStartsAt} onChange={(e) => setForm((f) => ({ ...f, eventStartsAt: e.target.value }))} error={show('eventStartsAt')} hint="بتوقيت القاهرة" />
              <Input label="موعد النهاية" type="datetime-local" value={form.eventEndsAt} min={form.eventStartsAt} onChange={(e) => setForm((f) => ({ ...f, eventEndsAt: e.target.value }))} error={show('eventEndsAt')} hint="اختياري" />
              <Input label="عدد الأماكن" type="number" min={1} max={100000} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} hint="اختياري. بعد اكتمال العدد يدخل من يسجّل قائمة الانتظار." />
              {form.eventStartsAt && !Number.isNaN(new Date(form.eventStartsAt).getTime()) && (
                <p className="rounded-xl bg-sand px-4 py-2.5 text-sm font-bold text-ink-700 sm:col-span-2">
                  تُحسب هذه الفعالية ضمن {periodLabel(currentAcademicYear(new Date(form.eventStartsAt)), currentTerm(new Date(form.eventStartsAt)))}. يمكنك تكرارها في مواعيد أخرى بعد الحفظ.
                </p>
              )}
              <div className="sm:col-span-2">
                <Input label="المكان" maxLength={200} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="مثال: قاعة المؤتمرات — المبنى الإداري" />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Textarea label="المحتوى" required rows={9} maxLength={20000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} error={show('body')} hint="اكتب التفاصيل كاملة. الروابط تظهر قابلة للضغط تلقائياً." />
          </div>
          <CollegeField value={form.collegeId} onChange={(collegeId) => setForm((f) => ({ ...f, collegeId }))} allowCentral />
          <div className="flex items-end pb-2.5">
            <Checkbox checked={form.isPinned} onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))} label="تثبيت في أعلى القائمة" />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <ImagesField existing={existing} setExisting={setExisting} added={added} setAdded={setAdded} max={12} />
        </Card>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-ink-200 bg-white/95 p-3 shadow-lift backdrop-blur">
          <Button type="submit" loading={save.isPending && save.variables === 'Published'} disabled={save.isPending}>{post?.status === 'Published' ? 'حفظ التعديلات' : 'نشر الآن'}</Button>
          <Button variant="outline" onClick={() => submit('Draft')()} loading={save.isPending && save.variables === 'Draft'} disabled={save.isPending}>
            {post?.status === 'Published' ? 'إلغاء النشر (مسودة)' : 'حفظ كمسودة'}
          </Button>
          {post && isEvent && post.eventStartsAt && <RepeatEvent post={post} />}
          <LinkButton to="/admin/posts" variant="ghost">إلغاء</LinkButton>
          {save.isPending && added.length > 0 && <span className="text-sm text-ink-500">جارٍ رفع الصور…</span>}
        </div>
      </form>
    </EditorShell>
  );
}

// ---------- resources ----------

export function AdminResources() {
  const { hasRole } = useAuth();
  const [search, set] = useFilters();
  const queryClient = useQueryClient();
  const toast = useToast();
  const colleges = useManagedColleges();
  const [removing, setRemoving] = useState<Resource | null>(null);

  const params = { category: search.get('category') ?? '', collegeId: search.get('college') ?? '', page: Number(search.get('page') ?? 1), pageSize: 15 };
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'resources', params],
    queryFn: () => api<Paged<Resource>>(`/api/admin/resources${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/resources/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم الحذف.'); setRemoving(null); void queryClient.invalidateQueries(); },
    onError: (error) => { toast((error as ApiError).message, 'error'); setRemoving(null); },
  });

  return (
    <>
      <AdminTitle title="الجداول والمحاضرات" subtitle="محتوى الكلية الأكاديمي: جداول، امتحانات، محاضرات وملفات." action={
        <div className="flex flex-wrap gap-2">
          <ReportActions fileName="الجداول-والمحاضرات" build={async () => {
            const items = await fetchAllPages<Resource>('/api/admin/resources', { category: params.category, collegeId: params.collegeId });
            return {
              title: 'الجداول والمحاضرات',
              subtitle: [params.category && CATEGORY_LABELS[params.category as ResourceCategory], colleges.data?.find((c) => String(c.id) === params.collegeId)?.name].filter(Boolean).join(' — '),
              sections: [{
                columns: ['العنوان', 'النوع', 'الكلية', 'المستوى', 'القسم', 'المقرر', 'العام الجامعي', 'الفصل', 'الموعد', 'الحالة'],
                rows: items.map((r) => [
                  r.title, CATEGORY_LABELS[r.category], r.collegeName, levelLabel(r.level, colleges.data?.find((c) => c.id === r.collegeId)?.studySystem),
                  r.department, r.courseName, r.academicYear ? academicYearLabel(r.academicYear) : '', r.term ? TERMS[r.term] : '',
                  r.dueAt ? formatDateTime(r.dueAt) : '', r.isPublished ? 'منشور' : 'مخفي',
                ]),
              }],
            };
          }} />
          <LinkButton to="/admin/resources/new"><Plus className="size-4" /> إضافة محتوى</LinkButton>
        </div>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect label="النوع" value={params.category} onChange={(v) => set({ category: v })}>
          <option value="">كل الأنواع</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </FilterSelect>
        {hasRole('UniversityAdmin') && (
          <FilterSelect label="الكلية" value={params.collegeId} onChange={(v) => set({ college: v })}>
            <option value="">كل الكليات</option>
            {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-2">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState title="لا يوجد محتوى" text="أضف أول جدول أو محاضرة لطلاب كليتك." action={<LinkButton to="/admin/resources/new"><Plus className="size-4" /> إضافة محتوى</LinkButton>} />
      ) : (
        <>
          <div className="grid gap-2">
            {data.items.map((resource) => (
              <Card key={resource.id} className="flex items-center gap-3 p-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><FileText className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="dark">{CATEGORY_LABELS[resource.category]}</Badge>
                    <Badge>{levelLabel(resource.level, colleges.data?.find((c) => c.id === resource.collegeId)?.studySystem)}</Badge>
                    {!resource.isPublished && <Badge tone="amber">مخفي</Badge>}
                    {resource.files.length > 0 && <Badge><Paperclip className="size-3" /> {resource.files.length}</Badge>}
                  </div>
                  <Link to={`/admin/resources/${resource.id}`} className="mt-1 block truncate font-extrabold hover:text-brand-700">{resource.title}</Link>
                  <p className="truncate text-xs font-semibold text-ink-500">{resource.collegeName} · {formatDate(resource.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link to={`/admin/resources/${resource.id}`} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="تعديل"><Pencil className="size-5" /></Link>
                  <button onClick={() => setRemoving(resource)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label="حذف"><Trash2 className="size-5" /></button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => set({ page: String(page) })} />
        </>
      )}

      <ConfirmDialog
        open={!!removing}
        title="حذف المحتوى"
        message={`سيتم حذف «${removing?.title ?? ''}» وملفاته نهائياً.`}
        confirmLabel="حذف نهائي"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

export function ResourceEditor() {
  const { id } = useParams();
  const editing = !!id;
  const existing = useQuery({ queryKey: ['resource', id], queryFn: () => api<Resource>(`/api/resources/${id}`), enabled: editing });
  if (editing && existing.isPending) return <PageLoader />;
  if (editing && existing.error) {
    return <EmptyState title="المحتوى غير موجود" text="ربما تم حذفه." action={<LinkButton to="/admin/resources">رجوع للقائمة</LinkButton>} />;
  }
  return <ResourceForm key={id ?? 'new'} resource={existing.data ?? null} />;
}

function ResourceForm({ resource }: { resource: Resource | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { hasRole } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    category: (resource?.category ?? 'Schedule') as ResourceCategory,
    title: resource?.title ?? '',
    description: resource?.description ?? '',
    collegeId: resource ? String(resource.collegeId) : '',
    level: String(resource?.level ?? 0),
    term: String(resource?.term ?? 0),
    department: resource?.department ?? '',
    sequence: resource?.sequence ? String(resource.sequence) : '',
    courseName: resource?.courseName ?? '',
    externalUrl: resource?.externalUrl ?? '',
    isPublished: resource?.isPublished ?? true,
    courseId: resource?.courseId ? String(resource.courseId) : '',
    dueAt: toLocalInput(resource?.dueAt ?? null),
    academicYear: String(resource ? resource.academicYear ?? '' : currentAcademicYear()),
  });
  const { user } = useAuth();
  const collegeForCourses = resource ? resource.collegeId : hasRole('UniversityAdmin') ? Number(form.collegeId) || null : user?.collegeId ?? null;
  const courses = useQuery({
    queryKey: ['admin', 'courses', collegeForCourses, form.academicYear],
    queryFn: () => api<Course[]>(`/api/admin/courses${toQuery({ collegeId: collegeForCourses, academicYear: form.academicYear || undefined })}`),
    enabled: !!collegeForCourses,
  });
  const dueLabel = DUE_LABELS[form.category];
  const colleges = useManagedColleges();
  const activeCollege = colleges.data?.find((c) => c.id === collegeForCourses);
  const system = activeCollege?.studySystem;
  const [kept, setKept] = useState<ResourceFile[]>(resource?.files ?? []);
  const [added, setAdded] = useState<File[]>([]);
  const [problem, setProblem] = useState('');
  const [touched, setTouched] = useState(false);
  const accept = useMemo(() => [...IMAGE_TYPES, ...DOCUMENT_EXTENSIONS].join(','), []);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    let rejected = '';
    for (const file of Array.from(list)) {
      const isImage = IMAGE_TYPES.includes(file.type);
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!isImage && !DOCUMENT_EXTENSIONS.includes(extension)) rejected = 'الأنواع المسموحة: PDF, Word, PowerPoint, Excel والصور.';
      else if (file.size > (isImage ? MAX_IMAGE : MAX_DOCUMENT)) rejected = isImage ? 'الصور حتى 25 ميجابايت.' : 'الملفات حتى 25 ميجابايت.';
      else if (kept.length + added.length + accepted.length >= 10) rejected = 'الحد الأقصى 10 ملفات.';
      else accepted.push(file);
    }
    setProblem(rejected);
    setAdded((files) => [...files, ...accepted]);
    if (input.current) input.current.value = '';
  };

  const errors = {
    title: form.title.trim().length < 3 ? 'اكتب عنواناً واضحاً.' : '',
    collegeId: hasRole('UniversityAdmin') && !resource && !form.collegeId ? 'اختر الكلية.' : '',
    externalUrl: form.externalUrl && !/^https?:\/\//i.test(form.externalUrl.trim()) ? 'الرابط يجب أن يبدأ بـ https://' : '',
    content: kept.length + added.length === 0 && !form.externalUrl.trim() && !form.description.trim() ? 'أضف ملفاً أو رابطاً أو وصفاً على الأقل.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : '');

  const save = useMutation({
    mutationFn: () => {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) {
        if (key === 'dueAt' || key === 'courseId' || key === 'academicYear') continue;
        body.append(key, typeof value === 'string' ? value.trim() : String(value));
      }
      if (form.courseId) body.append('courseId', form.courseId);
      if (form.academicYear) body.append('academicYear', form.academicYear);
      if (form.dueAt) body.append('dueAt', fromLocalInput(form.dueAt) ?? '');
      kept.forEach((file) => body.append('keepFileIds', file.id));
      added.forEach((file) => body.append('files', file));
      return api<Resource>(resource ? `/api/admin/resources/${resource.id}` : '/api/admin/resources', { method: resource ? 'PUT' : 'POST', form: body });
    },
    onSuccess: () => { toast('تم الحفظ.'); void queryClient.invalidateQueries(); navigate('/admin/resources'); },
  });

  return (
    <EditorShell title={resource ? 'تعديل المحتوى' : 'إضافة محتوى أكاديمي'} back="/admin/resources">
      <form className="grid gap-5" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (valid) save.mutate(); }}>
        {save.error && <Alert>{(save.error as ApiError).message}</Alert>}
        <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Select label="نوع المحتوى" required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ResourceCategory }))}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
          {resource ? <Input label="الكلية" value={resource.collegeName ?? ''} disabled /> : <CollegeField value={form.collegeId} onChange={(collegeId) => setForm((f) => ({ ...f, collegeId }))} allowCentral={false} error={show('collegeId')} />}
          <div className="sm:col-span-2">
            <Input label="العنوان" required maxLength={200} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={show('title')} placeholder="مثال: جدول محاضرات المستوى الثانية — الفصل الأول" />
          </div>
          <Select label={levelWord(system)} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
            <option value="0">{levelLabel(0, system)}</option>
            {levelOptions(activeCollege?.levelsCount ?? 7, system).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="الفصل الدراسي" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}>
            <option value="0">غير محدد</option>
            {TERMS.slice(1).map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
          </Select>
          <DepartmentPicker collegeId={collegeForCourses} value={form.department} onChange={(department) => setForm((f) => ({ ...f, department }))} />
          <Input label="رقم المحاضرة / الأسبوع" type="number" min={1} max={60} value={form.sequence} onChange={(e) => setForm((f) => ({ ...f, sequence: e.target.value }))} hint="اختياري — ليُرتَّب المحتوى داخل المقرر" />
          <Select label="العام الجامعي" value={form.academicYear} disabled={!!form.courseId}
            onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value, courseId: '' }))}
            hint={form.courseId ? 'يُؤخذ من المقرر المختار.' : 'اختر «غير مرتبط بعام» للمحتوى الذي يصلح لكل الأعوام.'}>
            <option value="">غير مرتبط بعام</option>
            {Array.from({ length: 6 }, (_, i) => currentAcademicYear() + 1 - i).map((y) => <option key={y} value={y}>{academicYearLabel(y)}</option>)}
          </Select>
          <Select label="المقرر" value={form.courseId} disabled={!collegeForCourses || courses.isPending}
            onChange={(e) => {
              const course = courses.data?.find((c) => String(c.id) === e.target.value);
              setForm((f) => ({ ...f, courseId: e.target.value, courseName: course ? course.name : f.courseName, level: course ? String(course.level) : f.level, term: course ? String(course.term) : f.term }));
            }}
            hint={courses.data?.length === 0 ? 'لا توجد مقررات بعد — أضفها من «المقررات».' : 'اختياري — يظهر المحتوى داخل صفحة المقرر'}>
            <option value="">بدون مقرر</option>
            {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
          </Select>
          <Input label={dueLabel ?? 'التاريخ'} type="datetime-local" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
            hint={dueLabel ? 'اختياري — يظهر للطلاب مميزاً' : 'اختياري — لأي محتوى له موعد'} />
          <div className="sm:col-span-2">
            <Textarea label="الوصف" maxLength={4000} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Input label="رابط خارجي" dir="ltr" maxLength={500} value={form.externalUrl} onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))} error={show('externalUrl')} placeholder="https://" hint="اختياري — مثل رابط فيديو المحاضرة أو مجلد Drive" />
          </div>
          <div className="sm:col-span-2">
            <Checkbox checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} label="ظاهر للطلاب" />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <p className="mb-2 text-sm font-bold text-ink-800">الملفات <span className="font-semibold text-ink-500">({kept.length + added.length} / 10)</span></p>
          <div className="grid gap-2">
            {kept.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-sand px-3.5 py-2.5">
                <FileText className="size-5 shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1 truncate font-bold" dir="auto">{file.name}</span>
                <span className="text-xs font-semibold text-ink-500">{formatSize(file.size)}</span>
                <button type="button" onClick={() => setKept(kept.filter((f) => f.id !== file.id))} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" aria-label={`إزالة ${file.name}`}><X className="size-4" /></button>
              </div>
            ))}
            {added.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <FileText className="size-5 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate font-bold" dir="auto">{file.name}</span>
                <span className="text-xs font-semibold text-ink-500">{formatSize(file.size)} · جديد</span>
                <button type="button" onClick={() => setAdded(added.filter((_, i) => i !== index))} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" aria-label={`إزالة ${file.name}`}><X className="size-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => input.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 py-5 font-bold text-ink-600 transition hover:border-flame-500 hover:text-flame-600">
              <Paperclip className="size-5" /> إرفاق ملفات
            </button>
          </div>
          <input ref={input} type="file" multiple accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files)} />
          <p className={cx('mt-1.5 text-[13px]', problem || show('content') ? 'font-semibold text-brand-700' : 'text-ink-500')} role={problem || show('content') ? 'alert' : undefined}>
            {problem || show('content') || 'PDF, Word, PowerPoint, Excel (حتى 25 م.ب) أو صور (حتى 8 م.ب).'}
          </p>
        </Card>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-ink-200 bg-white/95 p-3 shadow-lift backdrop-blur">
          <Button type="submit" loading={save.isPending}>حفظ</Button>
          <LinkButton to="/admin/resources" variant="ghost">إلغاء</LinkButton>
          {save.isPending && added.length > 0 && <span className="text-sm text-ink-500">جارٍ رفع الملفات…</span>}
        </div>
      </form>
    </EditorShell>
  );
}
