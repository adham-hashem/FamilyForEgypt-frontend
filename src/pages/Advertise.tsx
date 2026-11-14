import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Megaphone, Users, Eye } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageHeader } from '../components/Layout';
import { Alert, Button, Card, Input, LinkButton, Select, Textarea } from '../components/ui';
import { api, type ApiError } from '../lib/api';

const KINDS = ['إعلان على الموقع', 'رعاية فعالية أو مسابقة', 'تعاون أو فعالية مشتركة', 'عروض وخصومات للطلاب', 'أخرى'];

/** The public form for companies and organisations that want to advertise. The site's admins follow up. */
export default function Advertise() {
  const [form, setForm] = useState({ organizationName: '', contactName: '', phone: '', email: '', website: '', adKind: KINDS[0], message: '', website2: '' });
  const [touched, setTouched] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const errors = {
    organizationName: form.organizationName.trim().length < 2 ? 'اكتب اسم الجهة.' : '',
    contactName: form.contactName.trim().length < 3 ? 'اكتب اسم المسؤول عن التواصل.' : '',
    phone: form.phone.replace(/\D/g, '').length < 6 ? 'اكتب رقم تواصل صحيح.' : '',
    email: !form.email || /^\S+@\S+\.\S+$/.test(form.email.trim()) ? '' : 'البريد الإلكتروني غير صحيح.',
    website: !form.website || /^https?:\/\//i.test(form.website.trim()) ? '' : 'الرابط يبدأ بـ https://',
    message: form.message.trim().length < 10 ? 'اكتب تفاصيل الإعلان المطلوب.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : '');

  const send = useMutation({
    mutationFn: () => api('/api/ad-requests', {
      method: 'POST',
      body: Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null])),
    }),
    onSuccess: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (valid) send.mutate();
  };

  return (
    <>
      <PageHeader title="أعلن معنا" subtitle="وصّل رسالتك لطلاب جامعة دمياط: إعلانات، رعاية فعاليات ومسابقات، وعروض للطلاب." />
      <div className="container-page grid max-w-4xl gap-6 py-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-3">
          {[
            { icon: Users, title: 'جمهور من الطلاب', text: 'طلاب كليات الجامعة يتابعون الأنشطة والجداول هنا يومياً.' },
            { icon: Eye, title: 'ظهور واضح ومحترم', text: 'الإعلان يظهر في أماكن مخصصة ومميَّز بكلمة «إعلان»، بدون نوافذ منبثقة.' },
            { icon: Megaphone, title: 'نتواصل معك', text: 'يراجع مسؤولو الأسرة طلبك ويتواصلون معك لتفاصيل الإعلان.' },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title} className="flex gap-3 p-4">
              <Icon className="mt-0.5 size-6 shrink-0 text-brand-600" />
              <div><p className="font-extrabold">{title}</p><p className="text-sm text-ink-600">{text}</p></div>
            </Card>
          ))}
        </div>

        {send.isSuccess ? (
          <Card className="p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <h2 className="mt-3 text-2xl font-black">وصلنا طلبك، شكراً لك</h2>
            <p className="mt-2 text-ink-600">سيتواصل معك مسؤولو الأسرة على بيانات التواصل التي كتبتها.</p>
            <LinkButton to="/" variant="outline" className="mt-5">العودة للرئيسية</LinkButton>
          </Card>
        ) : (
          <Card className="p-5 sm:p-6">
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <Input label="اسم الجهة / المؤسسة" required value={form.organizationName} onChange={set('organizationName')} error={show('organizationName')} />
              <Input label="اسم المسؤول عن التواصل" required value={form.contactName} onChange={set('contactName')} error={show('contactName')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="رقم التواصل" required type="tel" dir="ltr" value={form.phone} onChange={set('phone')} error={show('phone')} />
                <Input label="البريد الإلكتروني" type="email" dir="ltr" value={form.email} onChange={set('email')} error={show('email')} hint="اختياري" />
              </div>
              <Input label="الموقع أو صفحة التواصل الاجتماعي" dir="ltr" value={form.website} onChange={set('website')} error={show('website')} placeholder="https://" hint="اختياري" />
              <Select label="نوع الإعلان" value={form.adKind} onChange={set('adKind')}>
                {KINDS.map((k) => <option key={k}>{k}</option>)}
              </Select>
              <Textarea label="تفاصيل الإعلان المطلوب" required rows={5} maxLength={3000} value={form.message} onChange={set('message')} error={show('message')}
                placeholder="ماذا تريد أن تعلن؟ ولأي فترة؟" />
              {/* Hidden from people; bots fill it in and are quietly ignored. */}
              <input type="text" name="website2" value={form.website2} onChange={set('website2')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              {send.error && <Alert>{(send.error as ApiError).message}</Alert>}
              <Button type="submit" variant="gold" size="lg" loading={send.isPending}>إرسال الطلب</Button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
