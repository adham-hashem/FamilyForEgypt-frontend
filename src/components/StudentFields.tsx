import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { levelOptions, normalizeDigits } from '../lib/format';
import type { College } from '../lib/types';
import { Input, Select } from './ui';

/** What a student types about themselves when sending something. Short on purpose, so nobody gives up. */
export interface StudentInfo {
  fullName: string;
  nationalId: string;
  collegeId: string;
  department: string;
  level: string;
  phone: string;
}

const EMPTY: StudentInfo = { fullName: '', nationalId: '', collegeId: '', department: '', level: '', phone: '' };

export function useStudentInfo() {
  const [info, setInfo] = useState<StudentInfo>(EMPTY);
  const errors = {
    fullName: info.fullName.trim().length < 5 ? 'اكتب اسمك ثلاثياً على الأقل.' : '',
    nationalId: /^[23]\d{13}$/.test(info.nationalId) ? '' : 'الرقم القومي 14 رقماً كما في البطاقة.',
    collegeId: info.collegeId ? '' : 'اختر الكلية.',
    level: info.level ? '' : 'اختر المستوى.',
    phone: !info.phone || /^01[0125]\d{8}$/.test(info.phone) ? '' : 'رقم الموبايل غير صحيح.',
  };
  const valid = Object.values(errors).every((e) => !e);
  /** The fields as the API expects them, ready to merge into a body or a form. */
  const payload = {
    fullName: info.fullName.trim(),
    nationalId: info.nationalId,
    collegeId: Number(info.collegeId),
    department: info.department.trim() || null,
    level: Number(info.level),
    phone: info.phone || null,
  };
  return { info, setInfo, errors, valid, payload, reset: () => setInfo(EMPTY) };
}

export function StudentFields({ state, touched, askPhone }: {
  state: ReturnType<typeof useStudentInfo>; touched: boolean; askPhone?: boolean;
}) {
  const { info, setInfo, errors } = state;
  const colleges = useQuery({ queryKey: ['colleges'], queryFn: () => api<College[]>('/api/colleges'), staleTime: 300_000 });
  const set = (key: keyof StudentInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInfo((s) => ({ ...s, [key]: e.target.value }));
  const digits = (key: keyof StudentInfo, max: number) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInfo((s) => ({ ...s, [key]: normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, max) }));
  const show = (key: keyof typeof errors) => (touched ? errors[key] : '');

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="الاسم" required value={info.fullName} onChange={set('fullName')} error={show('fullName')} autoComplete="name" />
      <Input label="الرقم القومي" required dir="ltr" inputMode="numeric" autoComplete="off" value={info.nationalId} onChange={digits('nationalId', 14)}
        error={show('nationalId')} hint="لا يظهر لأحد، ويُحفظ مشفّراً." />
      <Select label="الكلية" required value={info.collegeId} onChange={set('collegeId')} error={show('collegeId')} disabled={colleges.isPending}>
        <option value="">{colleges.isPending ? 'جارٍ التحميل…' : 'اختر الكلية'}</option>
        {colleges.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Select label="المستوى" required value={info.level} onChange={set('level')} error={show('level')}>
        <option value="">اختر المستوى</option>
        {levelOptions(colleges.data?.find((c) => String(c.id) === info.collegeId)?.levelsCount ?? 7, colleges.data?.find((c) => String(c.id) === info.collegeId)?.studySystem).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
      <Input label="القسم / الشعبة" value={info.department} onChange={set('department')} hint="اختياري" />
      {askPhone && (
        <Input label="رقم الموبايل" type="tel" dir="ltr" inputMode="numeric" value={info.phone} onChange={digits('phone', 11)} error={show('phone')}
          hint="اختياري — للتواصل معك إذا لزم" />
      )}
    </div>
  );
}
