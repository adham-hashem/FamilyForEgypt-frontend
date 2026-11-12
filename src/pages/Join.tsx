import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Clock, ImagePlus, Lock, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { PageHeader } from '../components/Layout';
import { Alert, Button, Card, Checkbox, ErrorState, Input, LinkButton, PageLoader, Select, Textarea, cx } from '../components/ui';
import { api, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { COMMITTEES, GOVERNORATES, LEVELS, normalizeDigits } from '../lib/format';
import type { College, MyApplication } from '../lib/types';
import { myApplicationQuery } from './Auth';

const MAX_IMAGE = 8 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImagePicker({ label, hint, file, onChange, error, required, existing }: {
  label: string; hint?: string; file: File | null; onChange: (file: File | null) => void; error?: string; required?: boolean; existing?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState('');
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    if (!IMAGE_TYPES.includes(picked.type)) return setProblem('الصيغ المسموحة: JPG, PNG, WEBP.');
    if (picked.size > MAX_IMAGE) return setProblem('حجم الصورة يجب ألا يتجاوز 8 ميجابايت.');
    setProblem('');
    onChange(picked);
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-ink-800">{label}{required && <span className="ms-1 text-brand-600">*</span>}</p>
      <div className={cx('relative overflow-hidden rounded-2xl border-2 border-dashed bg-sand transition', error || problem ? 'border-brand-400' : 'border-ink-300 hover:border-flame-500')}>
        {preview ? (
          <>
            <img src={preview} alt={label} className="aspect-[16/10] w-full object-contain" />
            <button type="button" onClick={() => { onChange(null); if (input.current) input.current.value = ''; }} className="absolute end-2 top-2 rounded-full bg-ink-950/70 p-1.5 text-white hover:bg-ink-950" aria-label={`إزالة ${label}`}>
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 text-ink-500">
            <ImagePlus className="size-8" aria-hidden />
            <span className="font-bold text-ink-700">{existing ? 'تم الرفع سابقاً — اضغط للاستبدال' : 'اضغط لاختيار صورة'}</span>
            <span className="text-xs">JPG / PNG / WEBP — حتى 8 م.ب</span>
          </button>
        )}
        <input ref={input} type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {(problem || error) ? <p role="alert" className="mt-1.5 text-sm font-semibold text-brand-700">{problem || error}</p> : hint ? <p className="mt-1.5 text-[13px] text-ink-500">{hint}</p> : null}
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-3 text-xl font-extrabold">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">{step}</span>
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function Gate() {
  return (
    <div className="container-page py-12">
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Lock className="size-7" /></span>
        <h2 className="mt-4 text-2xl font-black">سجّل الدخول لتبدأ</h2>
        <p className="mt-2 text-ink-600">
          نموذج الانضمام يحتوي على بيانات شخصية وصورة البطاقة، لذلك نحتاج أن يكون لك حساب لحماية بياناتك ومتابعة حالة طلبك.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <LinkButton to="/register?next=/join" variant="gold">إنشاء حساب جديد</LinkButton>
          <LinkButton to="/login?next=/join" variant="outline">لدي حساب بالفعل</LinkButton>
        </div>
      </Card>
    </div>
  );
}

function StatusCard({ application }: { application: MyApplication }) {
  const approved = application.status === 'Approved';
  const Icon = approved ? BadgeCheck : Clock;
  return (
    <div className="container-page py-12">
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className={cx('mx-auto flex size-14 items-center justify-center rounded-full', approved ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600')}>
          <Icon className="size-7" />
        </span>
        <h2 className="mt-4 text-2xl font-black">{approved ? 'أنت عضو في الأسرة' : 'تم استلام طلبك'}</h2>
        <p className="mt-2 text-ink-600">
          {approved
            ? `رقم عضويتك: ${application.membershipNumber}. يمكنك عرض بطاقة العضوية من حسابك.`
            : 'طلبك قيد المراجعة من مسؤولي الأسرة في كليتك. تابع حالة الطلب من صفحة حسابك.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <LinkButton to="/account">{approved ? 'عرض بطاقة العضوية' : 'متابعة حالة الطلب'}</LinkButton>
          <LinkButton to="/activities" variant="outline">تصفح الأنشطة</LinkButton>
        </div>
      </Card>
    </div>
  );
}

type FormState = {
  fullName: string; studentCode: string; nationalId: string; collegeId: string; department: string; level: string;
  phone: string; whatsApp: string; email: string; governorate: string; city: string; address: string;
  preferredCommittee: string; skills: string; previousActivities: string; motivation: string;
};

function JoinForm({ existing }: { existing: MyApplication | null }) {
  const { user, reload } = useAuth();
  const queryClient = useQueryClient();
  const colleges = useQuery({ queryKey: ['colleges'], queryFn: () => api<College[]>('/api/colleges'), staleTime: 300_000 });
  const [form, setForm] = useState<FormState>(() => ({
    fullName: existing?.fullName ?? user?.fullName ?? '',
    studentCode: existing?.studentCode ?? '',
    nationalId: '',
    collegeId: existing ? String(existing.collegeId) : '',
    department: existing?.department ?? '',
    level: existing ? String(existing.level) : '',
    phone: existing?.phone ?? user?.phone ?? '',
    whatsApp: existing?.whatsApp ?? '',
    email: existing?.email ?? user?.email ?? '',
    governorate: existing?.governorate ?? 'دمياط',
    city: existing?.city ?? '',
    address: existing?.address ?? '',
    preferredCommittee: existing?.preferredCommittee ?? '',
    skills: existing?.skills ?? '',
    previousActivities: existing?.previousActivities ?? '',
    motivation: existing?.motivation ?? '',
  }));
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [accept, setAccept] = useState(false);
  const [touched, setTouched] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const setDigits = (key: keyof FormState, max: number) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, max) }));

  const errors: Partial<Record<keyof FormState | 'idFront' | 'idBack' | 'accept', string>> = {
    fullName: form.fullName.trim().length < 8 ? 'اكتب الاسم رباعياً كما في البطاقة.' : '',
    studentCode: /^[A-Za-z0-9\-/]{3,30}$/.test(form.studentCode.trim()) ? '' : 'اكتب الرقم الجامعي (أرقام أو حروف إنجليزية).',
    nationalId: /^[23]\d{13}$/.test(form.nationalId) ? '' : 'الرقم القومي 14 رقماً كما في البطاقة.',
    collegeId: form.collegeId ? '' : 'اختر الكلية.',
    level: form.level ? '' : 'اختر الفرقة.',
    phone: /^01[0125]\d{8}$/.test(form.phone) ? '' : 'رقم الموبايل غير صحيح. مثال: 01012345678',
    whatsApp: !form.whatsApp || /^01[0125]\d{8}$/.test(form.whatsApp) ? '' : 'رقم الواتساب غير صحيح.',
    email: /^\S+@\S+\.\S+$/.test(form.email.trim()) ? '' : 'البريد الإلكتروني غير صحيح.',
    governorate: form.governorate ? '' : 'اختر المحافظة.',
    address: form.address.trim().length < 5 ? 'اكتب العنوان بالتفصيل.' : '',
    idFront: idFront || existing ? '' : 'صورة وجه البطاقة مطلوبة.',
    idBack: idBack || existing ? '' : 'صورة ظهر البطاقة مطلوبة.',
    accept: accept ? '' : 'يجب الموافقة على الإقرار.',
  };
  const valid = Object.values(errors).every((e) => !e);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : '');

  const mutation = useMutation({
    mutationFn: () => {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, value.trim());
      body.append('acceptTerms', 'true');
      if (idFront) body.append('idFront', idFront);
      if (idBack) body.append('idBack', idBack);
      if (photo) body.append('photo', photo);
      return api<MyApplication>('/api/membership', { method: 'POST', form: body });
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(myApplicationQuery.queryKey, saved);
      await reload();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: () => top.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!valid) {
      top.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={submit} className="container-page grid max-w-3xl gap-5 py-8" noValidate>
      <div ref={top} className="grid gap-3">
        {existing && (
          <Alert tone="warning">
            <p>{existing.status === 'Rejected' ? 'لم يُقبل طلبك السابق.' : 'مطلوب تعديل طلبك.'} عدّل البيانات ثم أعد الإرسال.</p>
            {existing.reviewNote && <p className="mt-1 font-normal">ملاحظة المراجع: {existing.reviewNote}</p>}
          </Alert>
        )}
        {mutation.error && <Alert>{(mutation.error as ApiError).message}</Alert>}
        {touched && !valid && <Alert>بعض الحقول تحتاج مراجعة. الحقول المطلوبة مميزة بعلامة *</Alert>}
      </div>

      <Section step={1} title="البيانات الشخصية">
        <div className="sm:col-span-2">
          <Input label="الاسم رباعي" required value={form.fullName} onChange={set('fullName')} error={show('fullName')} autoComplete="name" />
        </div>
        <Input label="الرقم القومي" required dir="ltr" inputMode="numeric" value={form.nationalId} onChange={setDigits('nationalId', 14)} error={show('nationalId')}
          hint={existing ? 'أعد كتابة الرقم القومي للتأكيد.' : 'يُستخرج منه تاريخ الميلاد والنوع تلقائياً.'} />
        <Select label="المحافظة" required value={form.governorate} onChange={set('governorate')} error={show('governorate')}>
          {GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
        </Select>
        <Input label="المدينة / المركز" value={form.city} onChange={set('city')} />
        <Input label="العنوان بالتفصيل" required value={form.address} onChange={set('address')} error={show('address')} autoComplete="street-address" />
      </Section>

      <Section step={2} title="البيانات الدراسية">
        <Select label="الكلية" required value={form.collegeId} onChange={set('collegeId')} error={show('collegeId')} disabled={colleges.isPending}>
          <option value="">{colleges.isPending ? 'جارٍ تحميل الكليات…' : 'اختر الكلية'}</option>
          {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="الفرقة الدراسية" required value={form.level} onChange={set('level')} error={show('level')}>
          <option value="">اختر الفرقة</option>
          {LEVELS.map((name, i) => <option key={name} value={i + 1}>الفرقة {name}</option>)}
        </Select>
        <Input label="الرقم الجامعي (ID)" required dir="ltr" value={form.studentCode} onChange={(e) => setForm((f) => ({ ...f, studentCode: normalizeDigits(e.target.value) }))} error={show('studentCode')} />
        <Input label="القسم / البرنامج" value={form.department} onChange={set('department')} hint="اختياري" />
        {colleges.isError && <div className="sm:col-span-2"><ErrorState message="تعذر تحميل قائمة الكليات." onRetry={() => void colleges.refetch()} /></div>}
      </Section>

      <Section step={3} title="بيانات التواصل">
        <Input label="رقم الموبايل" required type="tel" dir="ltr" inputMode="numeric" value={form.phone} onChange={setDigits('phone', 11)} error={show('phone')} placeholder="01xxxxxxxxx" />
        <Input label="رقم الواتساب" type="tel" dir="ltr" inputMode="numeric" value={form.whatsApp} onChange={setDigits('whatsApp', 11)} error={show('whatsApp')} hint="اختياري — إن كان مختلفاً" />
        <div className="sm:col-span-2">
          <Input label="البريد الإلكتروني" required type="email" dir="ltr" value={form.email} onChange={set('email')} error={show('email')} />
        </div>
      </Section>

      <Section step={4} title="عنك">
        <div className="sm:col-span-2">
          <Select label="اللجنة التي تفضل المشاركة فيها" value={form.preferredCommittee} onChange={set('preferredCommittee')} hint="اختياري">
            <option value="">بدون تحديد</option>
            {COMMITTEES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <Textarea label="مهاراتك وهواياتك" value={form.skills} onChange={set('skills')} maxLength={1000} placeholder="مثال: تصميم، تصوير، تنظيم فعاليات، برمجة…" />
        <Textarea label="أنشطة شاركت فيها من قبل" value={form.previousActivities} onChange={set('previousActivities')} maxLength={1000} />
        <div className="sm:col-span-2">
          <Textarea label="لماذا تريد الانضمام للأسرة؟" value={form.motivation} onChange={set('motivation')} maxLength={1500} />
        </div>
      </Section>

      <Section step={5} title="صورة البطاقة">
        <div className="sm:col-span-2">
          <Alert tone="info">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4" /> صور البطاقة تُحفظ مشفّرة ولا يطّلع عليها إلا مسؤولو العضوية المخوّلون.</span>
          </Alert>
        </div>
        <ImagePicker label="وجه البطاقة" required={!existing} existing={!!existing} file={idFront} onChange={setIdFront} error={show('idFront')} />
        <ImagePicker label="ظهر البطاقة" required={!existing} existing={!!existing} file={idBack} onChange={setIdBack} error={show('idBack')} />
        <ImagePicker label="صورة شخصية" existing={existing?.hasPhoto} file={photo} onChange={setPhoto} hint="اختياري" />
      </Section>

      <Card className="p-5 sm:p-7">
        <Checkbox
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
          label="أقرّ بأن جميع البيانات المدخلة صحيحة، وأوافق على استخدامها لأغراض عضوية أسرة طلاب من أجل مصر بجامعة دمياط."
        />
        {show('accept') && <p role="alert" className="mt-2 text-sm font-semibold text-brand-700">{show('accept')}</p>}
        <Button type="submit" variant="gold" size="lg" loading={mutation.isPending} className="mt-5 w-full sm:w-auto">
          {existing ? 'إعادة إرسال الطلب' : 'إرسال طلب الانضمام'}
        </Button>
        {mutation.isPending && <p className="mt-2 text-sm text-ink-500">جارٍ رفع الصور… لا تغلق الصفحة.</p>}
      </Card>
    </form>
  );
}

export default function Join() {
  const { user, loading } = useAuth();
  const mine = useQuery({ ...myApplicationQuery, enabled: !!user });

  let content: ReactNode;
  if (loading || (user && mine.isPending)) content = <PageLoader />;
  else if (!user) content = <Gate />;
  else if (mine.isError) content = <div className="py-16"><ErrorState onRetry={() => void mine.refetch()} /></div>;
  else if (mine.data && (mine.data.status === 'Pending' || mine.data.status === 'Approved')) content = <StatusCard application={mine.data} />;
  else if (user.emailVerificationRequired) {
    content = (
      <div className="container-page py-12">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600"><ShieldCheck className="size-7" /></span>
          <h2 className="mt-4 text-2xl font-black">أكّد بريدك الإلكتروني أولاً</h2>
          <p className="mt-2 text-ink-600">أرسلنا رمزاً إلى بريدك عند إنشاء الحساب. أدخله في صفحة حسابك ثم عد لإكمال طلب الانضمام.</p>
          <LinkButton to="/account" className="mt-6">الذهاب إلى حسابي</LinkButton>
        </Card>
      </div>
    );
  }
  else content = <JoinForm existing={mine.data ?? null} />;

  return (
    <>
      <PageHeader title="انضم للأسرة" subtitle="سجّل بياناتك للانضمام إلى أسرة طلاب من أجل مصر بجامعة دمياط." />
      {content}
    </>
  );
}
