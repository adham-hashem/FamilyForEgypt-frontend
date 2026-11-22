import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, IdCard, Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { ImportMembers, MessageMembers, RenewMembers } from '../../components/MemberTools';
import { ReportActions, fetchAllPages } from '../../components/ReportActions';
import { StudentCardPanel } from '../../components/StudentCard';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Pagination, Select, cx, useToast } from '../../components/ui';
import { api, toQuery, type ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { GOVERNORATES, ROLE_LABELS, currentAcademicYear, levelLabel, levelOptions } from '../../lib/format';
import type { AdminUser, ApplicationDetail, ApplicationListItem, Paged } from '../../lib/types';
import { ImagePicker } from '../Join';
import { AdminTitle } from './AdminLayout';
import { useManagedColleges } from './Content';

const selectClass = 'h-10 rounded-xl border border-ink-300 bg-white px-3 text-sm font-semibold focus:border-flame-500 focus:outline-none';

function useDebounced(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface MemberFormState {
  fullName: string; nationalId: string; studentCode: string; collegeId: string; level: string; department: string;
  phone: string; email: string; governorate: string; city: string; address: string;
}

const EMPTY: MemberFormState = { fullName: '', nationalId: '', studentCode: '', collegeId: '', level: '1', department: '', phone: '', email: '', governorate: 'دمياط', city: '', address: '' };

/** A staff member's card: the same card, with their role in place of the student's department and level. */
function staffCardOf(user: AdminUser) {
  return {
    fullName: user.fullName,
    collegeName: user.collegeName ?? 'الأسرة — على مستوى الجامعة',
    department: null,
    level: 0,
    studentCode: `ST-${user.id.slice(0, 6).toUpperCase()}`,
    membershipNumber: `ST-${user.id.slice(0, 6).toUpperCase()}`,
    validYear: currentAcademicYear(),
    staffRole: ROLE_LABELS[user.role],
  };
}

/** The family's members: students who joined, and the administrators. Add, edit, remove and print a card for any of them. */
export function AdminMembers() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const colleges = useManagedColleges();
  const isUniversity = hasRole('UniversityAdmin');
  const [tab, setTab] = useState<'members' | 'staff'>('members');
  const [term, setTerm] = useState('');
  const q = useDebounced(term.trim());
  const [collegeId, setCollegeId] = useState('');
  const [page, setPage] = useState(1);
  const [cardOf, setCardOf] = useState<number | null>(null);
  const [staffCard, setStaffCard] = useState<AdminUser | null>(null);
  const [editing, setEditing] = useState<ApplicationDetail | 'new' | null>(null);
  const [removing, setRemoving] = useState<ApplicationListItem | null>(null);
  const [form, setForm] = useState<MemberFormState>(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'members', q, collegeId, page],
    queryFn: () => api<Paged<ApplicationListItem>>(`/api/admin/applications${toQuery({ status: 'Approved', q, collegeId, page, pageSize: 20 })}`),
    placeholderData: keepPreviousData,
    enabled: tab === 'members',
  });
  const staff = useQuery({
    queryKey: ['admin', 'staff-members'],
    queryFn: () => fetchAllPages<AdminUser>('/api/admin/users', { staffOnly: true }),
    enabled: tab === 'staff',
  });
  const card = useQuery({
    queryKey: ['admin', 'member-card', cardOf],
    queryFn: () => api<ApplicationDetail>(`/api/admin/applications/${cardOf}`),
    enabled: cardOf !== null,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });

  const openForm = async (item: ApplicationListItem | 'new') => {
    save.reset();
    setPhoto(null);
    if (item === 'new') {
      setForm({ ...EMPTY, collegeId: isUniversity ? '' : String(colleges.data?.[0]?.id ?? '') });
      setEditing('new');
      return;
    }
    const detail = await api<ApplicationDetail>(`/api/admin/applications/${item.id}`);
    setForm({
      fullName: detail.fullName, nationalId: detail.nationalId ?? '', studentCode: detail.studentCode, collegeId: String(detail.collegeId), level: String(detail.level),
      department: detail.department ?? '', phone: detail.phone, email: detail.email, governorate: detail.governorate, city: detail.city ?? '', address: detail.address,
    });
    setEditing(detail);
  };

  const save = useMutation({
    mutationFn: async () => {
      const fields = { ...form, collegeId: Number(form.collegeId), level: Number(form.level), department: form.department.trim() || null, city: form.city.trim() || null };
      if (editing === 'new') {
        const body = new FormData();
        for (const [key, value] of Object.entries(fields)) if (value !== null && value !== '') body.append(key, String(value));
        if (photo) body.append('photo', photo);
        return api('/api/admin/members', { method: 'POST', form: body });
      }
      const id = (editing as ApplicationDetail).id;
      await api(`/api/admin/applications/${id}`, { method: 'PUT', body: fields });
      if (photo) {
        const body = new FormData();
        body.append('photo', photo);
        await api(`/api/admin/members/${id}/photo`, { method: 'POST', form: body });
      }
      return null;
    },
    onSuccess: () => { toast(editing === 'new' ? 'تمت إضافة العضو وأُصدر له رقم عضوية وكارنيه.' : 'تم حفظ التعديلات.'); setEditing(null); refresh(); },
  });
  const uploadStaffPhoto = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const body = new FormData();
      body.append('photo', file);
      return api(`/api/admin/users/${id}/photo`, { method: 'POST', form: body });
    },
    onSuccess: () => { toast('تم حفظ الصورة.'); refresh(); },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم حذف العضو.'); setRemoving(null); refresh(); },
    onError: (error) => { toast((error as ApiError).message, 'error'); setRemoving(null); },
  });

  const set = <K extends keyof MemberFormState>(key: K, value: MemberFormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const formCollege = colleges.data?.find((c) => String(c.id) === form.collegeId);
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };
  const valid = form.fullName.trim().length >= 8 && form.nationalId.trim().length === 14 && form.studentCode.trim().length >= 3 && !!form.collegeId
    && /^01[0125]\d{8}$/.test(form.phone.trim()) && form.email.includes('@') && form.address.trim().length >= 5;

  return (
    <>
      <AdminTitle
        title="أعضاء الأسرة"
        subtitle="كل أعضاء الأسرة والمسؤولين: اعرض بيانات العضو، اطبع كارنيهه، أضِف عضواً أو عدّله أو احذفه."
        action={tab === 'members' ? (
          <div className="flex flex-wrap gap-2">
            <RenewMembers collegeId={collegeId} collegeName={colleges.data?.find((c) => String(c.id) === collegeId)?.name} />
            <MessageMembers colleges={colleges.data} collegeId={collegeId} />
            <ImportMembers />
            <ReportActions fileName="أعضاء-الأسرة" build={async () => {
              const items = await fetchAllPages<ApplicationListItem>('/api/admin/applications', { status: 'Approved', q, collegeId });
              return {
                title: 'أعضاء الأسرة',
                subtitle: [colleges.data?.find((c) => String(c.id) === collegeId)?.name, q && `بحث: ${q}`].filter(Boolean).join(' — '),
                sections: [{
                  columns: ['الاسم', 'رقم العضوية', 'الرقم الجامعي', 'الكلية', 'المستوى', 'الهاتف', 'ساري للعام'],
                  rows: items.map((m) => [m.fullName, m.membershipNumber, m.studentCode, m.collegeName, levelLabel(m.level, colleges.data?.find((c) => c.id === m.collegeId)?.studySystem), m.phone, m.validYear ? `${m.validYear}/${m.validYear + 1}` : '']),
                }],
              };
            }} />
            <Button size="sm" onClick={() => void openForm('new')}><UserPlus className="size-4" /> إضافة عضو</Button>
          </div>
        ) : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {([['members', 'الأعضاء'], ['staff', 'المسؤولون']] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cx('rounded-full border px-4 py-2 text-sm font-extrabold', tab === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white hover:border-brand-400')}>{label}</button>
        ))}
      </div>

      {tab === 'members' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <label className="relative min-w-52 flex-1">
              <span className="sr-only">بحث</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <input value={term} onChange={(e) => { setTerm(e.target.value); setPage(1); }} placeholder="ابحث بالاسم أو الرقم الجامعي أو الهاتف"
                className="h-10 w-full rounded-xl border border-ink-300 bg-white pe-3 ps-9 text-sm focus:border-flame-500 focus:outline-none" />
            </label>
            {isUniversity && (
              <select aria-label="الكلية" className={selectClass} value={collegeId} onChange={(e) => { setCollegeId(e.target.value); setPage(1); }}>
                <option value="">كل الكليات</option>
                {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          {list.isPending ? (
            <div className="grid gap-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-16" />)}</div>
          ) : list.isError ? (
            <ErrorState onRetry={() => void list.refetch()} />
          ) : list.data.items.length === 0 ? (
            <EmptyState title="لا يوجد أعضاء بهذا الاختيار" text="أضف عضواً بنفسك، أو اقبل طلبات الانضمام من «طلبات العضوية»." action={<Button onClick={() => void openForm('new')}><Plus className="size-4" /> إضافة عضو</Button>} />
          ) : (
            <>
              <p className="mb-2 text-sm font-bold text-ink-500">{list.data.total} عضو</p>
              <div className="grid gap-2">
                {list.data.items.map((m) => (
                  <Card key={m.id} className="flex flex-wrap items-center gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{m.fullName}</p>
                      <p className="truncate text-xs font-semibold text-ink-500">
                        {m.collegeName} · {levelLabel(m.level, colleges.data?.find((c) => c.id === m.collegeId)?.studySystem)} · <span dir="ltr">{m.membershipNumber ?? m.studentCode}</span>
                      </p>
                    </div>
                    {m.validYear && m.validYear < currentAcademicYear() ? <Badge tone="amber">تحتاج تجديد</Badge> : <Badge tone="green">ساري</Badge>}
                    <div className="flex shrink-0 gap-1">
                      <Button variant="outline" size="sm" onClick={() => setCardOf(m.id)}><IdCard className="size-4" /> الكارنيه</Button>
                      <button onClick={() => void openForm(m)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label={`تعديل ${m.fullName}`} title="تعديل"><Pencil className="size-5" /></button>
                      <button onClick={() => setRemoving(m)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label={`حذف ${m.fullName}`} title="حذف"><Trash2 className="size-5" /></button>
                    </div>
                  </Card>
                ))}
              </div>
              <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onChange={setPage} />
            </>
          )}
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-600">المسؤولون أعضاء في الأسرة أيضاً، ولكل واحد كارنيه بصفته الإدارية. لإضافة مسؤول أو تعديل صلاحياته استخدم صفحة «المسؤولون والصلاحيات».</p>
          {staff.isPending ? (
            <div className="grid gap-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-16" />)}</div>
          ) : staff.isError ? (
            <ErrorState onRetry={() => void staff.refetch()} />
          ) : (
            <div className="grid gap-2">
              {staff.data.map((u) => (
                <Card key={u.id} className={cx('flex flex-wrap items-center gap-3 p-3.5', !u.isActive && 'opacity-60')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{u.fullName}</p>
                    <p className="truncate text-xs font-semibold text-ink-500">{u.collegeName ?? 'الأسرة — على مستوى الجامعة'} · <span dir="ltr">{u.email}</span></p>
                  </div>
                  <Badge tone="brand">{ROLE_LABELS[u.role]}</Badge>
                  {!u.isActive && <Badge tone="amber">موقوف</Badge>}
                  {u.canManage && (
                    <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-ink-300 bg-white px-3 text-sm font-bold hover:border-brand-400">
                      <Camera className="size-4" /> {u.hasPhoto ? 'تغيير الصورة' : 'إضافة صورة'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadStaffPhoto.mutate({ id: u.id, file: f }); }} />
                    </label>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setStaffCard(u)}><IdCard className="size-4" /> الكارنيه</Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* the member's card, ready to print */}
      <Modal open={cardOf !== null} title="كارنيه العضو" onClose={() => setCardOf(null)} wide>
        {card.isPending ? <p className="py-8 text-center text-ink-500">جارٍ تحميل الكارنيه…</p> : card.data && (
          <StudentCardPanel
            student={{ ...card.data, validYear: card.data.validYear }}
            photoPath={card.data.hasPhoto ? `/api/admin/applications/${card.data.id}/files/photo` : null}
            codePath={`/api/admin/applications/${card.data.id}/card-code`}
          />
        )}
      </Modal>
      <Modal open={!!staffCard} title="كارنيه المسؤول" onClose={() => setStaffCard(null)} wide>
        {staffCard && <StudentCardPanel student={staffCardOf(staffCard)} code={`FFE-STAFF-${staffCard.id}`} photoPath={staffCard.hasPhoto ? `/api/admin/users/${staffCard.id}/photo` : null} />}
      </Modal>

      {/* add or edit a member */}
      <Modal open={!!editing} title={editing === 'new' ? 'إضافة عضو' : 'تعديل بيانات العضو'} onClose={() => setEditing(null)} wide>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          {save.error && <div className="sm:col-span-2"><Alert>{(save.error as ApiError).message}</Alert></div>}
          <div className="sm:col-span-2"><Input label="الاسم رباعياً" required maxLength={150} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} /></div>
          <Input label="الرقم القومي" required dir="ltr" inputMode="numeric" maxLength={14} value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} hint="14 رقماً" />
          <Input label="الرقم الجامعي" required dir="ltr" maxLength={30} value={form.studentCode} onChange={(e) => set('studentCode', e.target.value)} />
          <Select label="الكلية" required value={form.collegeId} onChange={(e) => { set('collegeId', e.target.value); set('level', '1'); }} disabled={!isUniversity && editing !== 'new'}>
            <option value="">اختر الكلية</option>
            {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="المستوى" required value={form.level} onChange={(e) => set('level', e.target.value)}>
            {levelOptions(formCollege?.levelsCount, formCollege?.studySystem).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="القسم / البرنامج" maxLength={120} value={form.department} onChange={(e) => set('department', e.target.value)} hint="اختياري" />
          <Input label="رقم الموبايل" required dir="ltr" inputMode="tel" maxLength={11} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01012345678" />
          <Input label="البريد الإلكتروني" required type="email" dir="ltr" maxLength={150} value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Select label="المحافظة" value={form.governorate} onChange={(e) => set('governorate', e.target.value)}>
            {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
          <Input label="المدينة / المركز" maxLength={80} value={form.city} onChange={(e) => set('city', e.target.value)} hint="اختياري" />
          <Input label="العنوان" required maxLength={250} value={form.address} onChange={(e) => set('address', e.target.value)} />
          <div className="sm:col-span-2">
            <ImagePicker label="الصورة الشخصية للكارنيه" hint="اختيارية. تظهر على الكارنيه." file={photo} onChange={setPhoto} existing={editing !== 'new' && !!editing && editing.hasPhoto} />
          </div>
          <p className="text-sm text-ink-600 sm:col-span-2">{editing === 'new' ? 'يُسجَّل العضو مقبولاً فوراً ويُعطى رقم عضوية وكارنيه، بدون صور البطاقة.' : 'التعديل لا يغيّر رقم العضوية.'}</p>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>تراجع</Button>
            <Button type="submit" loading={save.isPending} disabled={!valid}>{editing === 'new' ? 'إضافة العضو' : 'حفظ'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="حذف العضو"
        message={`حذف «${removing?.fullName ?? ''}» من أعضاء الأسرة نهائياً؟ يُحذف معه سجل حضوره وصورته. لا يمكن التراجع.`}
        confirmLabel="حذف نهائي"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}
