import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, CheckCircle2, FileUp, Gift, MapPin, Medal, Trophy, Users, X } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AdSlot } from '../components/AdSlot';
import { PageHeader } from '../components/Layout';
import { StudentFields, useStudentInfo } from '../components/StudentFields';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, LinkButton, PageLoader, Pagination, Textarea, cx } from '../components/ui';
import { api, mediaUrl, toQuery, type ApiError } from '../lib/api';
import {
  COMPETITION_CATEGORY_LABELS, COMPETITION_FORMAT_LABELS, COMPETITION_MODE_LABELS, formatDateTime, formatNumber,
} from '../lib/format';
import type { Competition, CompetitionCategory, CompetitionListItem, Paged } from '../lib/types';

const FILTERS = [
  { key: 'open', label: 'متاحة الآن' },
  { key: 'upcoming', label: 'قريباً' },
  { key: 'ended', label: 'انتهت' },
  { key: '', label: 'الكل' },
];

/** Where a competition stands, in a few words and a colour. */
function stateOf(c: { isOpen: boolean; opensAt: string | null; closesAt: string | null; resultsPublished: boolean }) {
  const now = Date.now();
  if (c.resultsPublished) return { label: 'النتائج معلنة', tone: 'gold' as const };
  if (c.isOpen) return { label: 'المشاركة متاحة', tone: 'green' as const };
  if (c.opensAt && new Date(c.opensAt).getTime() > now) return { label: 'تبدأ قريباً', tone: 'amber' as const };
  return { label: 'انتهت المشاركة', tone: 'neutral' as const };
}

