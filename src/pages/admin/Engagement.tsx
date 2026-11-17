import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Download, ImagePlus, Lightbulb, MousePointerClick, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, ErrorState, Input, LinkButton, Modal, PageLoader, Pagination, Select, Textarea, cx, useToast,
} from '../../components/ui';
import { api, fetchBlobUrl, mediaUrl, toQuery, type ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import {
  AD_PLACEMENT_LABELS, AD_REQUEST_STATUS_LABELS, COMPETITION_CATEGORY_LABELS, COMPETITION_FORMAT_LABELS, COMPETITION_MODE_LABELS,
  COURSE_KIND_LABELS, COURSE_LANGUAGES, FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, FEEDBACK_TOPIC_LABELS, TERMS, academicYearLabel, currentAcademicYear, currentTerm,
  formatDate, formatDateTime, formatNumber, fromLocalInput, levelLabel, levelOptions, levelWord, toLocalInput,
} from '../../lib/format';
import { COMPETITION_IDEAS, type CompetitionIdea } from '../../lib/competitionIdeas';
import { MORE_COMPETITION_IDEAS } from '../../lib/competitionIdeasMore';
import { MAX_PICKED_IMAGE } from '../../lib/images';
import type {
  AdAdmin, AdPlacement, AdRequest, AdRequestStatus, Competition, CompetitionCategory, CompetitionEntry, CompetitionFormat,
  CompetitionListItem, CompetitionMode, Course, FeedbackItem, FeedbackKind, FeedbackStatus, FeedbackTopic, Paged,
} from '../../lib/types';
import { DepartmentPicker, DepartmentsManager } from '../../components/Departments';
import { AdminTitle } from './AdminLayout';
import { useManagedColleges } from './Content';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** A college picker for university staff; college staff always work in their own college. */
function CollegePicker({ value, onChange, allowUniversity, label = 'الكلية' }: {
  value: string; onChange: (value: string) => void; allowUniversity?: boolean; label?: string;
}) {
  const { hasRole } = useAuth();
  const colleges = useManagedColleges();
  if (!hasRole('UniversityAdmin')) return null;
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{allowUniversity ? 'على مستوى الجامعة (كل الكليات)' : 'اختر الكلية'}</option>
      {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </Select>
  );
}

// ======================================================================
// Courses
// ======================================================================

type CourseFormState = {
  collegeId: string; name: string; code: string; level: string; term: string; department: string; instructor: string; description: string; isPublished: boolean;
  kind: string; creditHours: string; prerequisite: string; language: string;
};
const COURSE_EXTRAS = { kind: '0', creditHours: '', prerequisite: '', language: '' };

/** Last year's courses for the same level and term: tick to copy, or click one to fill the form. */
function CourseSuggestions({ collegeId, year, level, term, onPick, onCopied }: {
  collegeId: number | null; year: number; level: number; term: number; onPick: (course: Course) => void; onCopied: () => void;
}) {
  const toast = useToast();
  const [chosen, setChosen] = useState<number[]>([]);
  const { data } = useQuery({
    queryKey: ['admin', 'course-suggestions', collegeId, year, level, term],
    queryFn: () => api<{ fromYear: number | null; courses: Course[] }>(`/api/admin/courses/suggestions${toQuery({ collegeId: collegeId ?? undefined, academicYear: year, level, term })}`),
    enabled: level > 0 && term > 0,
  });
  useEffect(() => { setChosen(data?.courses.map((c) => c.id) ?? []); }, [data]);
  const copy = useMutation({
    mutationFn: () => api<{ added: number }>('/api/admin/courses/copy', { method: 'POST', body: { academicYear: year, courseIds: chosen } }),
    onSuccess: (r) => { toast(`تمت إضافة ${formatNumber(r.added)} مقرر.`); onCopied(); },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });
  if (!data?.fromYear || data.courses.length === 0) return null;
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:col-span-2">
      <p className="font-extrabold text-sky-900">💡 مقررات نفس المستوى والترم في {academicYearLabel(data.fromYear)}</p>
      <p className="text-sm text-sky-800">اضغط على اسم مقرر لتعبئة النموذج به، أو حدّد المقررات وأضفها كلها مرة واحدة.</p>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {data.courses.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
            <input type="checkbox" className="size-4 accent-brand-600" checked={chosen.includes(c.id)} aria-label={`تحديد ${c.name}`}
              onChange={(e) => setChosen((list) => (e.target.checked ? [...list, c.id] : list.filter((id) => id !== c.id)))} />
            <button type="button" onClick={() => onPick(c)} className="min-w-0 flex-1 truncate text-start font-bold hover:text-brand-700">
              {c.name}{c.code ? <span className="text-xs text-ink-500"> ({c.code})</span> : null}
            </button>
          </div>
        ))}
      </div>
      <Button size="sm" className="mt-3" disabled={chosen.length === 0} loading={copy.isPending} onClick={() => copy.mutate()}>
        إضافة المحدد ({formatNumber(chosen.length)}) إلى {academicYearLabel(year)}
      </Button>
    </div>
  );
}

