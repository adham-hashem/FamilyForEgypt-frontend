import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, type ApiError } from '../lib/api';
import { departmentSuggestions } from '../lib/format';
import type { Department, DepartmentKind } from '../lib/types';
import { Alert, Button, Input, Modal, Select, useToast } from './ui';

export function useDepartments(collegeId: number | null | undefined) {
  return useQuery({
    queryKey: ['departments', collegeId],
    queryFn: () => api<Department[]>(`/api/colleges/${collegeId}/departments`),
    enabled: !!collegeId,
    staleTime: 60_000,
  });
}

export function useDepartmentKinds() {
  return useQuery({ queryKey: ['department-kinds'], queryFn: () => api<DepartmentKind[]>('/api/department-kinds'), staleTime: 60_000 });
}

/** The words a college can use for its branches (department, division, program…); add any other word that is missing. */
function KindsManager({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useDepartmentKinds();
  const [word, setWord] = useState('');
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['department-kinds'] }); onChanged(); };
  const fail = (error: unknown) => toast((error as ApiError).message, 'error');
  const add = useMutation({
    mutationFn: () => api('/api/admin/department-kinds', { method: 'POST', body: { name: word.trim(), sortOrder: (data?.length ?? 0) + 1 } }),
    onSuccess: () => { setWord(''); toast('تمت إضافة الكلمة.'); refresh(); },
    onError: fail,
  });
  const rename = useMutation({
    mutationFn: (k: DepartmentKind) => api(`/api/admin/department-kinds/${k.id}`, { method: 'PUT', body: k }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/department-kinds/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم حذف الكلمة.'); refresh(); },
    onError: fail,
  });
  return (
    <div className="mb-5 rounded-2xl bg-ink-50 p-4">
      <p className="mb-1 font-extrabold">الكلمات المستخدمة (قسم، شعبة، برنامج…)</p>
      <p className="mb-3 text-sm text-ink-600">عدّل أي كلمة أو احذف غير المستخدم منها، وأضف كلمة جديدة لو كليتك تسميها بشكل آخر (مثل «لائحة» أو «مجموعة»).</p>
      <ul className="mb-3 flex flex-wrap gap-2">
        {data?.map((k) => (
          <li key={k.id} className="flex items-center rounded-full border border-ink-200 bg-white ps-1">
            <input defaultValue={k.name} maxLength={40} aria-label="الكلمة" size={Math.max(4, k.name.length)}
              className="rounded-full bg-transparent px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              onBlur={(e) => { const v = e.target.value.trim(); if (v.length >= 2 && v !== k.name) rename.mutate({ ...k, name: v }); else e.target.value = k.name; }} />
            {!k.isBuiltIn && (
              <button type="button" onClick={() => remove.mutate(k.id)} className="rounded-full p-1.5 text-brand-600 hover:bg-brand-50" aria-label={`حذف ${k.name}`}><Trash2 className="size-4" /></button>
            )}
          </li>
        ))}
      </ul>
      <form className="flex items-end gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); if (word.trim().length >= 2) add.mutate(); }}>
        <div className="min-w-0 flex-1"><Input label="كلمة جديدة" maxLength={40} value={word} onChange={(e) => setWord(e.target.value)} /></div>
        <Button type="submit" loading={add.isPending} disabled={word.trim().length < 2}>إضافة</Button>
      </form>
    </div>
  );
}

/**
 * Choose the department, division or program from the college's own list, so the same one is never spelled two ways.
 * A college with no list yet gets a plain text box, and a value saved earlier that is not on the list stays selectable.
 */