function CompetitionCard({ item }: { item: CompetitionListItem }) {
  const state = stateOf(item);
  return (
    <Link to={`/competitions/${item.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900">
        {item.thumbUrl
          ? <img src={mediaUrl(item.thumbUrl)} alt="" loading="lazy" className="size-full object-cover" />
          : <Trophy className="absolute inset-0 m-auto size-16 text-gold-300/70" aria-hidden />}
        <span className="absolute start-3 top-3"><Badge tone={state.tone}>{state.label}</Badge></span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="brand">{COMPETITION_CATEGORY_LABELS[item.category]}</Badge>
          <Badge>{COMPETITION_MODE_LABELS[item.mode]}</Badge>
        </div>
        <h3 className="mt-2.5 text-lg font-extrabold group-hover:text-brand-700">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-600">{item.summary}</p>
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs font-bold text-ink-500">
          {item.closesAt && <span className="flex items-center gap-1"><CalendarClock className="size-3.5" /> حتى {formatDateTime(item.closesAt)}</span>}
          {item.prize && <span className="flex items-center gap-1"><Gift className="size-3.5" /> {item.prize}</span>}
          <span className="flex items-center gap-1"><Users className="size-3.5" /> {formatNumber(item.entriesCount)} مشارك</span>
        </div>
        <p className="mt-2 text-xs font-semibold text-ink-400">{item.collegeName ?? 'على مستوى الجامعة'}</p>
      </div>
    </Link>
  );
}

export default function Competitions() {
  const [search, setSearch] = useSearchParams();
  const status = search.get('status') ?? 'open';
  const category = (search.get('category') ?? '') as CompetitionCategory | '';
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ['competitions', status, category, page],
    queryFn: () => api<Paged<CompetitionListItem>>(`/api/competitions${toQuery({ status: status || undefined, category: category || undefined, page, pageSize: 12 })}`),
    placeholderData: keepPreviousData,
  });
  const update = (changes: Record<string, string>) => {
    setPage(1);
    const next = new URLSearchParams(search);
    for (const [k, v] of Object.entries(changes)) if (v) next.set(k, v); else next.delete(k);
    setSearch(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="المسابقات" subtitle="مسابقات ثقافية ودينية وعلمية ورياضية وفنية وغيرها: منها على أرض الواقع، ومنها ما تشارك فيه كاملاً من هنا." />
      <div className="container-page py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => update({ status: f.key || 'all' })} aria-pressed={status === (f.key || 'all')}
              className={cx('rounded-full border px-4 py-1.5 text-sm font-bold transition', status === (f.key || 'all') ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500')}>
              {f.label}
            </button>
          ))}
          <select value={category} onChange={(e) => update({ category: e.target.value })} aria-label="نوع المسابقة"
            className="ms-auto rounded-full border border-ink-300 bg-white px-4 py-1.5 text-sm font-bold">
            <option value="">كل الأنواع</option>
            {(Object.keys(COMPETITION_CATEGORY_LABELS) as CompetitionCategory[]).map((c) => <option key={c} value={c}>{COMPETITION_CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
        {isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-80" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState title="لا توجد مسابقات هنا الآن" text="تابعنا: تُعلن المسابقات الجديدة هنا أولاً بأول." action={status !== 'all' ? <Button variant="outline" size="sm" onClick={() => update({ status: 'all' })}>عرض كل المسابقات</Button> : undefined} />
        ) : (
          <div className={cx('grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3', isPlaceholderData && 'opacity-60')}>
            {data.items.map((item) => <CompetitionCard key={item.id} item={item} />)}
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </div>
    </>
  );
}

// ---------- one competition ----------

function EntryForm({ competition }: { competition: Competition }) {
  const student = useStudentInfo();
  const [answer, setAnswer] = useState('');
  const [choices, setChoices] = useState<Array<number | null>>(() => competition.questions.map(() => null));
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const format = competition.format;
  const problem =
    format === 'Riddle' && !answer.trim() ? 'اكتب إجابتك.'
      : format === 'Quiz' && choices.some((c) => c === null) ? 'أجب عن كل الأسئلة.'
        : format === 'Submission' && !file && !answer.trim() ? 'أرسل عملك: ملف أو نص.' : '';
  const valid = student.valid && !problem;

  const send = useMutation({
    mutationFn: () => {
      const body = new FormData();
      for (const [key, value] of Object.entries(student.payload)) if (value !== null) body.append(key, String(value));
      if (answer.trim()) body.append('answer', answer.trim());
      for (const choice of choices) if (choice !== null) body.append('choices', String(choice));
      if (file) body.append('file', file);
      return api(`/api/competitions/${competition.id}/entries`, { method: 'POST', form: body });
    },
  });

  if (send.isSuccess) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h2 className="mt-3 text-2xl font-black">{format === 'Registration' ? 'تم تسجيلك في المسابقة' : 'وصلت مشاركتك'}</h2>
        <p className="mt-2 text-ink-600">
          {format === 'Registration'
            ? 'احضر في الموعد والمكان المعلنين. بالتوفيق!'
            : 'النتائج والفائزون يُعلنون في هذه الصفحة بعد انتهاء المسابقة. بالتوفيق!'}
        </p>
      </Card>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (valid) send.mutate();
  };

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      {format === 'Riddle' && (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">إجابتك</h2>
          <Textarea label="الإجابة" required rows={3} maxLength={6000} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </Card>
      )}

      {format === 'Quiz' && (
        <div className="grid gap-4">
          {competition.questions.map((question, qi) => (
            <Card key={qi} className="p-5">
              <p className="font-extrabold"><span className="text-brand-600">{qi + 1}.</span> {question.text}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`السؤال ${qi + 1}`}>
                {question.options.map((option, oi) => (
                  <button key={oi} type="button" role="radio" aria-checked={choices[qi] === oi}
                    onClick={() => setChoices((c) => c.map((v, i) => (i === qi ? oi : v)))}
                    className={cx('rounded-xl border-2 px-4 py-2.5 text-start font-bold transition', choices[qi] === oi ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-200 hover:border-ink-400')}>
                    {option}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {format === 'Submission' && (
        <Card className="grid gap-4 p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">عملك</h2>
          <div>
            <p className="mb-1.5 text-sm font-bold text-ink-800">الملف (صورة أو PDF أو Word)</p>
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-sand px-4 py-3">
                <FileUp className="size-5 text-brand-600" />
                <span className="min-w-0 flex-1 truncate font-bold" dir="auto">{file.name}</span>
                <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = ''; }} aria-label="إزالة الملف" className="rounded-full p-1 hover:bg-ink-200"><X className="size-4" /></button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => input.current?.click()}><FileUp className="size-4" /> اختر ملفاً</Button>
            )}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.ppt,.pptx" className="sr-only" tabIndex={-1}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="mt-1.5 text-[13px] text-ink-500">حتى 25 ميجابايت.</p>
          </div>
          <Textarea label="نص أو وصف لعملك" rows={4} maxLength={6000} value={answer} onChange={(e) => setAnswer(e.target.value)} hint="اختياري إذا أرفقت ملفاً" />
        </Card>
      )}

      <Card className="grid gap-4 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">بياناتك</h2>
        <StudentFields state={student} touched={touched} askPhone={format === 'Registration'} />
        {touched && problem && <Alert>{problem}</Alert>}
        {send.error && <Alert>{(send.error as ApiError).message}</Alert>}
        <p className="text-xs text-ink-500">مشاركة واحدة لكل رقم قومي. اسمك وكليتك فقط يظهران في قائمة الفائزين.</p>
        <Button type="submit" variant="gold" size="lg" loading={send.isPending} className="w-full sm:w-auto">
          {format === 'Registration' ? 'سجّلني في المسابقة' : 'إرسال المشاركة'}
        </Button>
      </Card>
    </form>
  );
}

export function CompetitionPage() {
  const { id } = useParams();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['competition', id],
    queryFn: () => api<Competition>(`/api/competitions/${id}`),
    retry: (count, err) => (err as ApiError).status !== 404 && count < 2,
  });

  if (isPending) return <PageLoader />;
  if (error) {
    return (
      <div className="container-page py-16">
        {(error as ApiError).status === 404
          ? <EmptyState title="المسابقة غير موجودة" action={<LinkButton to="/competitions">كل المسابقات</LinkButton>} />
          : <ErrorState onRetry={() => void refetch()} />}
      </div>
    );
  }

  const state = stateOf(data);
  return (
    <>
      <PageHeader title={data.title} subtitle={`${COMPETITION_CATEGORY_LABELS[data.category]} · ${COMPETITION_MODE_LABELS[data.mode]} · ${data.collegeName ?? 'على مستوى الجامعة'}`}>
        <Link to="/competitions" className="absolute top-4 flex items-center gap-1 text-sm font-bold text-ink-300 hover:text-white">
          <ArrowRight className="size-4" /> كل المسابقات
        </Link>
      </PageHeader>
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-5">
          {data.imageUrl && <img src={mediaUrl(data.imageUrl)} alt="" className="w-full rounded-3xl border border-ink-200 object-cover shadow-card" />}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone={state.tone}>{state.label}</Badge>
              <Badge>{COMPETITION_FORMAT_LABELS[data.format]}</Badge>
              {!data.isPublished && <Badge tone="amber">مسودة</Badge>}
            </div>
            <p className="mt-4 whitespace-pre-line text-lg leading-8 text-ink-700">{data.description}</p>
            {data.question && (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-gold-400 bg-gold-300/10 p-5">
                <p className="text-sm font-extrabold text-gold-500">{data.format === 'Riddle' ? 'الفزورة' : 'المطلوب'}</p>
                <p className="mt-1 whitespace-pre-line text-xl font-black leading-9">{data.question}</p>
              </div>
            )}
            {data.rules && (
              <div className="mt-5">
                <p className="font-extrabold">الشروط</p>
                <p className="mt-1 whitespace-pre-line leading-7 text-ink-600">{data.rules}</p>
              </div>
            )}
          </Card>

          {data.resultsPublished && (
            <Card className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-xl font-black"><Medal className="size-6 text-gold-400" /> الفائزون</h2>
              {data.winners.length === 0 ? <p className="mt-2 text-ink-600">لم يُحدَّد فائزون.</p> : (
                <ol className="mt-4 grid gap-2">
                  {data.winners.map((w, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl bg-sand px-4 py-3">
                      <span className="grid size-9 place-items-center rounded-full bg-gold-300 font-black text-ink-900">{w.rank ?? i + 1}</span>
                      <span className="flex-1 font-extrabold">{w.fullName}</span>
                      <span className="text-sm text-ink-500">{w.collegeName}</span>
                    </li>
                  ))}
                </ol>
              )}
              {data.acceptedAnswers.length > 0 && <p className="mt-4 text-ink-700">الإجابة الصحيحة: <strong>{data.acceptedAnswers[0]}</strong></p>}
            </Card>
          )}

          {data.isOpen ? <EntryForm competition={data} /> : !data.resultsPublished && (
            <Alert tone="info">{state.label === 'تبدأ قريباً' ? `تبدأ المشاركة ${formatDateTime(data.opensAt)}.` : 'انتهت المشاركة. تابع الصفحة لإعلان النتائج.'}</Alert>
          )}
        </div>

        <div className="grid content-start gap-4">
          <Card className="grid gap-3 p-5">
            {data.prize && <p className="flex items-center gap-2 font-bold"><Gift className="size-5 text-brand-600" /> الجائزة: {data.prize}</p>}
            {data.eventAt && <p className="flex items-center gap-2 font-bold"><CalendarClock className="size-5 text-brand-600" /> الموعد: {formatDateTime(data.eventAt)}</p>}
            {data.location && <p className="flex items-center gap-2 font-bold"><MapPin className="size-5 text-brand-600" /> المكان: {data.location}</p>}
            {data.opensAt && <p className="text-sm text-ink-600">تبدأ المشاركة: {formatDateTime(data.opensAt)}</p>}
            {data.closesAt && <p className="text-sm text-ink-600">آخر موعد: {formatDateTime(data.closesAt)}</p>}
            <p className="flex items-center gap-2 text-sm text-ink-600"><Users className="size-4" /> {formatNumber(data.entriesCount)} مشارك حتى الآن</p>
            {data.canManage && <LinkButton to={`/admin/competitions/${data.id}`} variant="outline" size="sm">إدارة المسابقة</LinkButton>}
          </Card>
          <AdSlot placement="Content" />
        </div>
      </div>
    </>
  );
}
