import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Link2, MessageCircle, Music2, Plus, Send, Trash2, Ghost } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api, type ApiError } from '../lib/api';
import type { SocialLink } from '../lib/types';
import { Alert, Button, Card, Input, Select, useToast } from './ui';

/** Simple glyphs for the networks the icon set has no logo for; they take the colour of the text around them. */
const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);

export const PLATFORMS: Record<string, { label: string; icon: ReactNode }> = {
  facebook: { label: 'فيسبوك', icon: svg(<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3H9v9h3v-9h2.5l.5-3H12V6.8c0-.5.3-.8.8-.8H15z" />) },
  instagram: { label: 'إنستجرام', icon: svg(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></>) },
  x: { label: 'إكس (تويتر)', icon: svg(<><path d="M4 4l16 16" /><path d="M20 4L4 20" /></>) },
  youtube: { label: 'يوتيوب', icon: svg(<><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></>) },
  tiktok: { label: 'تيك توك', icon: <Music2 className="size-5" aria-hidden /> },
  linkedin: { label: 'لينكدإن', icon: svg(<><path d="M6 10v8M6 6.5v.01M10.5 18v-8M10.5 13c0-2 1.5-3 3-3s3 1 3 3v5" /></>) },
  telegram: { label: 'تيليجرام', icon: <Send className="size-5" aria-hidden /> },
  whatsapp: { label: 'واتساب', icon: <MessageCircle className="size-5" aria-hidden /> },
  snapchat: { label: 'سناب شات', icon: <Ghost className="size-5" aria-hidden /> },
  website: { label: 'موقع إلكتروني', icon: <Globe className="size-5" aria-hidden /> },
  other: { label: 'رابط آخر', icon: <Link2 className="size-5" aria-hidden /> },
};

export function useSocialLinks() {
  return useQuery({ queryKey: ['social-links'], queryFn: () => api<SocialLink[]>('/api/site/social'), staleTime: 5 * 60_000 });
}

/** The family's accounts as round buttons; nothing is drawn while there are none. */
export function SocialIcons({ className = '' }: { className?: string }) {
  const { data } = useSocialLinks();
  if (!data || data.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="حسابات الأسرة على مواقع التواصل">
      {data.map((link) => {
        const platform = PLATFORMS[link.platform] ?? PLATFORMS.other;
        const name = link.label || platform.label;
        return (
          <li key={link.url}>
            <a href={link.url} target="_blank" rel="noopener noreferrer" title={name} aria-label={name}
              className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5 text-ink-200 transition hover:border-gold-300 hover:text-gold-300">
              {platform.icon}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Dashboard editor: add, change and remove the accounts; whatever is saved appears in the footer. */
export function SocialLinksEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useSocialLinks();
  const [rows, setRows] = useState<SocialLink[] | null>(null);
  useEffect(() => { if (data && rows === null) setRows(data.map((l) => ({ ...l, label: l.label ?? '' }))); }, [data, rows]);

  const save = useMutation({
    mutationFn: () => api<SocialLink[]>('/api/admin/site/social', {
      method: 'PUT',
      body: (rows ?? []).filter((r) => r.url.trim()).map((r) => ({ platform: r.platform, url: r.url.trim(), label: r.label?.trim() || null })),
    }),
    onSuccess: (saved) => {
      toast('تم حفظ الروابط. ستظهر في أسفل كل صفحة.');
      setRows(saved.map((l) => ({ ...l, label: l.label ?? '' })));
      void queryClient.invalidateQueries({ queryKey: ['social-links'] });
    },
  });

  const update = (index: number, change: Partial<SocialLink>) => setRows((current) => (current ?? []).map((r, i) => (i === index ? { ...r, ...change } : r)));

  return (
    <Card className="mt-5 p-5 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold"><Globe className="size-5 text-brand-600" /> حسابات الأسرة على مواقع التواصل</h2>
      <p className="mb-4 text-sm text-ink-600">أضف روابط حسابات الأسرة (فيسبوك، إنستجرام، يوتيوب، تيك توك، واتساب…) وتظهر تلقائياً في أسفل كل صفحات الموقع. يمكنك إضافة أكثر من حساب لنفس المنصة.</p>
      {save.error && <div className="mb-3"><Alert>{(save.error as ApiError).message}</Alert></div>}
      <div className="grid gap-3">
        {(rows ?? []).map((row, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-ink-200 p-3 sm:grid-cols-[11rem_1fr_11rem_auto] sm:items-end">
            <Select label="المنصة" value={row.platform} onChange={(e) => update(index, { platform: e.target.value })}>
              {Object.entries(PLATFORMS).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
            </Select>
            <Input label="الرابط" dir="ltr" value={row.url} maxLength={300} placeholder="https://" onChange={(e) => update(index, { url: e.target.value })} />
            <Input label="اسم الحساب (اختياري)" value={row.label ?? ''} maxLength={40} onChange={(e) => update(index, { label: e.target.value })} />
            <button type="button" onClick={() => setRows((current) => (current ?? []).filter((_, i) => i !== index))} className="mb-1 rounded-lg p-2 text-brand-600 hover:bg-brand-50" aria-label="حذف هذا الرابط"><Trash2 className="size-5" /></button>
          </div>
        ))}
        {rows?.length === 0 && <p className="text-ink-600">لا توجد روابط بعد.</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" disabled={(rows?.length ?? 0) >= 12} onClick={() => setRows((current) => [...(current ?? []), { platform: 'facebook', url: '', label: '' }])}><Plus className="size-4" /> إضافة رابط</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>حفظ الروابط</Button>
      </div>
    </Card>
  );
}
