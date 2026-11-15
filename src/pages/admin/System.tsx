import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ImageIcon, Pencil, Plus, Trash2, Upload, Video } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  Alert, Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageLoader, Pagination, Select, Textarea, cx, useToast,
} from '../../components/ui';
import { api, mediaUrl, toQuery, type ApiError } from '../../lib/api';
import { MAX_PICKED_IMAGE } from '../../lib/images';
import { useAuth } from '../../lib/auth';
import { SLOT_LABELS, formatDateTime, suggestedLevels } from '../../lib/format';
import { StudySystemsManager, useStudySystems } from '../../components/StudySystems';
import type { AuditLog, College, Leader, LeaderSlot, Paged } from '../../lib/types';
import { ImagePicker } from '../Join';
import { AdminTitle } from './AdminLayout';
import { useManagedColleges } from './Content';

// ---------- colleges ----------

export function AdminColleges() {
  const { hasRole } = useAuth();
  const isUniversity = hasRole('UniversityAdmin');
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isPending, isError, refetch } = useManagedColleges();
  const systems = useStudySystems();
  const [managingSystems, setManagingSystems] = useState(false);
  const [editing, setEditing] = useState<College | 'new' | null>(null);
  const [removing, setRemoving] = useState<College | null>(null);
  const [form, setForm] = useState({ name: '', description: '', deanName: '', websiteUrl: '', sortOrder: '0', isActive: true, levelsCount: '4', studySystemId: '1' });
  const [logo, setLogo] = useState<File | null>(null);

  const open = (college: College | 'new') => {
    setForm(college === 'new'
      ? { name: '', description: '', deanName: '', websiteUrl: '', sortOrder: String(data?.length ?? 0), isActive: true, levelsCount: '4', studySystemId: '1' }
      : { name: college.name, description: college.description ?? '', deanName: college.deanName ?? '', websiteUrl: college.websiteUrl ?? '', sortOrder: String(college.sortOrder), isActive: college.isActive, levelsCount: String(college.levelsCount), studySystemId: String(college.studySystemId ?? 1) });
    setLogo(null);
    save.reset();
    setEditing(college);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, typeof value === 'string' ? value.trim() : String(value));
      if (logo) body.append('logo', logo);
      const isNew = editing === 'new';
      return api<College>(isNew ? '/api/admin/colleges' : `/api/admin/colleges/${(editing as College).id}`, { method: isNew ? 'POST' : 'PUT', form: body });
    },
    onSuccess: () => { toast('تم الحفظ.'); setEditing(null); void queryClient.invalidateQueries(); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/colleges/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم حذف الكلية.'); setRemoving(null); void queryClient.invalidateQueries(); },
    onError: (error) => { toast((error as ApiError).message, 'error'); setRemoving(null); },
  });

  return (
    <>
      <AdminTitle
        title="الكليات"
        subtitle={isUniversity ? 'أنشئ كليات الجامعة ثم عيّن لكل كلية مسؤوليها من صفحة «المسؤولون».' : 'بيانات كليتك كما تظهر للطلاب.'}
        action={isUniversity ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setManagingSystems(true)}>أنظمة الدراسة</Button><Button onClick={() => open('new')}><Plus className="size-4" /> كلية جديدة</Button></div> : undefined}
      />
      {isUniversity && <StudySystemsManager open={managingSystems} onClose={() => setManagingSystems(false)} />}
      {isPending ? (
        <div className="grid gap-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="لا توجد كليات بعد" text="ابدأ بإضافة كليات الجامعة." action={isUniversity ? <Button onClick={() => open('new')}><Plus className="size-4" /> كلية جديدة</Button> : undefined} />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {data.map((college) => (
            <Card key={college.id} className={cx('flex items-center gap-3 p-3.5', !college.isActive && 'opacity-60')}>
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-100">
                {college.logoThumbUrl ? <img src={mediaUrl(college.logoThumbUrl)} alt="" className="size-full object-contain p-1" /> : <Building2 className="size-6 text-ink-400" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{college.name}</p>
                <div className="mt-0.5 flex gap-1.5">{college.isActive ? <Badge tone="green">مفعّلة</Badge> : <Badge tone="amber">موقوفة</Badge>}</div>
              </div>
              <button onClick={() => open(college)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label={`تعديل ${college.name}`}><Pencil className="size-5" /></button>
              {isUniversity && <button onClick={() => setRemoving(college)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label={`حذف ${college.name}`}><Trash2 className="size-5" /></button>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} wide title={editing === 'new' ? 'كلية جديدة' : 'تعديل بيانات الكلية'} onClose={() => setEditing(null)}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          {save.error && <div className="sm:col-span-2"><Alert>{(save.error as ApiError).message}</Alert></div>}
          <div className="sm:col-span-2">
            <Input label="اسم الكلية" required maxLength={150} value={form.name} disabled={!isUniversity} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: كلية الحاسبات والذكاء الاصطناعي" />
          </div>
          <Input label="عميد الكلية" maxLength={150} value={form.deanName} onChange={(e) => setForm((f) => ({ ...f, deanName: e.target.value }))} />
          <Input label="موقع الكلية" dir="ltr" maxLength={300} value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://" />
          <div className="sm:col-span-2">
            <Textarea label="نبذة عن الكلية" maxLength={3000} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <ImagePicker label="شعار الكلية" file={logo} onChange={setLogo} existing={editing !== 'new' && !!(editing as College | null)?.logoUrl} />
          {isUniversity && (
            <div className="grid content-start gap-4">
              <Select label="نظام الدراسة" value={form.studySystemId} onChange={(e) => setForm((f) => ({ ...f, studySystemId: e.target.value }))}
                hint="يحدد التسمية في الموقع كله. لو نظام كليتك غير موجود، أضفه من «أنظمة الدراسة» أعلى الصفحة.">
                {systems.data?.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.levelWord} الأولى، الثانية…</option>)}
              </Select>
              <Select label={`عدد ${systems.data?.find((s) => String(s.id) === form.studySystemId)?.levelWord === 'الفرقة' ? 'الفرق الدراسية' : 'المستويات'}`} value={form.levelsCount} onChange={(e) => setForm((f) => ({ ...f, levelsCount: e.target.value }))} hint={`المقترح لهذه الكلية: ${suggestedLevels(form.name)} (الطب 6، الهندسة والصيدلة والأسنان والبيطري 5، والباقي 4 غالباً). راجع لائحة الكلية.`}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
              <Input label="ترتيب الظهور" type="number" min={0} max={1000} value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} hint="الأصغر يظهر أولاً." />
              <Checkbox checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} label="الكلية مفعّلة وتظهر للطلاب" />
            </div>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>تراجع</Button>
            <Button type="submit" loading={save.isPending} disabled={form.name.trim().length < 3}>حفظ</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="حذف الكلية"
        message={`حذف «${removing?.name ?? ''}» نهائياً؟ يمكن حذف الكلية الفارغة فقط؛ الكلية التي بها محتوى أو مسؤولون يمكن إيقافها من «تعديل».`}
        confirmLabel="حذف"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

// ---------- home page ----------

const TEXT_FIELDS: Array<{ key: string; label: string; multiline?: boolean; ltr?: boolean }> = [
  { key: 'tagline', label: 'الشعار النصي (أسفل اسم الأسرة)' },
  { key: 'about', label: 'عن الأسرة', multiline: true },
  { key: 'vision', label: 'الرؤية', multiline: true },
  { key: 'mission', label: 'الرسالة', multiline: true },
  { key: 'bannerTitle', label: 'عنوان الصورة العريضة (اختياري)' },
  { key: 'videoTitle', label: 'عنوان الفيديو' },
  { key: 'contactEmail', label: 'بريد التواصل', ltr: true },
  { key: 'contactPhone', label: 'هاتف التواصل', ltr: true },
  { key: 'facebookUrl', label: 'رابط فيسبوك', ltr: true },
  { key: 'instagramUrl', label: 'رابط إنستجرام', ltr: true },
  { key: 'youtubeUrl', label: 'رابط يوتيوب', ltr: true },
  { key: 'telegramUrl', label: 'رابط تيليجرام', ltr: true },
];

interface SiteData { settings: Record<string, string>; leaders: Leader[] }

export function AdminSite() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const site = useQuery({ queryKey: ['admin', 'site'], queryFn: () => api<SiteData>('/api/admin/site') });
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [leader, setLeader] = useState<Leader | 'new' | null>(null);
  const [leaderForm, setLeaderForm] = useState({ name: '', title: '', slot: 'Other' as LeaderSlot, sortOrder: '0' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [removing, setRemoving] = useState<Leader | null>(null);
  const [removingVideo, setRemovingVideo] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const [removingBanner, setRemovingBanner] = useState(false);
  const bannerInput = useRef<HTMLInputElement>(null);
  const refresh = () => void queryClient.invalidateQueries();

  const saveSettings = useMutation({
    mutationFn: () => api('/api/admin/site/settings', { method: 'PUT', body: draft }),
    onSuccess: () => { toast('تم حفظ الإعدادات.'); setDraft(null); refresh(); },
  });
  const saveLeader = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.append('name', leaderForm.name.trim());
      body.append('title', leaderForm.title.trim());
      body.append('slot', leaderForm.slot);
      body.append('sortOrder', leaderForm.sortOrder);
      if (photo) body.append('photo', photo);
      const isNew = leader === 'new';
      return api(isNew ? '/api/admin/site/leaders' : `/api/admin/site/leaders/${(leader as Leader).id}`, { method: isNew ? 'POST' : 'PUT', form: body });
    },
    onSuccess: () => { toast('تم الحفظ.'); setLeader(null); refresh(); },
  });
  const removeLeader = useMutation({
    mutationFn: (id: number) => api(`/api/admin/site/leaders/${id}`, { method: 'DELETE' }),
    onSuccess: () => { setRemoving(null); toast('تم الحذف.'); refresh(); },
  });
  const uploadVideo = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('video', file);
      return api('/api/admin/site/video', { method: 'POST', form: body });
    },
    onSuccess: () => { toast('تم رفع الفيديو.'); refresh(); },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });
  const removeVideo = useMutation({
    mutationFn: () => api('/api/admin/site/video', { method: 'DELETE' }),
    onSuccess: () => { setRemovingVideo(false); toast('تم حذف الفيديو.'); refresh(); },
  });

  const uploadBanner = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('image', file);
      return api('/api/admin/site/banner', { method: 'POST', form: body });
    },
    onSuccess: () => { toast('تم رفع الصورة.'); refresh(); },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });
  const removeBanner = useMutation({
    mutationFn: () => api('/api/admin/site/banner', { method: 'DELETE' }),
    onSuccess: () => { setRemovingBanner(false); toast('تم حذف الصورة.'); refresh(); },
  });
  const pickBanner = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast('الصيغ المسموحة: JPG, PNG, WEBP.', 'error');
    if (file.size > MAX_PICKED_IMAGE) return toast('حجم الصورة يجب ألا يتجاوز 25 ميجابايت.', 'error');
    uploadBanner.mutate(file);
  };

  if (site.isPending) return <PageLoader />;
  if (site.isError) return <ErrorState onRetry={() => void site.refetch()} />;

  const values = draft ?? site.data.settings;
  const change = (key: string, value: string) => setDraft({ ...values, [key]: value });
  const openLeader = (item: Leader | 'new') => {
    setLeaderForm(item === 'new' ? { name: '', title: '', slot: 'Other', sortOrder: '0' } : { name: item.name, title: item.title, slot: item.slot, sortOrder: String(item.sortOrder) });
    setPhoto(null);
    saveLeader.reset();
    setLeader(item);
  };
  const pickVideo = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(mp4|webm)$/i.test(file.name)) return toast('صيغة الفيديو يجب أن تكون MP4 أو WEBM.', 'error');
    if (file.size > 300 * 1024 * 1024) return toast('حجم الفيديو يجب ألا يتجاوز 300 ميجابايت.', 'error');
    uploadVideo.mutate(file);
  };

  return (
    <>
      <AdminTitle title="الصفحة الرئيسية" subtitle="تحكم في القيادات، الفيديو والنصوص التي تظهر في الصفحة الرئيسية للموقع والتطبيق." />

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">القيادات</h2>
          <Button size="sm" variant="outline" onClick={() => openLeader('new')}><Plus className="size-4" /> إضافة</Button>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {site.data.leaders.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
              <span className="flex size-16 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-ink-800">
                {item.photoUrl && <img src={mediaUrl(item.photoUrl)} alt="" className="max-h-full object-contain" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{item.name}</p>
                <p className="truncate text-sm text-ink-600">{item.title}</p>
                <Badge tone="gold">{SLOT_LABELS[item.slot]}</Badge>
              </div>
              <button onClick={() => openLeader(item)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label={`تعديل ${item.name}`}><Pencil className="size-5" /></button>
              <button onClick={() => setRemoving(item)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label={`حذف ${item.name}`}><Trash2 className="size-5" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold"><ImageIcon className="size-5 text-brand-600" /> الصورة العريضة تحت أول الصفحة</h2>
        <p className="mb-3 text-sm text-ink-600">تظهر كاملة بعرض الصفحة تحت السكشن الأول مباشرة، مثل صورة الطلاب وهم يكوّنون جملة «من أجل مصر». الأفضل صورة عرضية (مثلاً 16:9).</p>
        {site.data.settings.bannerUrl ? (
          <img src={mediaUrl(site.data.settings.bannerThumbUrl || site.data.settings.bannerUrl)} alt="الصورة العريضة الحالية" className="mb-3 w-full max-w-xl rounded-xl border border-ink-200" />
        ) : (
          <p className="mb-3 text-ink-600">لا توجد صورة حالياً، فالسكشن مخفي من الصفحة الرئيسية.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => bannerInput.current?.click()} loading={uploadBanner.isPending}><Upload className="size-4" /> {site.data.settings.bannerUrl ? 'استبدال الصورة' : 'رفع صورة'}</Button>
          {site.data.settings.bannerUrl && <Button variant="danger" onClick={() => setRemovingBanner(true)}><Trash2 className="size-4" /> حذف الصورة</Button>}
        </div>
        <input ref={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { pickBanner(e.target.files?.[0]); e.target.value = ''; }} />
      </Card>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Video className="size-5 text-brand-600" /> فيديو الصفحة الرئيسية</h2>
        {site.data.settings.videoUrl ? (
          <video src={mediaUrl(site.data.settings.videoUrl)} controls preload="metadata" className="mb-3 aspect-video w-full max-w-xl rounded-xl bg-black" />
        ) : (
          <p className="mb-3 text-ink-600">لا يوجد فيديو حالياً. ارفع ملف MP4 (حتى 300 م.ب) ليظهر بعد صورة فخامة الرئيس.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => videoInput.current?.click()} loading={uploadVideo.isPending}><Upload className="size-4" /> {site.data.settings.videoUrl ? 'استبدال الفيديو' : 'رفع فيديو'}</Button>
          {site.data.settings.videoUrl && <Button variant="danger" onClick={() => setRemovingVideo(true)}><Trash2 className="size-4" /> حذف الفيديو</Button>}
        </div>
        {uploadVideo.isPending && <p className="mt-2 text-sm text-ink-500">جارٍ رفع الفيديو… قد يستغرق ذلك بعض الوقت حسب سرعة الاتصال. لا تغلق الصفحة.</p>}
        <input ref={videoInput} type="file" accept="video/mp4,video/webm" className="sr-only" tabIndex={-1} onChange={(e) => { pickVideo(e.target.files?.[0]); e.target.value = ''; }} />
      </Card>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-extrabold">النصوص وروابط التواصل</h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveSettings.mutate(); }}>
          {saveSettings.error && <div className="sm:col-span-2"><Alert>{(saveSettings.error as ApiError).message}</Alert></div>}
          {TEXT_FIELDS.map((field) => field.multiline ? (
            <div key={field.key} className="sm:col-span-2">
              <Textarea label={field.label} value={values[field.key] ?? ''} onChange={(e) => change(field.key, e.target.value)} />
            </div>
          ) : (
            <Input key={field.key} label={field.label} dir={field.ltr ? 'ltr' : undefined} value={values[field.key] ?? ''} onChange={(e) => change(field.key, e.target.value)} />
          ))}
          <div className="sm:col-span-2">
            <Button type="submit" loading={saveSettings.isPending} disabled={!draft}>حفظ الإعدادات</Button>
          </div>
        </form>
      </Card>

      <Modal open={!!leader} wide title={leader === 'new' ? 'إضافة قيادة' : 'تعديل'} onClose={() => setLeader(null)}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveLeader.mutate(); }}>
          {saveLeader.error && <div className="sm:col-span-2"><Alert>{(saveLeader.error as ApiError).message}</Alert></div>}
          <Input label="الاسم" required maxLength={150} value={leaderForm.name} onChange={(e) => setLeaderForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="الصفة" required maxLength={200} value={leaderForm.title} onChange={(e) => setLeaderForm((f) => ({ ...f, title: e.target.value }))} />
          <Select label="موضع الظهور" value={leaderForm.slot} onChange={(e) => setLeaderForm((f) => ({ ...f, slot: e.target.value as LeaderSlot }))}>
            {Object.entries(SLOT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
          <Input label="الترتيب" type="number" min={0} value={leaderForm.sortOrder} onChange={(e) => setLeaderForm((f) => ({ ...f, sortOrder: e.target.value }))} />
          <div className="sm:col-span-2">
            <ImagePicker label="الصورة" file={photo} onChange={setPhoto} existing={leader !== 'new' && !!(leader as Leader | null)?.photoUrl} hint="يفضّل صورة بخلفية شفافة (PNG)." />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setLeader(null)}>تراجع</Button>
            <Button type="submit" loading={saveLeader.isPending} disabled={leaderForm.name.trim().length < 3 || leaderForm.title.trim().length < 3}>حفظ</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!removing} title="حذف" message={`حذف «${removing?.name ?? ''}» من الصفحة الرئيسية؟`} confirmLabel="حذف" loading={removeLeader.isPending} onConfirm={() => removing && removeLeader.mutate(removing.id)} onClose={() => setRemoving(null)} />
      <ConfirmDialog open={removingBanner} title="حذف الصورة العريضة" message="ستُحذف الصورة من الصفحة الرئيسية نهائياً." confirmLabel="حذف" loading={removeBanner.isPending} onConfirm={() => removeBanner.mutate()} onClose={() => setRemovingBanner(false)} />
      <ConfirmDialog open={removingVideo} title="حذف الفيديو" message="سيُحذف الفيديو من الصفحة الرئيسية نهائياً." confirmLabel="حذف" loading={removeVideo.isPending} onConfirm={() => removeVideo.mutate()} onClose={() => setRemovingVideo(false)} />
    </>
  );
}

// ---------- audit log ----------

const ACTIONS: Record<string, string> = {
  'auth.login_failed': 'محاولة دخول فاشلة', 'auth.password_changed': 'تغيير كلمة المرور',
  'auth.password_reset_by_email': 'استعادة كلمة المرور بالبريد', 'event.checked_in': 'تسجيل حضور فعالية',
  'post.created': 'إنشاء منشور', 'post.updated': 'تعديل منشور', 'post.deleted': 'حذف منشور',
  'resource.created': 'إضافة محتوى أكاديمي', 'resource.updated': 'تعديل محتوى أكاديمي', 'resource.deleted': 'حذف محتوى أكاديمي',
  'college.created': 'إنشاء كلية', 'college.updated': 'تعديل كلية', 'college.deleted': 'حذف كلية',
  'user.created': 'إنشاء حساب مسؤول', 'user.promoted': 'ترقية حساب', 'user.role_changed': 'تغيير دور',
  'user.suspended': 'إيقاف حساب', 'user.activated': 'تفعيل حساب', 'user.password_reset': 'إعادة تعيين كلمة مرور',
  'membership.submitted': 'تقديم طلب عضوية', 'membership.resubmitted': 'إعادة تقديم طلب', 'membership.viewed': 'الاطلاع على طلب عضوية',
  'membership.approved': 'قبول طلب عضوية', 'membership.rejected': 'رفض طلب عضوية', 'membership.needschanges': 'طلب تعديل',
  'site.settings_updated': 'تعديل إعدادات الصفحة الرئيسية', 'site.leader_added': 'إضافة قيادة', 'site.leader_updated': 'تعديل قيادة',
  'site.leader_deleted': 'حذف قيادة', 'site.video_uploaded': 'رفع فيديو', 'site.banner_uploaded': 'رفع الصورة العريضة', 'site.banner_removed': 'حذف الصورة العريضة', 'site.video_removed': 'حذف الفيديو',
};

export function AdminAudit() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: () => api<Paged<AuditLog>>(`/api/admin/audit${toQuery({ page, pageSize: 30 })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <AdminTitle title="سجل العمليات" subtitle="كل إجراء إداري مسجّل هنا: من قام به ومتى." />
      {isPending ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState title="السجل فارغ" />
      ) : (
        <>
          <Card className="divide-y divide-ink-100">
            {data.items.map((log) => (
              <div key={log.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3">
                <span className="font-extrabold">{ACTIONS[log.action] ?? log.action}</span>
                <span className="text-sm font-semibold text-brand-700">{log.userName ?? 'النظام'}</span>
                {log.details && <span className="min-w-0 truncate text-sm text-ink-600" dir="auto">{log.details}</span>}
                <span className="ms-auto text-xs font-semibold text-ink-400">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </Card>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
