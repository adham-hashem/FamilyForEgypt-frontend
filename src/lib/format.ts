import type {
  AdPlacement, AdRequestStatus, ApplicationStatus, CompetitionCategory, CompetitionFormat, CompetitionMode, FeedbackKind,
  FeedbackStatus, FeedbackTopic, LeaderSlot, PostType, ResourceCategory, UserRole,
} from './types';

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

export const LEVELS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة'];
export const levelLabel = (level: number) => (level > 0 ? `الفرقة ${LEVELS[level - 1] ?? level}` : 'كل الفرق');
export const TERMS = ['', 'الفصل الأول', 'الفصل الثاني', 'الفصل الصيفي'];

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
