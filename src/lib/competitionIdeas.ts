import type { CompetitionCategory, CompetitionFormat, CompetitionMode } from './types';

/** A ready-made competition the organisers can start from: one tap fills the form, then they adjust it. */
export interface CompetitionIdea {
  title: string;
  /** One line shown on the idea card. */
  blurb: string;
  category: CompetitionCategory;
  mode: CompetitionMode;
  format: CompetitionFormat;
  description: string;
  rules?: string;
  prize?: string;
  location?: string;
  /** The riddle text, or what participants must submit. */
  question?: string;
  acceptedAnswers?: string[];
  questions?: { text: string; options: string[]; correct: number }[];
}

export const COMPETITION_IDEAS: CompetitionIdea[] = [
  // ----- على الموقع: فزورة -----
  {
    title: 'فزورة الأسبوع', blurb: 'فزورة جديدة كل أسبوع والفائز من يجيب أولاً', category: 'Cultural', mode: 'Online', format: 'Riddle',
    description: 'فزورة أسبوعية لكل طلاب الجامعة. أرسل إجابتك قبل انتهاء المهلة، والإجابات الصحيحة تدخل السحب على الجائزة.',
    rules: 'مشاركة واحدة لكل طالب.\nلا يُقبل التعديل بعد الإرسال.\nيُعلن الفائز بعد انتهاء المهلة.',
    prize: 'هدية رمزية من الأسرة', acceptedAnswers: [],
  },
  {
    title: 'من أنا؟ شخصية من التاريخ', blurb: 'تلميحات عن شخصية مصرية والمطلوب معرفتها', category: 'Cultural', mode: 'Online', format: 'Riddle',
    description: 'نعطيك تلميحات عن شخصية مصرية أثّرت في التاريخ أو العلم أو الأدب، وعليك أن تعرفها.',
    rules: 'إجابة واحدة لكل طالب.\nتُقبل الإجابة بالاسم الأول أو الكامل.',
    acceptedAnswers: [],
  },
  {
    title: 'لغز علمي', blurb: 'سؤال علمي بسيط يحتاج تفكيراً', category: 'Scientific', mode: 'Online', format: 'Riddle',
    description: 'لغز علمي من مجال دراستنا. فكّر جيداً وأرسل إجابتك.',
    rules: 'إجابة واحدة لكل طالب.', acceptedAnswers: [],
  },
  // ----- على الموقع: اختبار -----
  {
    title: 'اختبر معلوماتك عن دمياط', blurb: 'أسئلة عن محافظتنا وجامعتنا', category: 'Cultural', mode: 'Online', format: 'Quiz',
    description: 'اختبار قصير عن دمياط ومعالمها وصناعاتها. الدرجة الأعلى تفوز، وعند التساوي يُفضَّل الأسرع.',
    rules: 'محاولة واحدة لكل طالب.\nالدرجة بعدد الإجابات الصحيحة.',
    prize: 'شهادة تقدير',
    questions: [
      { text: 'تشتهر دمياط بصناعة...', options: ['الأثاث', 'السيارات', 'الأسمنت', 'الورق'], correct: 0 },
      { text: 'تقع مدينة دمياط على...', options: ['فرع دمياط من النيل', 'خليج السويس', 'البحيرة المرة', 'نهر آخر'], correct: 0 },
    ],
  },
  {
    title: 'ثقافة عامة بين الكليات', blurb: 'تحدّي معلومات عامة يجمع كليات الجامعة', category: 'Cultural', mode: 'Online', format: 'Quiz',
    description: 'مسابقة ثقافة عامة بين كليات الجامعة. تُحتسب درجتك لصالحك ولصالح كليتك.',
    rules: 'محاولة واحدة لكل طالب.', prize: 'درع الكلية الأكثر تفوقاً',
    questions: [
      { text: 'ما عاصمة مصر؟', options: ['القاهرة', 'الإسكندرية', 'أسوان'], correct: 0 },
    ],
  },
  {
    title: 'مسابقة دينية', blurb: 'أسئلة في السيرة والفقه والقرآن', category: 'Religious', mode: 'Online', format: 'Quiz',
    description: 'مسابقة دينية خفيفة في السيرة والقيم والقرآن الكريم.',
    rules: 'محاولة واحدة لكل طالب.',
    questions: [
      { text: 'كم عدد أركان الإسلام؟', options: ['3', '4', '5', '6'], correct: 2 },
    ],
  },
  {
    title: 'تحدّي التقنية', blurb: 'أسئلة برمجة وذكاء اصطناعي وأمن معلومات', category: 'Technology', mode: 'Online', format: 'Quiz',
    description: 'اختبر معلوماتك في البرمجة والذكاء الاصطناعي والتقنية.',
    rules: 'محاولة واحدة لكل طالب.',
    questions: [
      { text: 'ماذا يعني اختصار AI؟', options: ['Artificial Intelligence', 'Automatic Input', 'Advanced Internet'], correct: 0 },
    ],
  },
  // ----- على الموقع: إرسال عمل -----
  {
    title: 'أجمل صورة للحرم الجامعي', blurb: 'صوّر زاوية تحبها في كليتك', category: 'Arts', mode: 'Online', format: 'Submission',
    description: 'شارك بأجمل صورة التقطتها في حرم جامعتك أو كليتك. أفضل الصور تُنشر على صفحة الأسرة.',
    rules: 'صورة أصلية من تصويرك.\nلا تعديلات مبالغ فيها.\nيحق للأسرة نشر الأعمال الفائزة مع ذكر اسمك.',
    prize: 'هدية رمزية + نشر الصورة', question: 'ارفع صورتك واكتب سطراً عن مكانها.',
  },
  {
    title: 'تصميم بوستر للأسرة', blurb: 'تصميم يعبّر عن رسالة الأسرة', category: 'Arts', mode: 'Online', format: 'Submission',
    description: 'صمّم بوستراً يعبّر عن أسرة طلاب من أجل مصر وقيمها. أفضل تصميم يُستخدم في حملات الأسرة.',
    rules: 'تصميم أصلي.\nالأبعاد والصيغة: صورة أو PDF.\nالأسرة لها حق استخدام التصميم الفائز.',
    prize: 'شهادة + استخدام تصميمك في حملاتنا', question: 'ارفع التصميم واذكر البرنامج المستخدم.',
  },
  {
    title: 'أفضل خاطرة أو قصة قصيرة', blurb: 'كلمات تلمس القلب في صفحة واحدة', category: 'Literary', mode: 'Online', format: 'Submission',
    description: 'اكتب خاطرة أو قصة قصيرة عن الوطن أو الجامعة أو الحياة، في حدود صفحة واحدة.',
    rules: 'نص أصلي لم يُنشر من قبل.\nلا يتجاوز 500 كلمة.',
    prize: 'نشر العمل الفائز على صفحة الأسرة', question: 'اكتب العمل أو ارفعه كملف.',
  },
  {
    title: 'فيديو قصير عن مبادرة', blurb: 'فيديو دقيقة عن فكرة تخدم مجتمعنا', category: 'Technology', mode: 'Online', format: 'Submission',
    description: 'صوّر فيديو لا يتجاوز دقيقة عن فكرة أو مبادرة تخدم الجامعة أو المجتمع.',
    rules: 'فيديو أصلي من إنتاجك.\nالمدة حتى دقيقة.', question: 'ارفع الفيديو أو ضع رابطه.',
  },
  {
    title: 'الخط العربي', blurb: 'لوحة بخط يدك لعبارة عن مصر', category: 'Arts', mode: 'Online', format: 'Submission',
    description: 'اكتب عبارة عن مصر أو العلم بخطك العربي المفضل، وصوّرها وأرسلها.',
    rules: 'الكتابة بخط اليد.\nصورة واضحة للوحة.', question: 'ارفع صورة اللوحة.',
  },
  // ----- على أرض الواقع -----
  {
    title: 'دوري كرة القدم الخماسية بين الكليات', blurb: 'فرق من كل كلية وبطولة بنظام الدوري', category: 'Sports', mode: 'OnSite', format: 'Registration',
    description: 'دوري خماسي بين كليات الجامعة. سجّل اسمك لتنضم إلى فريق كليتك أو لتكون قائده.',
    rules: 'فريق من 5 لاعبين + 3 احتياطي.\nالتسجيل بالرقم القومي.\nالالتزام بالزي الموحد والروح الرياضية.',
    prize: 'كأس البطولة وميداليات', location: 'ملعب الجامعة',
  },
  {
    title: 'بطولة الشطرنج', blurb: 'بطولة فردية بنظام خروج المغلوب', category: 'Sports', mode: 'OnSite', format: 'Registration',
    description: 'بطولة شطرنج فردية مفتوحة لطلاب الجامعة بكل مستوياتهم.',
    rules: 'أحضر طقم الشطرنج إن أمكن.\nمدة الدور 15 دقيقة لكل لاعب.', prize: 'كأس وشهادات', location: 'قاعة الأنشطة',
  },
  {
    title: 'ماراثون الجري الخيري', blurb: 'ركض جماعي لدعم قضية', category: 'Sports', mode: 'OnSite', format: 'Registration',
    description: 'ماراثون جري لمسافة قصيرة بنية خيرية. المشاركة للجميع والمهم أن تكمل.',
    rules: 'ارتد ملابس رياضية.\nالمشاركة على مسؤوليتك الصحية.', prize: 'ميداليات للمكتملين', location: 'ساحة الجامعة',
  },
  {
    title: 'مسابقة حفظ وتلاوة القرآن', blurb: 'تلاوة وتجويد على مستويات', category: 'Religious', mode: 'OnSite', format: 'Registration',
    description: 'مسابقة في الحفظ والتلاوة على عدة مستويات، بتحكيم متخصصين.',
    rules: 'اختر المقدار الذي ستشارك به عند التسجيل.\nالتحكيم لأهل الاختصاص.', prize: 'جوائز قيّمة ومصاحف', location: 'مسجد الجامعة',
  },
  {
    title: 'مناظرة بين الكليات', blurb: 'فرق تتناظر في موضوع شبابي', category: 'Cultural', mode: 'OnSite', format: 'Registration',
    description: 'مناظرة بين فرق الكليات حول موضوع يخص الشباب. شارك متحدثاً أو حاضراً.',
    rules: 'فريق من 3 متحدثين.\nالتزام بآداب الحوار.\nالتحكيم للجنة.', prize: 'كأس المناظرات', location: 'المسرح الرئيسي',
  },
  {
    title: 'أمسية شعرية', blurb: 'قصائد وإلقاء من مواهب الجامعة', category: 'Literary', mode: 'OnSite', format: 'Registration',
    description: 'أمسية شعرية يلقي فيها الطلاب قصائدهم أو قصائد يحبونها. سجّل ما ستلقيه.',
    rules: 'المدة حتى 5 دقائق لكل مشارك.\nالالتزام بالذوق العام.', location: 'قاعة المحاضرات الكبرى',
  },
  {
    title: 'مسابقة المواهب', blurb: 'غناء وتمثيل وسحر وكل موهبة', category: 'Arts', mode: 'OnSite', format: 'Registration',
    description: 'مسرح مفتوح لكل موهبة: غناء، تمثيل، مونولوج، سحر وغيرها.',
    rules: 'الفقرة حتى 4 دقائق.\nالالتزام بالذوق العام.', prize: 'شهادات وهدايا', location: 'المسرح الرئيسي',
  },
  {
    title: 'هاكاثون برمجة', blurb: 'فرق تبني مشروعاً في يوم واحد', category: 'Technology', mode: 'OnSite', format: 'Registration',
    description: 'يوم كامل لبناء مشروع تقني بفرق من 3 إلى 5 طلاب، ثم عرضه على لجنة التحكيم.',
    rules: 'فرق من 3 إلى 5 طلاب.\nالفكرة أصلية.\nالتسليم والعرض قبل نهاية اليوم.', prize: 'جوائز لأفضل 3 مشاريع', location: 'معمل الحاسبات',
  },
  {
    title: 'معرض الابتكارات العلمية', blurb: 'مشاريع ونماذج من طلاب الكليات', category: 'Scientific', mode: 'OnSite', format: 'Registration',
    description: 'معرض لعرض المشاريع والنماذج العلمية، مع تحكيم أفضل ابتكار.',
    rules: 'يعرض الفريق مشروعه على طاولة خاصة.\nالتحكيم على الفكرة والتنفيذ.', prize: 'جوائز ودعم لأفضل ابتكار', location: 'بهو الكلية',
  },
];
