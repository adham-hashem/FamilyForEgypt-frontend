import { useQuery } from '@tanstack/react-query';
import { HomeAds } from '../components/AdSlot';
import { FlagName } from '../components/FlagName';
import { ArrowLeft, Building2, CalendarDays, Eye, Lightbulb, MessageSquareWarning, Newspaper, Target, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PostGrid } from '../components/PostCard';
import { EmptyState, ErrorState, LinkButton, SectionHeading } from '../components/ui';
import { api, mediaUrl } from '../lib/api';
import { formatNumber } from '../lib/format';
import type { College, HomeData, Leader } from '../lib/types';

export const homeQuery = { queryKey: ['home'], queryFn: () => api<HomeData>('/api/home'), staleTime: 60_000 };

function HeroSkeleton() {
  return (
    <div className="min-h-[calc(100svh-67px)] bg-ink-900">
      <div className="container-page grid gap-8 py-14 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="skeleton h-6 w-40 opacity-20" />
          <div className="skeleton h-14 w-4/5 opacity-20" />
          <div className="skeleton h-6 w-3/5 opacity-20" />
          <div className="skeleton h-12 w-48 opacity-20" />
        </div>
        <div className="skeleton h-80 opacity-20" />
      </div>
    </div>
  );
}

/** The first thing on the page: the President, beside the family's name and call to action. */
function Hero({ data }: { data: HomeData }) {
  const president = data.leaders.find((l) => l.slot === 'President');
  const stats = [
    { icon: Building2, value: data.stats.colleges, label: 'كلية' },
    { icon: CalendarDays, value: data.stats.events, label: 'فعالية' },
    { icon: Newspaper, value: data.stats.posts, label: 'خبر وإعلان' },
    { icon: Users, value: data.stats.members, label: 'عضو' },
  ];

  return (
    // Fills the first screen under the 67 px header (64 px bar + 3 px flag line).
    <section className="relative flex min-h-[calc(100svh-67px)] flex-col overflow-hidden bg-ink-900 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-40 start-[-10%] size-[34rem] rounded-full bg-brand-600/30 blur-[110px]" />
        <div className="absolute bottom-[-30%] end-[-5%] size-[30rem] rounded-full bg-flame-500/20 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="container-page relative grid flex-1 items-end gap-6 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-14">
        <div className="pb-10 text-center animate-rise lg:self-center lg:pb-14 lg:text-start">
          <img src="/brand/logo.webp" alt="شعار أسرة طلاب من أجل مصر" width={132} height={132} className="mx-auto size-28 drop-shadow-2xl sm:size-32 lg:mx-0" fetchPriority="high" />
          <p className="mt-5 text-sm font-extrabold tracking-wide text-gold-300">جامعة دمياط</p>
          <h1 className="mt-1 text-4xl font-black leading-[1.25] sm:text-5xl lg:text-6xl lg:leading-[1.2]">
            أسرة طلاب <FlagName />
          </h1>
          {data.settings.tagline && <p className="mx-auto mt-4 max-w-xl text-lg text-ink-300 lg:mx-0">{data.settings.tagline}</p>}

          <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
            <LinkButton to="/join" variant="gold" size="lg">انضم للأسرة الآن <ArrowLeft className="size-5" /></LinkButton>
            <LinkButton to="/activities" variant="outline" size="lg" className="!border-white/25 !bg-white/5 !text-white hover:!bg-white/15">
              تصفح الأنشطة
            </LinkButton>
          </div>

          <dl className="mx-auto mt-9 grid max-w-md grid-cols-4 gap-2 lg:mx-0">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center">
                <Icon className="mx-auto size-5 text-gold-300" aria-hidden />
                <dd className="mt-1 text-xl font-black">{formatNumber(value)}</dd>
                <dt className="text-xs font-semibold text-ink-400">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {president && (
          <figure className="relative mx-auto w-full max-w-md animate-rise [animation-delay:120ms] lg:max-w-none lg:self-end">
            <div className="absolute inset-x-6 bottom-0 top-16 rounded-t-[3rem] bg-gradient-to-b from-brand-600/50 via-brand-800/40 to-transparent" aria-hidden />
            {president.photoUrl && (
              <img
                src={mediaUrl(president.photoUrl)}
                alt={president.name}
                className="relative mx-auto max-h-[30rem] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] lg:max-h-[calc(100svh-67px-4.5rem)]"
                fetchPriority="high"
              />
            )}
            <figcaption className="absolute inset-x-3 bottom-4 rounded-2xl border border-white/15 bg-ink-950/75 px-5 py-3 text-center backdrop-blur-md">
              <p className="text-lg font-black sm:text-xl">{president.name}</p>
              <p className="text-sm font-bold text-gold-300">{president.title}</p>
            </figcaption>
          </figure>
        )}
      </div>
      <div className="h-1 flag-line" aria-hidden />
    </section>
  );
}

/**
 * A wide picture right under the opening section, uploaded from the dashboard: for example the
 * students standing to form «من أجل مصر». It is shown whole, never cropped, because the picture is the message.
 */
