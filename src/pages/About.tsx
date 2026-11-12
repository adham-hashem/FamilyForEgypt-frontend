import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Eye, Target } from 'lucide-react';
import { PageHeader } from '../components/Layout';
import { LinkButton, SectionHeading } from '../components/ui';
import { activities, damietta, figures, goals, intro, principles, sources, structure, timeline } from '../lib/about';
import { homeQuery } from './Home';

const numerals = new Intl.NumberFormat('ar-EG', { useGrouping: false });
/** Years stay ungrouped ("٢٠١٧", never "٢٬٠١٧"). */
const arabicDigits = (value: string) => value.replace(/\d+/g, (digits) => numerals.format(Number(digits)));

export default function About() {
  // Vision and mission are the ones the family's admins edit from the dashboard.
  const { data } = useQuery(homeQuery);
  const settings = data?.settings ?? {};

  return (
    <>
      <PageHeader title="عن الأسرة" subtitle="أسرة طلاب من أجل مصر: كيف بدأت، وما أهدافها، وكيف تعمل في جامعة دمياط." />

      <section className="py-12">
        <div className="container-page grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div>
            <SectionHeading eyebrow="من نحن" title="أسرة طلاب من أجل مصر" />
            <div className="grid gap-4 text-lg leading-9 text-ink-700">
              {intro.map((paragraph) => <p key={paragraph}>{arabicDigits(paragraph)}</p>)}
            </div>
          </div>
          <dl className="grid gap-3">
            {figures.map((figure) => (
              <div key={figure.label} className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
                <dd className="w-24 shrink-0 text-center text-3xl font-black text-brand-700">{arabicDigits(figure.value)}</dd>
                <dt className="font-bold leading-7 text-ink-700">{figure.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container-page">
          <SectionHeading eyebrow="التأسيس والتاريخ" title="من فكرة في جامعة القاهرة إلى كل الجامعات" />
          <ol className="relative grid gap-6 border-s-2 border-ink-200 ps-6">
            {timeline.map((step) => (
              <li key={step.title} className="relative">
                <span className="absolute -start-[calc(1.5rem+7px)] top-1.5 size-3 rounded-full bg-brand-600 ring-4 ring-white" aria-hidden />
                <p className="text-sm font-extrabold text-brand-700">{arabicDigits(step.when)}</p>
                <h3 className="mt-0.5 text-xl font-extrabold">{step.title}</h3>
                <p className="mt-1 max-w-3xl leading-8 text-ink-600">{arabicDigits(step.text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {(settings.vision || settings.mission) && (
        <section className="py-12">
          <div className="container-page grid gap-4 md:grid-cols-2">
            {settings.vision && (
              <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-xl font-extrabold"><Eye className="size-5 text-brand-600" /> رؤيتنا</h2>
                <p className="mt-2 whitespace-pre-line leading-8 text-ink-600">{settings.vision}</p>
              </div>
            )}
            {settings.mission && (
              <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-xl font-extrabold"><Target className="size-5 text-brand-600" /> رسالتنا</h2>
                <p className="mt-2 whitespace-pre-line leading-8 text-ink-600">{settings.mission}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-white py-12">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="لماذا" title="أهداف الأسرة" />
            <ul className="grid gap-3">
              {goals.map((goal) => (
                <li key={goal} className="flex gap-3 leading-8 text-ink-700">
                  <CheckCircle2 className="mt-1.5 size-5 shrink-0 text-brand-600" aria-hidden /> {arabicDigits(goal)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading eyebrow="ماذا نفعل" title="أنشطة الأسرة" />
            <ul className="grid gap-3">
              {activities.map((activity) => (
                <li key={activity} className="flex gap-3 leading-8 text-ink-700">
                  <CheckCircle2 className="mt-1.5 size-5 shrink-0 text-gold-500" aria-hidden /> {activity}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="مبادئ" title="على أي أساس تعمل" />
            <div className="grid gap-3">
              {principles.map((item) => (
                <div key={item.title} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
                  <h3 className="text-lg font-extrabold">{item.title}</h3>
                  <p className="mt-1 leading-8 text-ink-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="التنظيم" title="كيف تُدار الأسرة" />
            <ol className="grid gap-3">
              {structure.map((item, i) => (
                <li key={item.title} className="flex gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-900 font-black text-white">{numerals.format(i + 1)}</span>
                  <div>
                    <h3 className="text-lg font-extrabold">{item.title}</h3>
                    <p className="mt-1 leading-8 text-ink-600">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-ink-900 py-12 text-white">
        <div className="container-page">
          <SectionHeading eyebrow="في جامعتنا" title="الأسرة في جامعة دمياط" light />
          <p className="max-w-3xl text-lg leading-9 text-ink-200">{damietta.intro}</p>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {damietta.items.map((item) => (
              <li key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 leading-8 text-ink-100">
                <CheckCircle2 className="mt-1.5 size-5 shrink-0 text-gold-300" aria-hidden /> {arabicDigits(item)}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/join" variant="gold" size="lg">انضم للأسرة</LinkButton>
            <LinkButton to="/activities" variant="outline" size="lg" className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10">تصفح الأنشطة</LinkButton>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container-page">
          <h2 className="text-lg font-extrabold">مصادر المعلومات</h2>
          <p className="mt-1 text-ink-500">المعلومات التاريخية في هذه الصفحة مأخوذة من حوارات صحفية منشورة مع المنسق العام للأسرة ومن أخبار الجامعات.</p>
          <ul className="mt-3 grid gap-1.5 text-[15px]">
            {sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-bold text-brand-700 hover:underline">
                  <ExternalLink className="size-4" aria-hidden /> {arabicDigits(source.title)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
