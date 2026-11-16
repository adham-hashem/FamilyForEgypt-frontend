import type { AdPlacement, AdRequestStatus, ApplicationStatus, CompetitionCategory, CompetitionFormat, CompetitionMode, FeedbackKind, FeedbackStatus, FeedbackTopic, LeaderSlot, PostType, ResourceCategory, StudySystem, UserRole } from './types';

const TZ = 'Africa/Cairo';
const dateFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('ar-EG', {
  timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, day: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, month: 'short' });
const numberFmt = new Intl.NumberFormat('ar-EG');

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '');
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : '');
export const formatTime = (iso: string | null | undefined) => (iso ? timeFmt.format(new Date(iso)) : '');
export const formatDay = (iso: string) => dayFmt.format(new Date(iso));
export const formatMonth = (iso: string) => monthFmt.format(new Date(iso));
export const formatNumber = (value: number) => numberFmt.format(value);

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} ك.ب`;
  return `${numberFmt.format(Math.round((bytes / 1024 / 1024) * 10) / 10)} م.ب`;
}

/** Converts a UTC ISO string to the value a datetime-local input expects, in Cairo time. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Reads a datetime-local value as Cairo time, wherever the administrator's browser happens to be. */
export function fromLocalInput(value: string) {
  if (!value) return '';
  const asUtc = new Date(`${value}:00Z`);
  const shown = toLocalInput(asUtc.toISOString());
  const offset = new Date(`${shown}:00Z`).getTime() - asUtc.getTime();
  return new Date(asUtc.getTime() - offset).toISOString();
}

export const ROLE_LABELS: Record<UserRole, string> = {
  Student: 'طالب',
  CollegeEditor: 'محرر كلية',
  CollegeAdmin: 'رائد الأسرة بالكلية',
  UniversityAdmin: 'مسؤول الجامعة',
  SuperAdmin: 'مدير النظام',
};

export const ROLE_RANK: Record<UserRole, number> = {
  Student: 0, CollegeEditor: 10, CollegeAdmin: 20, UniversityAdmin: 30, SuperAdmin: 40,
};

export const ROLE_HINTS: Record<UserRole, string> = {
  Student: 'حساب عادي بدون صلاحيات إدارية.',
  CollegeEditor: 'ينشر ويعدّل أخبار وفعاليات ومحتوى كليته فقط.',
  CollegeAdmin: 'رائد الأسرة في كليته: يرفع الجداول والمقررات والمحاضرات، يراجع طلبات العضوية والمقترحات والشكاوى، ويضيف المحررين.',
  UniversityAdmin: 'ينشئ الكليات ويعيّن مسؤوليها، ويدير محتوى الجامعة والصفحة الرئيسية.',
  SuperAdmin: 'كل الصلاحيات.',
};

export const POST_TYPE_LABELS: Record<PostType, string> = { News: 'خبر', Event: 'فعالية', Announcement: 'إعلان' };

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  Schedule: 'جداول المحاضرات',
  ExamSchedule: 'جداول الامتحانات',
  Lecture: 'المحاضرات',
  Tutorial: 'السكاشن (Tutorials)',
  Summary: 'الملخصات',
  Assignment: 'التكليفات (Assignments)',
  EducationalEvent: 'أحداث تعليمية',
  Material: 'مذكرات وملفات',
  PastExam: 'امتحانات سابقة',
  Other: 'أخرى',
};

/** What the date of an item means, for the categories that have one. */
export const DUE_LABELS: Partial<Record<ResourceCategory, string>> = {
  Assignment: 'آخر موعد للتسليم',
  ExamSchedule: 'موعد الامتحان',
  EducationalEvent: 'الموعد',
};

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  Home: 'الصفحة الرئيسية',
  Feed: 'بين الأنشطة والأخبار',
  Content: 'أسفل صفحات المحتوى',
};

export const AD_REQUEST_STATUS_LABELS: Record<AdRequestStatus, string> = {
  New: 'جديد', Contacted: 'تم التواصل', Accepted: 'مقبول', Rejected: 'مرفوض',
};

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = { Suggestion: 'اقتراح', Complaint: 'شكوى' };
export const FEEDBACK_TOPIC_LABELS: Record<FeedbackTopic, string> = {
  Activities: 'الأنشطة والفعاليات', Education: 'العملية التعليمية', Other: 'موضوع آخر',
};
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = { New: 'جديدة', InReview: 'قيد المتابعة', Resolved: 'تم الرد' };

export const COMPETITION_CATEGORY_LABELS: Record<CompetitionCategory, string> = {
  Cultural: 'ثقافية', Religious: 'دينية', Scientific: 'علمية', Sports: 'رياضية', Arts: 'فنية', Literary: 'أدبية', Technology: 'تقنية', Other: 'أخرى',
};
export const COMPETITION_MODE_LABELS: Record<CompetitionMode, string> = { OnSite: 'على أرض الواقع', Online: 'على الموقع' };
export const COMPETITION_FORMAT_LABELS: Record<CompetitionFormat, string> = {
  Registration: 'تسجيل للمشاركة', Riddle: 'فزورة / سؤال', Quiz: 'أسئلة اختيار من متعدد', Submission: 'إرسال عمل (صورة، ملف، نص)',
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Pending: 'قيد المراجعة',
  Approved: 'مقبول',
  Rejected: 'مرفوض',
  NeedsChanges: 'مطلوب تعديل',
};

export const SLOT_LABELS: Record<LeaderSlot, string> = {
  President: 'رئيس الجمهورية (أعلى الصفحة)',
  UniversityPresident: 'رئيس الجامعة (بعد الفيديو)',
  Other: 'قيادات أخرى',
};

const ORDINALS_F = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة'];
const ORDINALS_M = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع'];
/** The ordinals for the default word «المستوى» (masculine). */
export const LEVELS = ORDINALS_M;
/** What a level is called in the college's study system. «المستوى» unless the system says otherwise (e.g. «المرحلة»). */
export const levelWord = (system?: StudySystem | null) => system?.levelWord ?? 'المستوى';
/** «الأولى» after a feminine word such as «المرحلة», «الأول» after a masculine one such as «المستوى». */
export const levelName = (level: number, system?: StudySystem | null) =>
  (levelWord(system).endsWith('ة') ? ORDINALS_F : ORDINALS_M)[level - 1] ?? String(level);
export const levelLabel = (level: number, system?: StudySystem | null) => {
  const word = levelWord(system);
  if (level > 0) return `${word} ${levelName(level, system)}`;
  return word === 'المستوى' ? 'كل المستويات' : 'الكل';
};
export const TERMS = ['', 'الفصل الأول', 'الفصل الثاني', 'الفصل الصيفي', 'سنوي (طوال العام)'];

export const COURSE_KIND_LABELS: Record<number, string> = {
  0: 'غير محدد', 1: 'إجباري', 2: 'اختياري', 3: 'متطلب جامعة', 4: 'متطلب كلية',
};
export const COURSE_LANGUAGES = ['العربية', 'English', 'Français'];
export const DEPARTMENT_KIND_LABELS: Record<number, string> = { 1: 'قسم', 2: 'شعبة', 3: 'برنامج' };

/** Departments, divisions or programs commonly found in a college of this kind, for the leader to pick from in one tap. */
export function departmentSuggestions(collegeName: string): { name: string; kind: number }[] {
  const n = collegeName;
  const d = (kind: number, ...names: string[]) => names.map((name) => ({ name, kind }));
  if (/حاسب|معلومات|ذكاء/.test(n)) return d(3, 'علوم الحاسب', 'نظم المعلومات', 'تكنولوجيا المعلومات', 'الذكاء الاصطناعي', 'أمن المعلومات', 'علوم البيانات');
  if (/هندس/.test(n)) return d(1, 'الهندسة المدنية', 'الهندسة الميكانيكية', 'الهندسة الكهربية', 'هندسة الإلكترونيات والاتصالات', 'الهندسة المعمارية', 'هندسة الحاسبات', 'الهندسة الكيميائية');
  if (/علوم/.test(n)) return d(2, 'الرياضيات', 'الفيزياء', 'الكيمياء', 'النبات', 'علم الحيوان', 'الجيولوجيا', 'الإحصاء', 'علوم الحاسب');
  if (/تجار|إدارة/.test(n)) return [...d(2, 'المحاسبة', 'إدارة الأعمال', 'الاقتصاد', 'التأمين والإحصاء', 'نظم المعلومات الإدارية'), ...d(3, 'القسم الإنجليزي')];
  if (/آداب|اداب/.test(n)) return d(1, 'اللغة العربية', 'اللغة الإنجليزية', 'اللغة الفرنسية', 'التاريخ', 'الجغرافيا', 'علم الاجتماع', 'علم النفس', 'الإعلام', 'المكتبات والمعلومات', 'الفلسفة');
  if (/تربي/.test(n)) return d(2, 'معلم فصل', 'تعليم أساسي', 'لغة عربية', 'لغة إنجليزية', 'رياضيات', 'علوم', 'دراسات اجتماعية', 'تربية خاصة');
  if (/حقوق/.test(n)) return [...d(1, 'القانون العام', 'القانون الخاص', 'القانون الجنائي', 'الشريعة الإسلامية'), ...d(3, 'القسم الفرنسي')];
  if (/صيدل/.test(n)) return d(1, 'الصيدلانيات', 'الكيمياء الصيدلية', 'العقاقير', 'الأدوية والسموم', 'الصيدلة الإكلينيكية', 'الميكروبيولوجيا');
  if (/طب|بشري/.test(n) && !/بيطر|أسنان/.test(n)) return d(1, 'التشريح', 'الفسيولوجيا', 'الكيمياء الحيوية', 'الباثولوجيا', 'الباطنة', 'الجراحة', 'الأطفال', 'النساء والتوليد');
  if (/أسنان|اسنان/.test(n)) return d(1, 'جراحة الفم', 'علاج الجذور', 'التقويم', 'طب الأطفال', 'الأسنان الصناعية', 'أمراض اللثة');
  if (/بيطر/.test(n)) return d(1, 'التشريح', 'الفسيولوجيا', 'الباثولوجيا', 'الطفيليات', 'الجراحة', 'صحة الحيوان');
  if (/زراع/.test(n)) return d(1, 'الإنتاج النباتي', 'الإنتاج الحيواني', 'الأراضي والمياه', 'وقاية النبات', 'الصناعات الغذائية');
  if (/تمريض/.test(n)) return d(1, 'تمريض الباطنة والجراحة', 'تمريض الأطفال', 'تمريض الأمومة', 'التمريض النفسي', 'إدارة التمريض');
  if (/علاج طبيعي/.test(n)) return d(1, 'علاج العظام', 'علاج الأعصاب', 'العلاج الطبيعي للأطفال', 'علاج القلب والصدر');
  if (/سياح|فنادق/.test(n)) return d(1, 'الدراسات السياحية', 'الدراسات الفندقية', 'الإرشاد السياحي', 'الآثار');
  if (/فنون/.test(n)) return d(1, 'التصميم', 'الرسم', 'النحت', 'التصوير', 'الجرافيك');
  if (/خدمة اجتماعية/.test(n)) return d(1, 'مجالات الخدمة الاجتماعية', 'التخطيط الاجتماعي');
  return [];
}


export const GOVERNORATES = [
  'دمياط', 'الدقهلية', 'بورسعيد', 'كفر الشيخ', 'الغربية', 'الشرقية', 'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية',
  'المنوفية', 'البحيرة', 'الإسماعيلية', 'السويس', 'شمال سيناء', 'جنوب سيناء', 'الفيوم', 'بني سويف', 'المنيا',
  'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
];

export const COMMITTEES = [
  'اللجنة الثقافية', 'اللجنة العلمية والتكنولوجية', 'اللجنة الرياضية', 'اللجنة الفنية', 'اللجنة الاجتماعية والرحلات',
  'لجنة الجوالة والخدمة العامة', 'اللجنة الإعلامية', 'لجنة التنظيم',
];

/** Latin digits out of whatever keyboard the student used. */
export function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

// ---------- the academic calendar ----------

/** The academic year starts in September and is named by its first calendar year: 2026 is «2026/2027». */
export const currentAcademicYear = (now = new Date()) => (now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1);

/** September to January is the first term, February to June the second, July and August the summer. */
export const currentTerm = (now = new Date()) => {
  const month = now.getMonth() + 1;
  return month >= 9 || month === 1 ? 1 : month <= 6 ? 2 : 3;
};

/** Shown left to right whatever the page direction, so it always reads 2026/2027. */
export const academicYearLabel = (year: number) => `⁦${year}/${year + 1}⁩`;

/** Levels a college actually has, as "المستوى الأول"…; falls back to four. */
export const levelOptions = (levelsCount: number | null | undefined, system?: StudySystem | null) =>
  Array.from({ length: Math.min(Math.max(levelsCount ?? 4, 1), ORDINALS_M.length) }, (_, i) => ({ value: i + 1, label: levelLabel(i + 1, system) }));

/** What a college usually has: levels of study by kind of college, so the leader starts from a sensible number. */
export function suggestedLevels(collegeName: string): number {
  if (/بشري|^كلية الطب$|^كلية الطب /.test(collegeName) && !/بيطر|أسنان/.test(collegeName)) return 6;
  if (/هندس|صيدل|أسنان|بيطر/.test(collegeName)) return 5;
  return 4;
}