function Banner({ settings }: { settings: Record<string, string> }) {
  const url = settings.bannerUrl;
  if (!url) return null;
  const thumb = settings.bannerThumbUrl;
  return (
    <section className="bg-ink-950 text-white">
      {settings.bannerTitle && (
        <h2 className="container-page pt-8 text-center text-2xl font-black sm:text-3xl">{settings.bannerTitle}</h2>
      )}
      <div className={settings.bannerTitle ? 'container-page py-6' : 'container-page py-8'}>
        <img
          src={mediaUrl(url)}
          srcSet={thumb ? `${mediaUrl(thumb)} 960w, ${mediaUrl(url)} 2400w` : undefined}
          sizes="(min-width: 1280px) 1216px, 100vw"
          alt={settings.bannerTitle || 'طلاب جامعة دمياط يكوّنون جملة «من أجل مصر»'}
          loading="lazy"
          decoding="async"
          className="mx-auto h-auto w-full max-w-6xl rounded-3xl border border-white/10 shadow-lift"
        />
      </div>
      <div className="h-[3px] flag-line" aria-hidden />
    </section>
  );
}

/** The ways a student takes part beyond joining: competitions, suggestions and complaints. */
function TakePart() {
  const items = [
    { to: '/competitions', icon: Trophy, title: 'المسابقات', text: 'ثقافية ودينية وعلمية ورياضية وفنية: شارك من هنا أو سجّل للمسابقات على أرض الواقع.', tone: 'from-gold-300/30 to-flame-500/10' },
    { to: '/feedback', icon: Lightbulb, title: 'شاركنا اقتراحك', text: 'فكرة لنشاط أو تحسين في العملية التعليمية؟ اقتراحك يصل لرائد الأسرة في كليتك.', tone: 'from-emerald-200/50 to-emerald-50' },
    { to: '/feedback?kind=complaint', icon: MessageSquareWarning, title: 'قدّم شكوى', text: 'مشكلة واجهتك؟ أرسلها وتابع الرد عليها برقمك القومي.', tone: 'from-brand-200/50 to-brand-50' },
  ];
  return (
    <section className="py-14">
      <div className="container-page">
        <SectionHeading eyebrow="صوتك مسموع" title="شارك معنا" />
        <div className="grid gap-4 md:grid-cols-3">
          {items.map(({ to, icon: Icon, title, text, tone }) => (
            <Link key={to} to={to} className={`group rounded-2xl border border-ink-200 bg-gradient-to-br ${tone} p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift`}>
              <Icon className="size-8 text-ink-800" />
              <p className="mt-3 text-xl font-black group-hover:text-brand-700">{title}</p>
              <p className="mt-1 leading-7 text-ink-600">{text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoSection({ data }: { data: HomeData }) {
  const url = data.settings.videoUrl;
  if (!url) return null;
  return (
    <section className="bg-ink-950 py-14 text-white">
      <div className="container-page">
        <SectionHeading eyebrow="شاهد" title={data.settings.videoTitle || 'تعرّف على الأسرة'} light />
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-lift">
          <video src={mediaUrl(url)} controls playsInline preload="metadata" className="aspect-video w-full bg-black">
            متصفحك لا يدعم تشغيل الفيديو.
          </video>
        </div>
      </div>
    </section>
  );
}

function UniversityPresident({ leader }: { leader: Leader }) {
  return (
    <section className="bg-white py-14">
      <div className="container-page">
        <div className="relative grid items-end overflow-hidden rounded-[2rem] bg-gradient-to-l from-ink-900 via-ink-800 to-ink-900 text-white shadow-lift md:grid-cols-[0.8fr_1.2fr]">
          <div className="pointer-events-none absolute -end-20 -top-20 size-72 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
          <div className="relative order-2 px-6 pt-6 md:order-1 md:ps-10">
            {leader.photoUrl && (
              <img src={mediaUrl(leader.photoUrl)} alt={leader.name} loading="lazy" className="mx-auto max-h-[24rem] w-auto object-contain object-bottom drop-shadow-2xl" />
            )}
          </div>
          <div className="relative order-1 p-8 md:order-2 md:p-12">
            <div className="flex items-center gap-3">
              <img src="/brand/university.webp" alt="شعار جامعة دمياط" width={56} height={56} className="size-14 rounded-xl bg-white p-1" loading="lazy" />
              <p className="text-sm font-extrabold text-gold-300">تحت رعاية</p>
            </div>
            <h2 className="mt-4 text-3xl font-black leading-snug sm:text-4xl">{leader.name}</h2>
            <p className="mt-2 text-xl font-bold text-gold-300">{leader.title}</p>
            <span className="mt-5 block h-1 w-20 rounded-full flag-line" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}

function About({ settings }: { settings: Record<string, string> }) {
  if (!settings.about && !settings.vision && !settings.mission) return null;
  return (
    <section className="py-14">
      <div className="container-page grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading eyebrow="من نحن" title="عن الأسرة" />
          <p className="whitespace-pre-line text-lg leading-9 text-ink-700">{settings.about}</p>
          <Link to="/about" className="mt-4 inline-flex items-center gap-1.5 font-extrabold text-brand-700 hover:underline">
            تأسيس الأسرة وتاريخها <ArrowLeft className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4">
          {settings.vision && (
            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
              <h3 className="flex items-center gap-2 text-lg font-extrabold"><Eye className="size-5 text-brand-600" /> رؤيتنا</h3>
              <p className="mt-2 whitespace-pre-line leading-8 text-ink-600">{settings.vision}</p>
            </div>
          )}
          {settings.mission && (
            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
              <h3 className="flex items-center gap-2 text-lg font-extrabold"><Target className="size-5 text-brand-600" /> رسالتنا</h3>
              <p className="mt-2 whitespace-pre-line leading-8 text-ink-600">{settings.mission}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function CollegeTile({ college }: { college: College }) {
  return (
    <Link
      to={`/colleges/${college.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
    >
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-100">
        {college.logoThumbUrl ? (
          <img src={mediaUrl(college.logoThumbUrl)} alt="" loading="lazy" className="size-full object-contain p-1" />
        ) : (
          <Building2 className="size-7 text-ink-400" aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="block font-extrabold text-ink-900 group-hover:text-brand-700">{college.name}</span>
        <span className="text-sm text-ink-500">الأخبار، الجداول والمحاضرات</span>
      </span>
      <ArrowLeft className="ms-auto size-5 shrink-0 text-ink-300 transition group-hover:-translate-x-1 group-hover:text-brand-600" aria-hidden />
    </Link>
  );
}

export default function Home() {
  const { data, isPending, isError, refetch } = useQuery(homeQuery);

  if (isPending) return <HeroSkeleton />;
  if (isError) return <div className="py-20"><ErrorState message="تعذر تحميل الصفحة الرئيسية." onRetry={() => void refetch()} /></div>;

  const universityPresident = data.leaders.find((l) => l.slot === 'UniversityPresident');
  const others = data.leaders.filter((l) => l.slot === 'Other');
  const seeAll = (to: string) => (
    <Link to={to} className="flex items-center gap-1 text-[15px] font-extrabold text-brand-700 hover:underline">
      عرض الكل <ArrowLeft className="size-4" />
    </Link>
  );

  return (
    <>
      <Hero data={data} />
      <Banner settings={data.settings} />
      <VideoSection data={data} />
      {universityPresident && <UniversityPresident leader={universityPresident} />}

      <section className="py-14">
        <div className="container-page">
          <SectionHeading eyebrow="لا تفوّتها" title="الفعاليات القادمة" action={seeAll('/activities?view=upcoming')} />
          {data.upcomingEvents.length > 0 ? (
            <PostGrid posts={data.upcomingEvents} />
          ) : (
            <EmptyState title="لا توجد فعاليات مجدولة حالياً" text="تابعنا، سيتم الإعلان عن الفعاليات القادمة هنا فور تحديدها." />
          )}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-page">
          <SectionHeading eyebrow="آخر المستجدات" title="أحدث الأنشطة والأخبار" action={seeAll('/activities')} />
          {data.latestPosts.length > 0 ? (
            <PostGrid posts={data.latestPosts} withAd />
          ) : (
            <EmptyState title="لا توجد أخبار بعد" text="ستظهر أخبار وأنشطة الأسرة والكليات هنا." />
          )}
        </div>
      </section>

      <TakePart />

      <HomeAds />

      <About settings={data.settings} />

      {others.length > 0 && (
        <section className="bg-white py-14">
          <div className="container-page">
            <SectionHeading eyebrow="فريق العمل" title="قيادات الأسرة" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((leader) => (
                <div key={leader.id} className="overflow-hidden rounded-2xl border border-ink-200 bg-sand text-center shadow-card">
                  <div className="flex h-56 items-end justify-center bg-gradient-to-b from-ink-800 to-ink-900">
                    {leader.photoUrl && <img src={mediaUrl(leader.photoUrl)} alt={leader.name} loading="lazy" className="max-h-full object-contain" />}
                  </div>
                  <div className="p-4">
                    <p className="font-extrabold">{leader.name}</p>
                    <p className="text-sm font-semibold text-brand-700">{leader.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.colleges.length > 0 && (
        <section className="py-14">
          <div className="container-page">
            <SectionHeading eyebrow="اختر كليتك" title="كليات الجامعة" action={seeAll('/colleges')} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.colleges.slice(0, 9).map((college) => <CollegeTile key={college.id} college={college} />)}
            </div>
          </div>
        </section>
      )}

      <section className="pb-16">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-brand-700 via-brand-600 to-flame-500 px-6 py-12 text-center text-white shadow-lift sm:px-12">
            <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" aria-hidden />
            <h2 className="relative text-3xl font-black sm:text-4xl">كن جزءاً من الأسرة</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-lg text-white/90">
              سجّل بياناتك في دقائق، وتابع حالة طلبك من حسابك، وشارك في أنشطة تصنع فارقاً.
            </p>
            <LinkButton to="/join" variant="dark" size="lg" className="relative mt-7">سجّل الآن <ArrowLeft className="size-5" /></LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