export function AdminCourses() {
  const { hasRole, user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const colleges = useManagedColleges();
  const [collegeId, setCollegeId] = useState('');
  const [year, setYear] = useState(currentAcademicYear());
  const [level, setLevel] = useState(0);
  const [term, setTerm] = useState(currentTerm());
  const [editing, setEditing] = useState<Course | 'new' | null>(null);
  const [removing, setRemoving] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseFormState>({ collegeId: '', name: '', code: '', level: '1', term: '1', department: '', instructor: '', description: '', isPublished: true, ...COURSE_EXTRAS });
  const [managingDepartments, setManagingDepartments] = useState(false);
  const effectiveCollege = hasRole('UniversityAdmin') ? Number(collegeId) || null : user?.collegeId ?? null;
  const formCollege = hasRole('UniversityAdmin') ? Number(form.collegeId) || null : user?.collegeId ?? null;
  const activeCollege = colleges.data?.find((c) => c.id === (editing ? formCollege : effectiveCollege));
  const levelsCount = activeCollege?.levelsCount ?? 7;
  const system = activeCollege?.studySystem;
  const list = useQuery({
    queryKey: ['admin', 'courses', collegeId || null, year, level, term],
    queryFn: () => api<Course[]>(`/api/admin/courses${toQuery({ collegeId: collegeId || undefined, academicYear: year, level: level || undefined, term: term || undefined })}`),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
  const years = Array.from({ length: 6 }, (_, i) => currentAcademicYear() + 1 - i);

  const open = (course: Course | 'new') => {
    save.reset();
    setForm(course === 'new'
      ? { collegeId, name: '', code: '', level: String(level || 1), term: String(term || 1), department: '', instructor: '', description: '', isPublished: true, ...COURSE_EXTRAS }
      : { collegeId: String(course.collegeId), name: course.name, code: course.code ?? '', level: String(course.level), term: String(course.term),
          department: course.department ?? '', instructor: course.instructor ?? '', description: course.description ?? '', isPublished: course.isPublished,
          kind: String(course.kind ?? 0), creditHours: course.creditHours ? String(course.creditHours) : '', prerequisite: course.prerequisite ?? '', language: course.language ?? '' });
    setEditing(course);
  };
  const fillFrom = (c: Course) => setForm((f) => ({ ...f, name: c.name, code: c.code ?? '', instructor: c.instructor ?? '', department: c.department ?? '', description: c.description ?? '',
    kind: String(c.kind ?? 0), creditHours: c.creditHours ? String(c.creditHours) : '', prerequisite: c.prerequisite ?? '', language: c.language ?? '' }));
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, academicYear: editing === 'new' ? year : (editing as Course).academicYear, collegeId: form.collegeId ? Number(form.collegeId) : null,
        level: Number(form.level), term: Number(form.term), code: form.code.trim() || null, department: form.department.trim() || null,
        instructor: form.instructor.trim() || null, description: form.description.trim() || null,
        kind: Number(form.kind), creditHours: form.creditHours ? Number(form.creditHours) : null,
        prerequisite: form.prerequisite.trim() || null, language: form.language.trim() || null };
      return editing === 'new' ? api('/api/admin/courses', { method: 'POST', body }) : api(`/api/admin/courses/${(editing as Course).id}`, { method: 'PUT', body });
    },
    onSuccess: () => { toast('تم حفظ المقرر.'); setEditing(null); refresh(); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/courses/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم حذف المقرر.'); setRemoving(null); refresh(); },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });

  const levels = [...new Set((list.data ?? []).map((c) => c.level))].sort((a, b) => (a || 99) - (b || 99));
  return (
    <>
      <AdminTitle title="المقررات" subtitle="مقررات كل عام جامعي ومستوى وترم. عند إضافة مقررات عام جديد تظهر لك مقررات العام السابق لنفس المستوى والترم لتضيفها بضغطة."
        action={<div className="flex flex-wrap gap-2">
          {effectiveCollege && hasRole('CollegeAdmin') && <Button variant="outline" onClick={() => setManagingDepartments(true)}>الأقسام والشعب</Button>}
          <Button onClick={() => open('new')}><Plus className="size-4" /> مقرر جديد</Button>
        </div>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasRole('UniversityAdmin') && <CollegePicker value={collegeId} onChange={setCollegeId} label="الكلية" />}
        <Select label="العام الجامعي" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{academicYearLabel(y)}{y === currentAcademicYear() ? ' (الحالي)' : ''}</option>)}
        </Select>
        <Select label={levelWord(system)} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
          <option value={0}>{levelLabel(0, system)}</option>
          {levelOptions(levelsCount, system).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select label="الترم" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
          <option value={0}>كل الترمات</option>
          {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{TERMS[t]}</option>)}
        </Select>
      </Card>
      {(!hasRole('UniversityAdmin') || collegeId) && level > 0 && term > 0 && (
        <div className="mb-4"><CourseSuggestions collegeId={effectiveCollege} year={year} level={level} term={term} onPick={(c) => { open('new'); fillFrom(c); }} onCopied={refresh} /></div>
      )}
      {list.isPending ? <PageLoader /> : list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : list.data.length === 0 ? (
        <EmptyState title={`لا توجد مقررات في ${academicYearLabel(year)} لهذا الاختيار`} text={level && term ? 'أضف مقرراً جديداً، أو انسخ مقررات العام السابق من الاقتراحات.' : 'اختر المستوى والترم لتظهر لك مقررات العام السابق كاقتراحات.'}
          action={<Button onClick={() => open('new')}><Plus className="size-4" /> مقرر جديد</Button>} />
      ) : (
        <div className="grid gap-6">
          {levels.map((lv) => (
            <section key={lv}>
              <h2 className="mb-2 font-black">{levelLabel(lv, system)}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {list.data.filter((c) => c.level === lv).map((course) => (
                  <Card key={course.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{course.name} {!course.isPublished && <Badge tone="amber">مخفي</Badge>}</p>
                      <p className="truncate text-sm text-ink-500">
                        {[course.code, course.term ? TERMS[course.term] : null, course.kind ? COURSE_KIND_LABELS[course.kind] : null, course.creditHours ? `${course.creditHours} ساعات` : null, course.department, course.instructor, hasRole('UniversityAdmin') ? course.collegeName : null].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs font-bold text-ink-400">{formatNumber(course.resourcesCount)} عنصر</p>
                    </div>
                    <LinkButton to={`/courses/${course.id}`} variant="ghost" size="sm">عرض</LinkButton>
                    <button onClick={() => open(course)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label={`تعديل ${course.name}`}><Pencil className="size-5" /></button>
                    <button onClick={() => setRemoving(course)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label={`حذف ${course.name}`}><Trash2 className="size-5" /></button>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal open={!!editing} title={editing === 'new' ? `مقرر جديد — ${academicYearLabel(year)}` : `تعديل المقرر — ${academicYearLabel((editing as Course | null)?.academicYear ?? year)}`} onClose={() => setEditing(null)} wide>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
          {save.error && <div className="sm:col-span-2"><Alert>{(save.error as ApiError).message}</Alert></div>}
          {editing === 'new' && <div className="sm:col-span-2"><CollegePicker value={form.collegeId} onChange={(v) => setForm((f) => ({ ...f, collegeId: v }))} /></div>}
          <Select label={levelWord(system)} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
            <option value="0">{levelLabel(0, system)}</option>
            {levelOptions(levelsCount, system).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="الترم" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{TERMS[t]}</option>)}
          </Select>
          {editing === 'new' && (
            <CourseSuggestions collegeId={formCollege} year={year} level={Number(form.level)} term={Number(form.term)} onPick={fillFrom} onCopied={() => { setEditing(null); refresh(); }} />
          )}
          <div className="sm:col-span-2"><Input label="اسم المقرر" required maxLength={150} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            hint={editing === 'new' ? 'مقرر جديد لم يُدرَّس من قبل؟ اكتب اسمه مباشرة.' : undefined} /></div>
          <Input label="كود المقرر" dir="ltr" maxLength={30} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} hint="اختياري — مثل CS201" />
          <Input label="أستاذ المقرر" maxLength={120} value={form.instructor} onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))} hint="اختياري" />
          <div className="sm:col-span-2"><DepartmentPicker collegeId={formCollege} value={form.department} onChange={(department) => setForm((f) => ({ ...f, department }))} /></div>
          <Select label="نوع المقرر" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
            {Object.entries(COURSE_KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
          <Select label={system?.usesCredits ? 'الساعات / النقاط المعتمدة' : 'عدد الساعات الأسبوعية'} value={form.creditHours} onChange={(e) => setForm((f) => ({ ...f, creditHours: e.target.value }))}>
            <option value="">غير محدد</option>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <Select label="لغة التدريس" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}>
            <option value="">غير محدد</option>
            {COURSE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Input label="المتطلب السابق" maxLength={150} value={form.prerequisite} onChange={(e) => setForm((f) => ({ ...f, prerequisite: e.target.value }))} hint="اختياري — اسم أو كود المقرر" />
          <div className="sm:col-span-2"><Textarea label="وصف المقرر" maxLength={3000} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Checkbox checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} label="ظاهر للطلاب" /></div>
          <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={save.isPending}>حفظ</Button><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button></div>
        </form>
      </Modal>
      <DepartmentsManager open={managingDepartments} onClose={() => setManagingDepartments(false)} collegeId={effectiveCollege} collegeName={activeCollege?.name ?? ''} />
      <ConfirmDialog open={!!removing} title="حذف المقرر" message={`سيُحذف «${removing?.name ?? ''}». المحتوى المرفوع تحته لن يُحذف وسيبقى في صفحة الكلية.`}
        confirmLabel="حذف" loading={remove.isPending} onConfirm={() => removing && remove.mutate(removing.id)} onClose={() => setRemoving(null)} />
    </>
  );
}

// ======================================================================
// Competitions
// ======================================================================

export function AdminCompetitions() {
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['admin', 'competitions'], queryFn: () => api<CompetitionListItem[]>('/api/admin/competitions') });
  return (
    <>
      <AdminTitle title="المسابقات" subtitle="مسابقات على أرض الواقع يسجّل لها الطلاب، أو مسابقات كاملة على الموقع: فزورة، أسئلة اختيارات، أو إرسال عمل."
        action={<LinkButton to="/admin/competitions/new"><Plus className="size-4" /> مسابقة جديدة</LinkButton>} />
      {isPending ? <PageLoader /> : isError ? <ErrorState onRetry={() => void refetch()} /> : data.length === 0 ? (
        <EmptyState title="لا توجد مسابقات بعد" action={<LinkButton to="/admin/competitions/new"><Plus className="size-4" /> مسابقة جديدة</LinkButton>} />
      ) : (
        <div className="grid gap-2">
          {data.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <Trophy className="size-6 shrink-0 text-gold-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{c.title}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{COMPETITION_CATEGORY_LABELS[c.category]}</Badge>
                  <Badge>{COMPETITION_FORMAT_LABELS[c.format]}</Badge>
                  {!c.isPublished ? <Badge tone="amber">مسودة</Badge> : c.isOpen ? <Badge tone="green">مفتوحة</Badge> : <Badge>مغلقة</Badge>}
                  {c.resultsPublished && <Badge tone="gold">النتائج معلنة</Badge>}
                  <span className="text-xs font-bold text-ink-500">{c.collegeName ?? 'الجامعة'} · {formatNumber(c.entriesCount)} مشارك</span>
                </div>
              </div>
              <LinkButton to={`/admin/competitions/${c.id}/entries`} variant="outline" size="sm">المشاركات</LinkButton>
              <LinkButton to={`/admin/competitions/${c.id}`} variant="ghost" size="sm"><Pencil className="size-4" /> تعديل</LinkButton>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

type QuestionState = { text: string; options: string[]; correct: number };

const ALL_IDEAS = [...COMPETITION_IDEAS, ...MORE_COMPETITION_IDEAS];

/** Ready-made competition ideas: one tap fills the form below, which the organiser then adjusts. */
function IdeasPanel({ onPick }: { onPick: (idea: CompetitionIdea) => void }) {
  const [mode, setMode] = useState<CompetitionMode | ''>('');
  const [category, setCategory] = useState<CompetitionCategory | ''>('');
  const ideas = ALL_IDEAS.filter((i) => (!mode || i.mode === mode) && (!category || i.category === category));
  return (
    <Card className="mb-5 p-5 sm:p-6">
      <details open>
        <summary className="flex cursor-pointer items-center gap-2 text-lg font-extrabold"><Lightbulb className="size-5 text-gold-500" aria-hidden /> أفكار جاهزة للمسابقات</summary>
        <p className="mb-3 mt-2 text-sm text-ink-600">اختر فكرة وسيتم ملء النموذج بها، وبعدها عدّل العنوان والتفاصيل والأسئلة كما تريد.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {([['', 'الكل'], ['Online', COMPETITION_MODE_LABELS.Online], ['OnSite', COMPETITION_MODE_LABELS.OnSite]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value}
              className={cx('rounded-full border px-3 py-1.5 text-sm font-bold', mode === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white hover:border-brand-400')}>{label}</button>
          ))}
          <select value={category} onChange={(e) => setCategory(e.target.value as CompetitionCategory | '')} aria-label="تصنيف الفكرة"
            className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-bold">
            <option value="">كل التصنيفات</option>
            {(Object.keys(COMPETITION_CATEGORY_LABELS) as CompetitionCategory[]).map((c) => <option key={c} value={c}>{COMPETITION_CATEGORY_LABELS[c]}</option>)}
          </select>
          <span className="self-center text-sm text-ink-500">{formatNumber(ideas.length)} فكرة</span>
        </div>
        {ideas.length === 0 && <p className="py-4 text-center text-ink-500">لا توجد أفكار بهذا الاختيار.</p>}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <li key={idea.title}>
              <button type="button" onClick={() => onPick(idea)} className="flex h-full w-full flex-col items-start gap-1 rounded-xl border border-ink-200 bg-white p-3 text-start hover:border-brand-400 hover:bg-brand-50">
                <span className="font-extrabold">{idea.title}</span>
                <span className="text-sm text-ink-600">{idea.blurb}</span>
                <span className="mt-auto flex flex-wrap gap-1 pt-1">
                  <Badge tone="brand">{COMPETITION_CATEGORY_LABELS[idea.category]}</Badge>
                  <Badge tone="neutral">{idea.mode === 'OnSite' ? 'تسجيل حضوري' : COMPETITION_FORMAT_LABELS[idea.format]}</Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

export function CompetitionEditor() {
  const { id } = useParams();
  const existing = useQuery({ queryKey: ['competition', id], queryFn: () => api<Competition>(`/api/competitions/${id}`), enabled: !!id && id !== 'new' });
  if (id && id !== 'new' && existing.isPending) return <PageLoader />;
  if (existing.error) return <EmptyState title="المسابقة غير موجودة" action={<LinkButton to="/admin/competitions">رجوع</LinkButton>} />;
  return <CompetitionForm key={id ?? 'new'} competition={existing.data ?? null} />;
}

function CompetitionForm({ competition }: { competition: Competition | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const imageInput = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);
  const [form, setForm] = useState({
    collegeId: competition?.collegeId ? String(competition.collegeId) : '',
    title: competition?.title ?? '',
    description: competition?.description ?? '',
    category: (competition?.category ?? 'Cultural') as CompetitionCategory,
    mode: (competition?.mode ?? 'Online') as CompetitionMode,
    format: (competition?.format ?? 'Riddle') as CompetitionFormat,
    prize: competition?.prize ?? '',
    rules: competition?.rules ?? '',
    location: competition?.location ?? '',
    eventAt: toLocalInput(competition?.eventAt),
    opensAt: toLocalInput(competition?.opensAt),
    closesAt: toLocalInput(competition?.closesAt),
    question: competition?.question ?? '',
    acceptedAnswers: (competition?.acceptedAnswers ?? []).join('\n'),
    isPublished: competition?.isPublished ?? true,
  });
  const [questions, setQuestions] = useState<QuestionState[]>(
    competition?.questions.length ? competition.questions.map((q) => ({ text: q.text, options: q.options, correct: q.correct ?? 0 })) : [{ text: '', options: ['', ''], correct: 0 }],
  );
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const applyIdea = (idea: CompetitionIdea) => {
    setForm((f) => ({
      ...f, title: idea.title, description: idea.description, category: idea.category, mode: idea.mode, format: idea.format,
      prize: idea.prize ?? '', rules: idea.rules ?? '', location: idea.location ?? '', question: idea.question ?? '',
      acceptedAnswers: (idea.acceptedAnswers ?? []).join('\n'),
    }));
    setQuestions(idea.questions?.length ? idea.questions.map((q) => ({ ...q })) : [{ text: '', options: ['', ''], correct: 0 }]);
    toast('تم ملء النموذج بالفكرة. عدّل ما تريد ثم احفظ.');
  };
  const setMode = (mode: CompetitionMode) => setForm((f) => ({ ...f, mode, format: mode === 'OnSite' ? 'Registration' : f.format === 'Registration' ? 'Riddle' : f.format }));

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        collegeId: form.collegeId ? Number(form.collegeId) : null,
        prize: form.prize.trim() || null, rules: form.rules.trim() || null, location: form.location.trim() || null,
        eventAt: form.eventAt ? fromLocalInput(form.eventAt) : null,
        opensAt: form.opensAt ? fromLocalInput(form.opensAt) : null,
        closesAt: form.closesAt ? fromLocalInput(form.closesAt) : null,
        question: form.question.trim() || null,
        acceptedAnswers: form.acceptedAnswers.split('\n').map((a) => a.trim()).filter(Boolean),
        questions: form.format === 'Quiz' ? questions.map((q) => ({ text: q.text, options: q.options.filter((o) => o.trim()), correct: q.correct })) : [],
      };
      if (competition) {
        await api(`/api/admin/competitions/${competition.id}`, { method: 'PUT', body });
        return competition.id;
      }
      return (await api<{ id: number }>('/api/admin/competitions', { method: 'POST', body })).id;
    },
    onSuccess: (savedId) => {
      toast('تم حفظ المسابقة.');
      void queryClient.invalidateQueries();
      navigate(competition ? '/admin/competitions' : `/admin/competitions/${savedId}`);
    },
  });
  const image = useMutation({
    mutationFn: (file: File | null) => {
      if (!file) return api(`/api/admin/competitions/${competition!.id}/image`, { method: 'DELETE' });
      const body = new FormData();
      body.append('image', file);
      return api(`/api/admin/competitions/${competition!.id}/image`, { method: 'POST', form: body });
    },
    onSuccess: () => { toast('تم تحديث الصورة.'); void queryClient.invalidateQueries({ queryKey: ['competition'] }); },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/admin/competitions/${competition!.id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم حذف المسابقة.'); void queryClient.invalidateQueries(); navigate('/admin/competitions'); },
    onError: (error) => toast((error as ApiError).message, 'error'),
  });

  const updateQuestion = (index: number, change: Partial<QuestionState>) => setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...change } : q)));

  return (
    <>
      <Link to="/admin/competitions" className="mb-2 flex items-center gap-1 text-sm font-bold text-ink-500 hover:text-brand-700"><ArrowRight className="size-4" /> كل المسابقات</Link>
      <AdminTitle title={competition ? 'تعديل المسابقة' : 'مسابقة جديدة'} action={competition && <LinkButton to={`/competitions/${competition.id}`} variant="outline" size="sm">عرض الصفحة</LinkButton>} />
      {!competition && <IdeasPanel onPick={applyIdea} />}
      <form className="grid gap-5" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {save.error && <Alert>{(save.error as ApiError).message}</Alert>}
        <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2"><Input label="عنوان المسابقة" required maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="مثال: فزورة الأسبوع" /></div>
          <Select label="النوع" value={form.category} onChange={(e) => set('category', e.target.value as CompetitionCategory)}>
            {(Object.keys(COMPETITION_CATEGORY_LABELS) as CompetitionCategory[]).map((c) => <option key={c} value={c}>{COMPETITION_CATEGORY_LABELS[c]}</option>)}
          </Select>
          {!competition && <CollegePicker value={form.collegeId} onChange={(v) => set('collegeId', v)} allowUniversity label="لمن؟" />}
          <Select label="تُقام" value={form.mode} onChange={(e) => setMode(e.target.value as CompetitionMode)}>
            {(Object.keys(COMPETITION_MODE_LABELS) as CompetitionMode[]).map((m) => <option key={m} value={m}>{COMPETITION_MODE_LABELS[m]}</option>)}
          </Select>
          {form.mode === 'Online' && (
            <Select label="شكل المسابقة" value={form.format} onChange={(e) => set('format', e.target.value as CompetitionFormat)} disabled={!!competition?.entriesCount}>
              {(['Riddle', 'Quiz', 'Submission'] as CompetitionFormat[]).map((f) => <option key={f} value={f}>{COMPETITION_FORMAT_LABELS[f]}</option>)}
            </Select>
          )}
          <div className="sm:col-span-2"><Textarea label="الوصف" required rows={4} maxLength={6000} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <Input label="الجائزة" maxLength={300} value={form.prize} onChange={(e) => set('prize', e.target.value)} hint="اختياري" />
          {form.mode === 'OnSite' && <Input label="المكان" maxLength={250} value={form.location} onChange={(e) => set('location', e.target.value)} />}
          {form.mode === 'OnSite' && <Input label="موعد المسابقة" type="datetime-local" value={form.eventAt} onChange={(e) => set('eventAt', e.target.value)} />}
          <Input label={form.mode === 'OnSite' ? 'بداية التسجيل' : 'بداية المشاركة'} type="datetime-local" value={form.opensAt} onChange={(e) => set('opensAt', e.target.value)} hint="اختياري — فارغ يعني من الآن" />
          <Input label={form.mode === 'OnSite' ? 'آخر موعد للتسجيل' : 'آخر موعد للمشاركة'} type="datetime-local" value={form.closesAt} onChange={(e) => set('closesAt', e.target.value)} hint="اختياري" />
          <div className="sm:col-span-2"><Textarea label="الشروط" rows={3} maxLength={4000} value={form.rules} onChange={(e) => set('rules', e.target.value)} hint="اختياري" /></div>
        </Card>

        {form.format === 'Riddle' && (
          <Card className="grid gap-4 p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">الفزورة</h2>
            <Textarea label="نص الفزورة / السؤال" required rows={3} maxLength={4000} value={form.question} onChange={(e) => set('question', e.target.value)} />
            <Textarea label="الإجابات الصحيحة المقبولة" rows={3} value={form.acceptedAnswers} onChange={(e) => set('acceptedAnswers', e.target.value)}
              hint="كل إجابة في سطر. تُصحَّح المشاركات تلقائياً مع تجاهل التشكيل والهمزات و«ال». اتركها فارغة للتصحيح يدوياً. لا تظهر للطلاب إلا بعد إعلان النتائج." />
          </Card>
        )}

        {form.format === 'Submission' && (
          <Card className="grid gap-4 p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">المطلوب من المشاركين</h2>
            <Textarea label="المطلوب" rows={3} maxLength={4000} value={form.question} onChange={(e) => set('question', e.target.value)} placeholder="مثال: صورة لأجمل مكان في الحرم الجامعي" />
          </Card>
        )}

        {form.format === 'Quiz' && (
          <Card className="grid gap-4 p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">الأسئلة <span className="text-sm font-semibold text-ink-500">(اضغط على الاختيار الصحيح لتحديده)</span></h2>
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-2xl border border-ink-200 p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1"><Input label={`السؤال ${qi + 1}`} value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} /></div>
                  {questions.length > 1 && <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))} className="mt-7 rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label={`حذف السؤال ${qi + 1}`}><Trash2 className="size-5" /></button>}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((option, oi) => (
                    <div key={oi} className={cx('flex items-center gap-2 rounded-xl border-2 p-1.5 ps-3', q.correct === oi ? 'border-emerald-500 bg-emerald-50' : 'border-ink-200')}>
                      <button type="button" onClick={() => updateQuestion(qi, { correct: oi })} aria-pressed={q.correct === oi}
                        className={cx('size-5 shrink-0 rounded-full border-2', q.correct === oi ? 'border-emerald-600 bg-emerald-600' : 'border-ink-300')} aria-label={`الاختيار ${oi + 1} هو الصحيح`} />
                      <input value={option} onChange={(e) => updateQuestion(qi, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })}
                        placeholder={`الاختيار ${oi + 1}`} className="min-w-0 flex-1 bg-transparent py-1.5 font-semibold outline-none" />
                      {q.options.length > 2 && (
                        <button type="button" onClick={() => updateQuestion(qi, { options: q.options.filter((_, i) => i !== oi), correct: q.correct >= oi && q.correct > 0 ? q.correct - 1 : q.correct })}
                          className="rounded p-1 text-ink-400 hover:text-brand-600" aria-label="حذف الاختيار"><X className="size-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
                {q.options.length < 6 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => updateQuestion(qi, { options: [...q.options, ''] })}><Plus className="size-4" /> اختيار</Button>}
              </div>
            ))}
            {questions.length < 50 && <Button variant="outline" onClick={() => setQuestions((qs) => [...qs, { text: '', options: ['', ''], correct: 0 }])}><Plus className="size-4" /> سؤال جديد</Button>}
          </Card>
        )}

        {competition && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-extrabold">صورة المسابقة</h2>
            {competition.imageUrl && <img src={mediaUrl(competition.thumbUrl ?? competition.imageUrl)} alt="" className="mb-3 w-full max-w-sm rounded-xl border border-ink-200" />}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => imageInput.current?.click()} loading={image.isPending}><ImagePlus className="size-4" /> {competition.imageUrl ? 'استبدال الصورة' : 'رفع صورة'}</Button>
              {competition.imageUrl && <Button variant="danger" onClick={() => image.mutate(null)}>إزالة</Button>}
            </div>
            <input ref={imageInput} type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" tabIndex={-1}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && f.size <= MAX_PICKED_IMAGE) image.mutate(f); else if (f) toast('الصورة حتى 25 ميجابايت.', 'error'); }} />
          </Card>
        )}
        {!competition && <p className="text-sm text-ink-500">تقدر تضيف صورة للمسابقة بعد الحفظ.</p>}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200 bg-white/95 p-3 shadow-lift backdrop-blur">
          <Checkbox checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} label="منشورة للطلاب" />
          <Button type="submit" loading={save.isPending}>حفظ</Button>
          {competition && <Button variant="danger" onClick={() => setRemoving(true)}><Trash2 className="size-4" /> حذف</Button>}
        </div>
      </form>
      <ConfirmDialog open={removing} title="حذف المسابقة" message="ستُحذف المسابقة وكل مشاركاتها نهائياً." confirmLabel="حذف"
        loading={remove.isPending} onConfirm={() => remove.mutate()} onClose={() => setRemoving(false)} />
    </>
  );
}

