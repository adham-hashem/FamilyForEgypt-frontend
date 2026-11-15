import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, type ApiError } from '../lib/api';
import { DEPARTMENT_KIND_LABELS, departmentSuggestions } from '../lib/format';
import type { Department } from '../lib/types';
import { Alert, Button, Input, Modal, Select, useToast } from './ui';

export function useDepartments(collegeId: number | null | undefined) {
  return useQuery({
    queryKey: ['departments', collegeId],
    queryFn: () => api<Department[]>(`/api/colleges/${collegeId}/departments`),
    enabled: !!collegeId,
    staleTime: 60_000,
  });
}

/**
 * Choose the department, division or program from the college's own list, so the same one is never spelled two ways.
 * A college with no list yet gets a plain text box, and a value saved earlier that is not on the list stays selectable.
 */
export function DepartmentPicker({ collegeId, value, onChange, label = 'القسم / الشعبة / البرنامج' }: {
  collegeId: number | null; value: string; onChange: (value: string) => void; label?: string;
}) {
  const { data } = useDepartments(collegeId);
  if (!data || data.length === 0) {
    return <Input label={label} maxLength={120} value={value} onChange={(e) => onChange(e.target.value)} hint="اختياري. يمكن لرائد الأسرة تجهيز قائمة بالأقسام من «إدارة الأقسام» فتظهر هنا للاختيار." />;
  }
  const known = data.some((d) => d.name === value);
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)} hint="اختر «كل الأقسام» لو المقرر عام لجميع الأقسام.">
      <option value="">كل الأقسام</option>
      {([1, 2, 3] as const).map((kind) => {
        const items = data.filter((d) => d.kind === kind);
        return items.length ? (
          <optgroup key={kind} label={kind === 1 ? 'الأقسام' : kind === 2 ? 'الشعب' : 'البرامج'}>
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
          {[1, 2, 3].map((k) => <option key={k} value={k}>{DEPARTMENT_KIND_LABELS[k]}</option>)}
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
              <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">{DEPARTMENT_KIND_LABELS[d.kind]}</span>
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
