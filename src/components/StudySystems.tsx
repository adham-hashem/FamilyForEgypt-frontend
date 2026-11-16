import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, type ApiError } from '../lib/api';
import type { StudySystem } from '../lib/types';
import { Alert, Button, Checkbox, Input, Modal, useToast } from './ui';

export function useStudySystems() {
  return useQuery({ queryKey: ['study-systems'], queryFn: () => api<StudySystem[]>('/api/study-systems'), staleTime: 60_000 });
}

/** The study systems colleges can choose from. Add one when a new system appears; the built-in ones can only be renamed. */
export function StudySystemsManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isPending } = useStudySystems();
  const [form, setForm] = useState({ name: '', levelWord: 'المستوى', usesCredits: true });
  const refresh = () => void queryClient.invalidateQueries();
  const fail = (error: unknown) => toast((error as ApiError).message, 'error');

  const add = useMutation({
    mutationFn: () => api('/api/admin/study-systems', { method: 'POST', body: { ...form, name: form.name.trim(), levelWord: form.levelWord.trim(), sortOrder: (data?.length ?? 0) + 1 } }),
    onSuccess: () => { setForm({ name: '', levelWord: 'المستوى', usesCredits: true }); toast('تمت إضافة النظام.'); refresh(); },
  });
  const rename = useMutation({
    mutationFn: (s: StudySystem) => api(`/api/admin/study-systems/${s.id}`, { method: 'PUT', body: s }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/study-systems/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('تم حذف النظام.'); refresh(); },
    onError: fail,
  });

  return (
    <Modal open={open} title="أنظمة الدراسة" onClose={onClose} wide>
      <p className="mb-4 text-ink-600">
        النظام يحدد اسم المرحلة في الموقع كله، والأصل «المستوى» («المستوى الأول، الثاني…»). لو ظهر نظام آخر، أو كلية تفضّل «الفرقة» أو «الفصل» أو غيرها، أضفه هنا ثم اختره في بيانات الكلية.
      </p>

      {isPending ? null : (
        <ul className="mb-5 grid gap-2">
          {data?.map((s) => (
            <li key={s.id} className="grid gap-2 rounded-xl border border-ink-200 p-3 sm:grid-cols-[1fr_9rem_auto] sm:items-center">
              <input defaultValue={s.name} maxLength={80} aria-label="اسم النظام"
                className="min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-bold hover:border-ink-200 focus:border-brand-500 focus:outline-none"
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.name) rename.mutate({ ...s, name: v }); else e.target.value = s.name; }} />
              <label className="flex items-center gap-2 text-sm text-ink-600">
                المرحلة:
                <input defaultValue={s.levelWord} maxLength={30} aria-label="اسم المرحلة"
                  className="w-24 rounded-lg border border-ink-200 px-2 py-1 font-bold focus:border-brand-500 focus:outline-none"
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.levelWord) rename.mutate({ ...s, levelWord: v }); else e.target.value = s.levelWord; }} />
              </label>
              {s.isBuiltIn
                ? <span className="text-xs font-bold text-ink-400">أساسي</span>
                : <button type="button" onClick={() => remove.mutate(s.id)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label={`حذف ${s.name}`}><Trash2 className="size-5" /></button>}
            </li>
          ))}
        </ul>
      )}

      <form className="grid gap-3 rounded-2xl bg-ink-50 p-4 sm:grid-cols-2" onSubmit={(e: FormEvent) => { e.preventDefault(); add.mutate(); }}>
        <p className="font-extrabold sm:col-span-2">إضافة نظام جديد</p>
        {add.isError && <div className="sm:col-span-2"><Alert>{(add.error as ApiError).message}</Alert></div>}
        <Input label="اسم النظام" required maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: نظام النقاط المعتمدة" />
        <Input label="اسم المرحلة" required maxLength={30} value={form.levelWord} onChange={(e) => setForm((f) => ({ ...f, levelWord: e.target.value }))} hint="مثل: المستوى، الفرقة، الفصل" />
        <div className="sm:col-span-2"><Checkbox checked={form.usesCredits} onChange={(e) => setForm((f) => ({ ...f, usesCredits: e.target.checked }))} label="المقررات فيه لها ساعات أو نقاط معتمدة" /></div>
        <div className="sm:col-span-2"><Button type="submit" loading={add.isPending} disabled={form.name.trim().length < 2 || form.levelWord.trim().length < 2}>إضافة</Button></div>
      </form>
    </Modal>
  );
}