function EntryFileButton({ competitionId, entry }: { competitionId: number; entry: CompetitionEntry }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    try {
      const url = await fetchBlobUrl(`/api/admin/competitions/${competitionId}/entries/${entry.id}/file`);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = entry.fileName ?? 'file';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast('تعذر فتح الملف.', 'error');
    } finally {
      setLoading(false);
    }
  };
  return <Button variant="outline" size="sm" loading={loading} onClick={() => void open()}><Download className="size-4" /> {entry.fileName ?? 'الملف'}</Button>;
}

export function CompetitionEntriesPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const competition = useQuery({ queryKey: ['competition', id], queryFn: () => api<Competition>(`/api/competitions/${id}`) });
  const entries = useQuery({ queryKey: ['admin', 'entries', id], queryFn: () => api<CompetitionEntry[]>(`/api/admin/competitions/${id}/entries`) });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['admin', 'entries', id] }); void queryClient.invalidateQueries({ queryKey: ['competition', id] }); };
  const judge = useMutation({
    mutationFn: ({ entry, change }: { entry: CompetitionEntry; change: Partial<CompetitionEntry> }) => api(`/api/admin/competitions/${id}/entries/${entry.id}`, {
      method: 'PUT', body: { isCorrect: entry.isCorrect, score: entry.score, isWinner: entry.isWinner, rank: entry.rank, ...change },
    }),
    onSuccess: refresh,
    onError: (error) => toast((error as ApiError).message, 'error'),
  });
  const results = useMutation({
    mutationFn: (publish: boolean) => api(`/api/admin/competitions/${id}/results${toQuery({ publish })}`, { method: 'POST' }),
    onSuccess: (_, publish) => { toast(publish ? 'تم إعلان النتائج.' : 'تم إخفاء النتائج.'); refresh(); },
  });

  if (competition.isPending || entries.isPending) return <PageLoader />;
  if (competition.isError || entries.isError) return <ErrorState onRetry={() => { void competition.refetch(); void entries.refetch(); }} />;
  const c = competition.data;
  const winners = entries.data.filter((e) => e.isWinner).length;

  return (
    <>
      <Link to="/admin/competitions" className="mb-2 flex items-center gap-1 text-sm font-bold text-ink-500 hover:text-brand-700"><ArrowRight className="size-4" /> كل المسابقات</Link>
      <AdminTitle title={`مشاركات: ${c.title}`} subtitle={`${COMPETITION_FORMAT_LABELS[c.format]} · ${formatNumber(entries.data.length)} مشارك · ${formatNumber(winners)} فائز`}
        action={c.resultsPublished
          ? <Button variant="outline" loading={results.isPending} onClick={() => results.mutate(false)}>إخفاء النتائج</Button>
          : <Button variant="gold" loading={results.isPending} onClick={() => results.mutate(true)} disabled={winners === 0}><Trophy className="size-4" /> إعلان النتائج</Button>} />
      {!c.resultsPublished && <Alert tone="info">حدّد الفائزين وترتيبهم، ثم اضغط «إعلان النتائج» ليظهروا في صفحة المسابقة{c.format === 'Riddle' ? ' مع الإجابة الصحيحة' : ''}.</Alert>}
      {entries.data.length === 0 ? <div className="mt-4"><EmptyState title="لا توجد مشاركات بعد" /></div> : (
        <div className="mt-4 grid gap-2">
          {entries.data.map((entry) => (
            <Card key={entry.id} className={cx('grid gap-3 p-4', entry.isWinner && 'ring-2 ring-gold-400')}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{entry.fullName}</p>
                  <p className="text-sm text-ink-500">
                    {entry.collegeName} · {levelLabel(entry.level)}{entry.department ? ` · ${entry.department}` : ''} · <span dir="ltr">{entry.nationalIdMasked}</span>
                    {entry.phone && <> · <a href={`tel:${entry.phone}`} className="text-brand-700" dir="ltr">{entry.phone}</a></>}
                  </p>
                  <p className="text-xs text-ink-400">{formatDateTime(entry.createdAt)}</p>
                </div>
                {entry.isCorrect !== null && <Badge tone={entry.isCorrect ? 'green' : 'brand'}>{entry.isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}</Badge>}
                {c.format === 'Quiz' && entry.score !== null && <Badge tone="dark">{entry.score} / {c.questions.length}</Badge>}
              </div>
              {entry.answer && <p className="whitespace-pre-line rounded-xl bg-sand p-3 font-semibold">{entry.answer}</p>}
              {entry.hasFile && <div><EntryFileButton competitionId={c.id} entry={entry} /></div>}
              <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                {(c.format === 'Riddle' || c.format === 'Submission') && (
                  <>
                    <Button size="sm" variant={entry.isCorrect === true ? 'primary' : 'outline'} onClick={() => judge.mutate({ entry, change: { isCorrect: true } })}>صحيحة</Button>
                    <Button size="sm" variant={entry.isCorrect === false ? 'danger' : 'ghost'} onClick={() => judge.mutate({ entry, change: { isCorrect: false } })}>خاطئة</Button>
                  </>
                )}
                <Checkbox checked={entry.isWinner} onChange={(e) => judge.mutate({ entry, change: { isWinner: e.target.checked, rank: e.target.checked ? entry.rank ?? winners + 1 : null } })} label="فائز" />
                {entry.isWinner && (
                  <label className="flex items-center gap-2 text-sm font-bold">المركز
                    <input type="number" min={1} max={1000} defaultValue={entry.rank ?? ''} className="w-20 rounded-lg border border-ink-300 px-2 py-1"
                      onBlur={(e) => { const rank = Number(e.target.value) || null; if (rank !== entry.rank) judge.mutate({ entry, change: { rank } }); }} />
                  </label>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ======================================================================
// Suggestions and complaints
// ======================================================================

export function AdminFeedback() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const colleges = useManagedColleges();
  const [filter, setFilter] = useState<{ kind: FeedbackKind | ''; topic: FeedbackTopic | ''; status: FeedbackStatus | ''; collegeId: string }>({ kind: '', topic: '', status: '', collegeId: '' });
  const [page, setPage] = useState(1);
  const [answering, setAnswering] = useState<FeedbackItem | null>(null);
  const [reply, setReply] = useState({ status: 'Resolved' as FeedbackStatus, reply: '' });
  const list = useQuery({
    queryKey: ['admin', 'feedback', filter, page],
    queryFn: () => api<Paged<FeedbackItem>>(`/api/admin/feedback${toQuery({ ...filter, collegeId: filter.collegeId || undefined, page })}`),
    placeholderData: keepPreviousData,
  });
  const respond = useMutation({
    mutationFn: () => api(`/api/admin/feedback/${answering!.id}`, { method: 'PUT', body: { status: reply.status, reply: reply.reply.trim() || null } }),
    onSuccess: () => { toast('تم الحفظ.'); setAnswering(null); void queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] }); },
  });
  const change = (key: keyof typeof filter, value: string) => { setPage(1); setFilter((f) => ({ ...f, [key]: value })); };

  return (
    <>
      <AdminTitle title="الاقتراحات والشكاوى" subtitle="رسائل الطلاب عن الأنشطة والعملية التعليمية. يرى الطالب ردك حين يكتب رقمه القومي في صفحة «اقتراحات وشكاوى»." />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="النوع" value={filter.kind} onChange={(e) => change('kind', e.target.value)}>
          <option value="">الكل</option>{(Object.keys(FEEDBACK_KIND_LABELS) as FeedbackKind[]).map((k) => <option key={k} value={k}>{FEEDBACK_KIND_LABELS[k]}</option>)}
        </Select>
        <Select label="الموضوع" value={filter.topic} onChange={(e) => change('topic', e.target.value)}>
          <option value="">الكل</option>{(Object.keys(FEEDBACK_TOPIC_LABELS) as FeedbackTopic[]).map((k) => <option key={k} value={k}>{FEEDBACK_TOPIC_LABELS[k]}</option>)}
        </Select>
        <Select label="الحالة" value={filter.status} onChange={(e) => change('status', e.target.value)}>
          <option value="">الكل</option>{(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((k) => <option key={k} value={k}>{FEEDBACK_STATUS_LABELS[k]}</option>)}
        </Select>
        {hasRole('UniversityAdmin') && (
          <Select label="الكلية" value={filter.collegeId} onChange={(e) => change('collegeId', e.target.value)}>
            <option value="">كل الكليات</option>{colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
      </div>
      {list.isPending ? <PageLoader /> : list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : list.data.items.length === 0 ? (
        <EmptyState title="لا توجد رسائل" />
      ) : (
        <div className="grid gap-2">
          {list.data.items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.kind === 'Complaint' ? 'brand' : 'gold'}>{FEEDBACK_KIND_LABELS[item.kind]}</Badge>
                <Badge>{FEEDBACK_TOPIC_LABELS[item.topic]}</Badge>
                <Badge tone={item.status === 'Resolved' ? 'green' : item.status === 'InReview' ? 'amber' : 'neutral'}>{FEEDBACK_STATUS_LABELS[item.status]}</Badge>
                <span className="ms-auto text-xs font-semibold text-ink-400">{formatDateTime(item.createdAt)}</span>
              </div>
              <p className="mt-2 text-lg font-extrabold">{item.subject}</p>
              <p className="mt-1 whitespace-pre-line text-ink-700">{item.message}</p>
              <p className="mt-2 text-sm text-ink-500">
                {item.fullName} · {item.collegeName} · {levelLabel(item.level)}{item.department ? ` · ${item.department}` : ''} · <span dir="ltr">{item.nationalIdMasked}</span>
                {item.phone && <> · <a href={`tel:${item.phone}`} className="text-brand-700" dir="ltr">{item.phone}</a></>}
              </p>
              {item.reply && <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-emerald-900"><strong>ردك:</strong> {item.reply}</p>}
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { respond.reset(); setReply({ status: item.status === 'New' ? 'Resolved' : item.status, reply: item.reply ?? '' }); setAnswering(item); }}>
                {item.reply ? 'تعديل الرد' : 'الرد'}
              </Button>
            </Card>
          ))}
          <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onChange={setPage} />
        </div>
      )}
      <Modal open={!!answering} title={answering ? `الرد على: ${answering.subject}` : ''} onClose={() => setAnswering(null)}>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); respond.mutate(); }}>
          {respond.error && <Alert>{(respond.error as ApiError).message}</Alert>}
          <Select label="الحالة" value={reply.status} onChange={(e) => setReply((r) => ({ ...r, status: e.target.value as FeedbackStatus }))}>
            {(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((k) => <option key={k} value={k}>{FEEDBACK_STATUS_LABELS[k]}</option>)}
          </Select>
          <Textarea label="الرد (يظهر للطالب)" rows={5} maxLength={3000} value={reply.reply} onChange={(e) => setReply((r) => ({ ...r, reply: e.target.value }))} />
          <div className="flex gap-2"><Button type="submit" loading={respond.isPending}>حفظ</Button><Button variant="ghost" onClick={() => setAnswering(null)}>إلغاء</Button></div>
        </form>
      </Modal>
    </>
  );
}

// ======================================================================
// Advertising (site admins only)
// ======================================================================

export function AdminAdRequests() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<AdRequestStatus | ''>('');
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<AdRequest | null>(null);
  const [review, setReview] = useState({ status: 'Contacted' as AdRequestStatus, adminNote: '' });
  const list = useQuery({
    queryKey: ['admin', 'ad-requests', status, page],
    queryFn: () => api<Paged<AdRequest>>(`/api/admin/ad-requests${toQuery({ status: status || undefined, page })}`),
    placeholderData: keepPreviousData,
  });
  const save = useMutation({
    mutationFn: () => api(`/api/admin/ad-requests/${reviewing!.id}`, { method: 'PUT', body: { status: review.status, adminNote: review.adminNote.trim() || null } }),
    onSuccess: () => { toast('تم الحفظ.'); setReviewing(null); void queryClient.invalidateQueries({ queryKey: ['admin', 'ad-requests'] }); },
  });

  return (
    <>
      <AdminTitle title="طلبات الإعلان" subtitle="جهات ومؤسسات تريد الإعلان على الموقع. تواصل معهم، ثم أضف الإعلان من «الإعلانات»."
        action={<LinkButton to="/admin/ads" variant="outline">الإعلانات</LinkButton>} />
      <div className="mb-4 max-w-xs">
        <Select label="الحالة" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as AdRequestStatus | ''); }}>
          <option value="">الكل</option>{(Object.keys(AD_REQUEST_STATUS_LABELS) as AdRequestStatus[]).map((k) => <option key={k} value={k}>{AD_REQUEST_STATUS_LABELS[k]}</option>)}
        </Select>
      </div>
      {list.isPending ? <PageLoader /> : list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : list.data.items.length === 0 ? (
        <EmptyState title="لا توجد طلبات" text="تصل الطلبات من صفحة «أعلن معنا»." />
      ) : (
        <div className="grid gap-2">
          {list.data.items.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-extrabold">{r.organizationName}</p>
                <Badge tone={r.status === 'New' ? 'amber' : r.status === 'Accepted' ? 'green' : r.status === 'Rejected' ? 'brand' : 'neutral'}>{AD_REQUEST_STATUS_LABELS[r.status]}</Badge>
                {r.adKind && <Badge>{r.adKind}</Badge>}
                <span className="ms-auto text-xs font-semibold text-ink-400">{formatDate(r.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-ink-700">{r.message}</p>
              <p className="mt-2 text-sm text-ink-600">
                {r.contactName} · <a href={`tel:${r.phone}`} className="text-brand-700" dir="ltr">{r.phone}</a>
                {r.email && <> · <a href={`mailto:${r.email}`} className="text-brand-700" dir="ltr">{r.email}</a></>}
                {r.website && <> · <a href={r.website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700" dir="ltr">{r.website}</a></>}
              </p>
              {r.adminNote && <p className="mt-2 rounded-xl bg-sand p-3 text-sm"><strong>ملاحظة:</strong> {r.adminNote}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { save.reset(); setReview({ status: r.status === 'New' ? 'Contacted' : r.status, adminNote: r.adminNote ?? '' }); setReviewing(r); }}>تحديث الحالة</Button>
                <LinkButton to={`/admin/ads?fromRequest=${r.id}&advertiser=${encodeURIComponent(r.organizationName)}`} size="sm" variant="ghost"><Plus className="size-4" /> إنشاء إعلان</LinkButton>
              </div>
            </Card>
          ))}
          <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onChange={setPage} />
        </div>
      )}
      <Modal open={!!reviewing} title={reviewing?.organizationName ?? ''} onClose={() => setReviewing(null)}>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          {save.error && <Alert>{(save.error as ApiError).message}</Alert>}
          <Select label="الحالة" value={review.status} onChange={(e) => setReview((r) => ({ ...r, status: e.target.value as AdRequestStatus }))}>
            {(Object.keys(AD_REQUEST_STATUS_LABELS) as AdRequestStatus[]).map((k) => <option key={k} value={k}>{AD_REQUEST_STATUS_LABELS[k]}</option>)}
          </Select>
          <Textarea label="ملاحظة داخلية" rows={4} maxLength={2000} value={review.adminNote} onChange={(e) => setReview((r) => ({ ...r, adminNote: e.target.value }))} />
          <div className="flex gap-2"><Button type="submit" loading={save.isPending}>حفظ</Button><Button variant="ghost" onClick={() => setReviewing(null)}>إلغاء</Button></div>
        </form>
      </Modal>
    </>
  );
}

type AdFormState = { title: string; advertiserName: string; description: string; linkUrl: string; placement: AdPlacement; startsAt: string; endsAt: string; isActive: boolean; sortOrder: string; adRequestId: string };

export function AdminAds() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const imageInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<AdAdmin | 'new' | null>(null);
  const [removing, setRemoving] = useState<AdAdmin | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [missingImage, setMissingImage] = useState(false);
  const [form, setForm] = useState<AdFormState>({ title: '', advertiserName: '', description: '', linkUrl: '', placement: 'Home', startsAt: '', endsAt: '', isActive: true, sortOrder: '0', adRequestId: '' });
  const list = useQuery({ queryKey: ['admin', 'ads'], queryFn: () => api<AdAdmin[]>('/api/admin/ads') });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] }); void queryClient.invalidateQueries({ queryKey: ['ads'] }); };

  const open = (ad: AdAdmin | 'new', preset?: Partial<AdFormState>) => {
    save.reset();
    setImage(null);
    setForm(ad === 'new'
      ? { title: '', advertiserName: '', description: '', linkUrl: '', placement: 'Home', startsAt: '', endsAt: '', isActive: true, sortOrder: '0', adRequestId: '', ...preset }
      : { title: ad.title, advertiserName: ad.advertiserName, description: ad.description ?? '', linkUrl: ad.linkUrl ?? '', placement: ad.placement,
          startsAt: toLocalInput(ad.startsAt), endsAt: toLocalInput(ad.endsAt), isActive: ad.isActive, sortOrder: String(ad.sortOrder), adRequestId: ad.adRequestId ? String(ad.adRequestId) : '' });
    setEditing(ad);
  };

  // Opened from an ad request: start a new ad for that advertiser.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromRequest = params.get('fromRequest');
    if (fromRequest) open('new', { adRequestId: fromRequest, advertiserName: params.get('advertiser') ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.append('title', form.title.trim());
      body.append('advertiserName', form.advertiserName.trim());
      if (form.description.trim()) body.append('description', form.description.trim());
      if (form.linkUrl.trim()) body.append('linkUrl', form.linkUrl.trim());
      body.append('placement', form.placement);
      if (form.startsAt) body.append('startsAt', fromLocalInput(form.startsAt) ?? '');
      if (form.endsAt) body.append('endsAt', fromLocalInput(form.endsAt) ?? '');
      body.append('isActive', String(form.isActive));
      body.append('sortOrder', form.sortOrder || '0');
      if (form.adRequestId) body.append('adRequestId', form.adRequestId);
      if (image) body.append('image', image);
      return editing === 'new' ? api('/api/admin/ads', { method: 'POST', form: body }) : api(`/api/admin/ads/${(editing as AdAdmin).id}`, { method: 'PUT', form: body });
    },
    onSuccess: () => { toast('تم حفظ الإعلان.'); setEditing(null); refresh(); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/ads/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم حذف الإعلان.'); setRemoving(null); refresh(); },
  });

  return (
    <>
      <AdminTitle title="الإعلانات" subtitle="تظهر الإعلانات مميَّزة بكلمة «إعلان» في أماكن مخصصة: الصفحة الرئيسية، بين الأنشطة، وأسفل صفحات المحتوى."
        action={<Button onClick={() => open('new')}><Plus className="size-4" /> إعلان جديد</Button>} />
      {list.isPending ? <PageLoader /> : list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : list.data.length === 0 ? (
        <EmptyState title="لا توجد إعلانات" action={<LinkButton to="/admin/ad-requests" variant="outline">طلبات الإعلان</LinkButton>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.data.map((ad) => (
            <Card key={ad.id} className="overflow-hidden">
              <img src={mediaUrl(ad.thumbUrl)} alt="" className="aspect-[16/7] w-full object-cover" />
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold">{ad.title}</p>
                  {ad.isLive ? <Badge tone="green">يظهر الآن</Badge> : <Badge>{ad.isActive ? 'خارج المدة' : 'متوقف'}</Badge>}
                </div>
                <p className="text-sm text-ink-600">{ad.advertiserName} · {AD_PLACEMENT_LABELS[ad.placement]}</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-ink-500">
                  <MousePointerClick className="size-3.5" /> {formatNumber(ad.clicks)} نقرة
                  {(ad.startsAt || ad.endsAt) && <> · {ad.startsAt ? formatDate(ad.startsAt) : '…'} ← {ad.endsAt ? formatDate(ad.endsAt) : '…'}</>}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => open(ad)}><Pencil className="size-4" /> تعديل</Button>
                  <Button size="sm" variant="danger" onClick={() => setRemoving(ad)}><Trash2 className="size-4" /> حذف</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} title={editing === 'new' ? 'إعلان جديد' : 'تعديل الإعلان'} onClose={() => setEditing(null)} wide>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (editing === 'new' && !image) { setMissingImage(true); return; } setMissingImage(false); save.mutate(); }}>
          {missingImage && <div className="sm:col-span-2"><Alert>اختر صورة الإعلان أولاً.</Alert></div>}
          {save.error && <div className="sm:col-span-2"><Alert>{(save.error as ApiError).message}</Alert></div>}
          <Input label="عنوان الإعلان" required maxLength={150} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="المعلِن" required maxLength={150} value={form.advertiserName} onChange={(e) => setForm((f) => ({ ...f, advertiserName: e.target.value }))} />
          <div className="sm:col-span-2"><Input label="سطر وصف قصير" maxLength={500} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} hint="اختياري" /></div>
          <div className="sm:col-span-2"><Input label="رابط الإعلان" dir="ltr" maxLength={500} value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} placeholder="https://" hint="اختياري — يُحسب عدد النقرات" /></div>
          <Select label="مكان الظهور" value={form.placement} onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as AdPlacement }))}>
            {(Object.keys(AD_PLACEMENT_LABELS) as AdPlacement[]).map((p) => <option key={p} value={p}>{AD_PLACEMENT_LABELS[p]}</option>)}
          </Select>
          <Input label="الترتيب" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} hint="الأصغر يظهر أولاً" />
          <Input label="يبدأ في" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} hint="اختياري" />
          <Input label="ينتهي في" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} hint="اختياري" />
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-bold text-ink-800">الصورة {editing === 'new' && <span className="text-brand-600">*</span>}</p>
            <Button variant="outline" onClick={() => imageInput.current?.click()}><ImagePlus className="size-4" /> {image ? image.name : editing !== 'new' ? 'استبدال الصورة' : 'اختر صورة'}</Button>
            <input ref={imageInput} type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" tabIndex={-1}
              onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ''; if (f && f.size > MAX_PICKED_IMAGE) toast('الصورة حتى 25 ميجابايت.', 'error'); else setImage(f); }} />
            <p className="mt-1.5 text-[13px] text-ink-500">الأفضل صورة عرضية 16:9 (مثلاً 1600×900).</p>
          </div>
          <div className="sm:col-span-2"><Checkbox checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} label="مفعّل" /></div>
          <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={save.isPending} disabled={editing === 'new' && !image}>حفظ</Button><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!removing} title="حذف الإعلان" message={`سيُحذف إعلان «${removing?.title ?? ''}» نهائياً.`} confirmLabel="حذف"
        loading={remove.isPending} onConfirm={() => removing && remove.mutate(removing.id)} onClose={() => setRemoving(null)} />
    </>
  );
}