export function DepartmentPicker({ collegeId, value, onChange, label = 'القسم / الشعبة / البرنامج' }: {
  collegeId: number | null; value: string; onChange: (value: string) => void; label?: string;
}) {
  const { data } = useDepartments(collegeId);
  const kinds = useDepartmentKinds().data ?? [];
  if (!data || data.length === 0) {
    return <Input label={label} maxLength={120} value={value} onChange={(e) => onChange(e.target.value)} hint="اختياري. يمكن لرائد الأسرة تجهيز قائمة بالأقسام من «إدارة الأقسام» فتظهر هنا للاختيار." />;
  }
  const known = data.some((d) => d.name === value);
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)} hint="اختر «كل الأقسام» لو المقرر عام لجميع الأقسام.">
      <option value="">كل الأقسام</option>
      {kinds.map((kind) => {
        const items = data.filter((d) => d.kind === kind.id);
        return items.length ? (
          <optgroup key={kind.id} label={kind.name}>
            {items.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </optgroup>
        ) : null;
      })}
      {value && !known && <option value={value}>{value}</option>}
    </Select>
  );
}

/** The college's departments, divisions and programs: add from suggestions in one tap, rename and delete. */
export function DepartmentsManager({ open, onClose, collegeId, collegeName }: {
  open: boolean; onClose: () => void; collegeId: number | null; collegeName: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isPending } = useDepartments(collegeId);
  const kinds = useDepartmentKinds().data ?? [];
  const kindName = (id: number) => kinds.find((k) => k.id === id)?.name ?? '—';
  const [name, setName] = useState('');
  const [kind, setKind] = useState('1');
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['departments', collegeId] });
  const fail = (error: unknown) => toast((error as ApiError).message, 'error');

  const add = useMutation({
    mutationFn: (item: { name: string; kind: number }) => api('/api/admin/departments', { method: 'POST', body: { collegeId, ...item, sortOrder: data?.length ?? 0 } }),
    onSuccess: () => { setName(''); refresh(); },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم الحذف. المقررات التي كانت تحته أصبحت «كل الأقسام».'); refresh(); void queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] }); },
    onError: fail,
  });
  const rename = useMutation({
    mutationFn: (d: Department & { name: string }) => api(`/api/admin/departments/${d.id}`, { method: 'PUT', body: { collegeId, name: d.name, kind: d.kind, sortOrder: d.sortOrder } }),
    onSuccess: () => { refresh(); void queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] }); },
    onError: fail,
  });

  const existing = new Set((data ?? []).map((d) => d.name));
  const suggestions = departmentSuggestions(collegeName).filter((s) => !existing.has(s.name));

  return (
    <Modal open={open} title={`الأقسام والشعب والبرامج — ${collegeName}`} onClose={onClose} wide>
      <p className="mb-4 text-ink-600">جهّز القائمة مرة واحدة، وعند إضافة أي مقرر أو محتوى تختار منها بدل الكتابة، فلا يتكرر الاسم بصيغ مختلفة.</p>

      <KindsManager onChanged={refresh} />

      {suggestions.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-extrabold">اقتراحات لهذه الكلية — اضغط للإضافة</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s.name} type="button" disabled={add.isPending} onClick={() => add.mutate(s)}
                className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-bold hover:border-brand-400 hover:bg-brand-50">
                <Plus className="size-3.5" /> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end" onSubmit={(e: FormEvent) => { e.preventDefault(); if (name.trim()) add.mutate({ name: name.trim(), kind: Number(kind) }); }}>
        <Input label="إضافة اسم آخر" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="النوع" value={kind} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </Select>
        <Button type="submit" loading={add.isPending} disabled={!name.trim()}>إضافة</Button>
      </form>

      {add.isError && <Alert>{(add.error as ApiError).message}</Alert>}
      {isPending ? null : !data || data.length === 0 ? (
        <p className="text-ink-500">لا توجد أقسام بعد.</p>
      ) : (
        <ul className="grid gap-2">
          {data.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-xl border border-ink-200 p-2 ps-3">
              <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">{kindName(d.kind)}</span>
              <input
                defaultValue={d.name} maxLength={120} aria-label="الاسم"
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-bold hover:border-ink-200 focus:border-brand-500 focus:outline-none"
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== d.name) rename.mutate({ ...d, name: v }); else e.target.value = d.name; }}
              />
              <button type="button" onClick={() => remove.mutate(d.id)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label={`حذف ${d.name}`}><Trash2 className="size-5" /></button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
