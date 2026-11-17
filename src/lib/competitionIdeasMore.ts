import type { CompetitionIdea } from './competitionIdeas';

/** More ready-made ideas, same shape as the first batch. */
export const MORE_COMPETITION_IDEAS: CompetitionIdea[] = [
  // ===== على الموقع: فزورة =====
  {
    title: 'خمّن الكلمة من الإيموجي', blurb: 'رموز تعبّر عن اسم فيلم أو مكان أو مثل', category: 'Cultural', mode: 'Online', format: 'Riddle',
    description: 'ستجد رموزاً تعبّر عن كلمة أو مثل شعبي أو اسم مكان مصري. خمّنها وأرسل إجابتك.',
    rules: 'إجابة واحدة لكل طالب.\nتُقبل الإجابة بأي صيغة صحيحة.', prize: 'هدية رمزية', acceptedAnswers: [],
  },
  {
    title: 'فزورة رياضيات', blurb: 'مسألة ذكاء تحتاج تفكيراً لا حفظاً', category: 'Scientific', mode: 'Online', format: 'Riddle',
    description: 'مسألة رياضية أو منطقية تعتمد على التفكير. الإجابة الصحيحة الأولى تفوز.',
    rules: 'الإجابة رقم أو كلمة واحدة.\nإجابة واحدة لكل طالب.', acceptedAnswers: [],
  },
  {
    title: 'مثل شعبي ناقص', blurb: 'أكمل المثل المصري المعروف', category: 'Cultural', mode: 'Online', format: 'Riddle',
    description: 'نعرض عليك مثلاً شعبياً ناقصاً، أكمله بما تعرفه من تراثنا.',
    rules: 'إجابة واحدة لكل طالب.', acceptedAnswers: [],
  },
  {
    title: 'اكتشف المعلم', blurb: 'صورة قريبة لمعلم مصري والمطلوب اسمه', category: 'Cultural', mode: 'Online', format: 'Riddle',
    description: 'ننشر جزءاً من صورة لمعلم أثري أو سياحي في مصر، فتعرّف عليه واكتب اسمه.',
    rules: 'إجابة واحدة لكل طالب.', acceptedAnswers: [],
  },
  {
    title: 'لغز البرمجة', blurb: 'ما ناتج هذا الكود؟', category: 'Technology', mode: 'Online', format: 'Riddle',
    description: 'مقطع كود قصير وسؤال عن ناتجه أو الخطأ فيه. للمبرمجين وغيرهم من الفضوليين.',
    rules: 'إجابة واحدة لكل طالب.\nلا تستخدم أدوات لتشغيل الكود.', acceptedAnswers: [],
  },
  {
    title: 'لغز اللغة العربية', blurb: 'نحو وصرف وبلاغة في سؤال واحد', category: 'Literary', mode: 'Online', format: 'Riddle',
    description: 'سؤال في اللغة العربية: إعراب أو مرادف أو بلاغة. لمحبي لغتنا الجميلة.',
    rules: 'إجابة واحدة لكل طالب.', acceptedAnswers: [],
  },
  // ===== على الموقع: اختبار =====
  {
    title: 'اختبار تاريخ مصر', blurb: 'من الفراعنة إلى العصر الحديث', category: 'Cultural', mode: 'Online', format: 'Quiz',
    description: 'أسئلة عن تاريخ مصر عبر العصور. الأعلى درجة يفوز.',
    rules: 'محاولة واحدة لكل طالب.', prize: 'شهادة تقدير',
    questions: [{ text: 'ما اسم أكبر الأهرامات في الجيزة؟', options: ['هرم خوفو', 'هرم منقرع', 'هرم زوسر'], correct: 0 }],
  },
  {
    title: 'اختبار الجغرافيا', blurb: 'مدن وأنهار وحدود', category: 'Scientific', mode: 'Online', format: 'Quiz',
    description: 'اختبار جغرافي عن مصر والعالم.',
    rules: 'محاولة واحدة لكل طالب.',
    questions: [{ text: 'أطول نهر في مصر هو...', options: ['النيل', 'الفرات', 'دجلة'], correct: 0 }],
  },
  {
    title: 'اختبار اللغة الإنجليزية', blurb: 'مفردات وقواعد وفهم', category: 'Literary', mode: 'Online', format: 'Quiz',
    description: 'اختبر مستواك في الإنجليزية: مفردات وقواعد وجمل شائعة.',
    rules: 'محاولة واحدة لكل طالب.',
    questions: [{ text: 'Choose the correct form: She ___ to school every day.', options: ['goes', 'go', 'going'], correct: 0 }],
  },
  {
    title: 'اختبار الصحة والسلامة', blurb: 'إسعافات أولية وعادات صحية', category: 'Scientific', mode: 'Online', format: 'Quiz',
    description: 'أسئلة عن الإسعافات الأولية والعادات الصحية، ونشر الوعي بين الطلاب.',
    rules: 'محاولة واحدة لكل طالب.', prize: 'شهادة وعي صحي',
    questions: [{ text: 'ما أول خطوة عند الحروق البسيطة؟', options: ['تبريد المكان بماء جارٍ', 'وضع معجون أسنان', 'فرك المكان'], correct: 0 }],
  },
  {
    title: 'أسئلة في السيرة النبوية', blurb: 'محطات من حياة النبي ﷺ', category: 'Religious', mode: 'Online', format: 'Quiz',
    description: 'أسئلة في السيرة النبوية العطرة ودروسها.',
    rules: 'محاولة واحدة لكل طالب.',
    questions: [{ text: 'في أي مدينة وُلد النبي ﷺ؟', options: ['مكة المكرمة', 'المدينة المنورة', 'الطائف'], correct: 0 }],
  },
  {
    title: 'اختبار الأمن السيبراني', blurb: 'كيف تحمي حساباتك وبياناتك', category: 'Technology', mode: 'Online', format: 'Quiz',
    description: 'أسئلة عن كلمات المرور والتصيّد والخصوصية على الإنترنت.',
    rules: 'محاولة واحدة لكل طالب.',
    questions: [{ text: 'أي كلمة مرور أقوى؟', options: ['Xk#9vQ!2pL', '12345678', 'password'], correct: 0 }],
  },
  {
    title: 'اختبار الأفلام والفنون', blurb: 'ثقافة فنية خفيفة', category: 'Arts', mode: 'Online', format: 'Quiz',
    description: 'مسابقة خفيفة عن الأفلام والمسلسلات والفنون في مصر.',
    rules: 'محاولة واحدة لكل طالب.',
    questions: [{ text: 'في أي دولة يُقام مهرجان القاهرة السينمائي الدولي؟', options: ['مصر', 'المغرب', 'الأردن'], correct: 0 }],
  },
  {
    title: 'اختبار كرة القدم', blurb: 'لمحبي الكرة وأخبارها', category: 'Sports', mode: 'Online', format: 'Quiz',
    description: 'أسئلة عن كرة القدم المصرية والعالمية.',
    rules: 'محاولة واحدة لكل طالب.',
    questions: [{ text: 'كم عدد اللاعبين في كل فريق داخل الملعب؟', options: ['11', '10', '9'], correct: 0 }],
  },
  // ===== على الموقع: إرسال عمل =====
  {
    title: 'شعار للأسرة أو لحملة', blurb: 'ابتكر هوية بصرية جديدة', category: 'Arts', mode: 'Online', format: 'Submission',
    description: 'صمّم شعاراً لحملة أو فعالية قادمة للأسرة. الأفضل يُعتمد رسمياً.',
    rules: 'شعار أصلي.\nصيغة PNG أو PDF.', prize: 'اعتماد شعارك + شهادة', question: 'ارفع الشعار واكتب فكرته في سطرين.',
  },
  {
    title: 'ريلز عن حياتك الجامعية', blurb: 'فيديو قصير مبدع وخفيف', category: 'Technology', mode: 'Online', format: 'Submission',
    description: 'صوّر فيديو عمودي قصير يعبّر عن يوم في حياتك الجامعية.',
    rules: 'المدة حتى 60 ثانية.\nمحتوى مناسب للذوق العام.', prize: 'نشر الفيديو الفائز على صفحة الأسرة', question: 'ارفع الفيديو أو ضع رابطه.',
  },
  {
    title: 'أفضل لقطة طبيعة في دمياط', blurb: 'نيل وبحر ومزارع وغروب', category: 'Arts', mode: 'Online', format: 'Submission',
    description: 'صوّر منظراً طبيعياً من دمياط ومحيطها، ولتكن لقطة تحبها.',
    rules: 'صورة من تصويرك.\nاذكر المكان.', prize: 'هدية + نشر الصورة', question: 'ارفع صورتك واكتب اسم المكان.',
  },
  {
    title: 'أفضل مقال عن قضية شبابية', blurb: 'رأيك في موضوع يهمك', category: 'Literary', mode: 'Online', format: 'Submission',
    description: 'اكتب مقالاً قصيراً عن قضية تهم الشباب: التعليم، العمل، التطوع، التكنولوجيا.',
    rules: 'من 300 إلى 700 كلمة.\nنص أصلي.', prize: 'نشر المقال على صفحة الأسرة', question: 'اكتب المقال أو ارفعه كملف.',
  },
  {
    title: 'قصيدة من تأليفك', blurb: 'فصحى أو عامية', category: 'Literary', mode: 'Online', format: 'Submission',
    description: 'شارك بقصيدة من تأليفك عن مصر أو الجامعة أو أي موضوع تحبه.',
    rules: 'نص أصلي.\nأبيات لا تقل عن 6.', prize: 'نشر القصائد المتميزة', question: 'اكتب القصيدة أو ارفعها كملف.',
  },
  {
    title: 'تسجيل صوتي: إلقاء أو أداء', blurb: 'قراءة، إنشاد أو غناء', category: 'Arts', mode: 'Online', format: 'Submission',
    description: 'سجّل مقطعاً صوتياً قصيراً بإلقاء أو إنشاد أو غناء. اختر ما يليق بك.',
    rules: 'المدة حتى دقيقتين.\nمحتوى مناسب للذوق العام.', question: 'ارفع التسجيل الصوتي أو ضع رابطه.',
  },
  {
    title: 'فكرة مشروع مبتكر', blurb: 'اعرض فكرتك في صفحة واحدة', category: 'Scientific', mode: 'Online', format: 'Submission',
    description: 'قدّم فكرة لمشروع يخدم المجتمع في صفحة واحدة: المشكلة، الحل، والفئة المستفيدة.',
    rules: 'ملف PDF حتى صفحتين.\nالفكرة أصلية.', prize: 'تبنّي أفضل فكرة وتوجيه من أساتذة', question: 'ارفع ملف الفكرة.',
  },
  {
    title: 'تحدّي اللياقة: تمرين في 60 ثانية', blurb: 'سجّل أفضل أداء لتمرين واحد', category: 'Sports', mode: 'Online', format: 'Submission',
    description: 'صوّر نفسك وأنت تؤدي تمريناً لمدة 60 ثانية. نختار الأفضل والأكثر التزاماً.',
    rules: 'الفيديو بدون مونتاج.\nمارس بأمان وبما يناسب صحتك.', question: 'ارفع الفيديو أو ضع رابطه.',
  },
  {
    title: 'وثّق عملاً تطوعياً', blurb: 'صور وقصة عن عمل خيري قمت به', category: 'Other', mode: 'Online', format: 'Submission',
    description: 'شارك بعمل تطوعي قمت به أو شاركت فيه ووثّقه بالصور والكلمات لإلهام الآخرين.',
    rules: 'عمل حقيقي.\nلا تنشر صور أشخاص بدون إذنهم.', prize: 'تكريم المتطوعين', question: 'ارفع الصور واكتب قصة المبادرة.',
  },
  // ===== على أرض الواقع =====
  {
    title: 'بطولة تنس الطاولة', blurb: 'فردي ومزدوج على طاولات الجامعة', category: 'Sports', mode: 'OnSite', format: 'Registration',
    description: 'بطولة تنس طاولة لطلاب الجامعة بنظام خروج المغلوب.',
    rules: 'يحضر اللاعب مضربه إن أمكن.\nالمباراة من 3 أشواط.', prize: 'كأس وميداليات', location: 'صالة الألعاب',
  },
  {
    title: 'دوري كرة السلة أو الطائرة', blurb: 'فرق الكليات في دوري ممتع', category: 'Sports', mode: 'OnSite', format: 'Registration',
    description: 'دوري بين فرق الكليات. سجّل اسمك لفريق كليتك.',
    rules: 'عدد اللاعبين حسب اللعبة.\nالروح الرياضية قبل الفوز.', prize: 'كأس البطولة', location: 'ملعب الجامعة',
  },
  {
    title: 'يوم رياضي مفتوح', blurb: 'ألعاب جماعية ومسابقات خفيفة', category: 'Sports', mode: 'OnSite', format: 'Registration',
    description: 'يوم رياضي للجميع: شد الحبل، سباقات تتابع، ألعاب جماعية. المهم المشاركة.',
    rules: 'ملابس رياضية.\nيُقسَّم المشاركون إلى فرق عشوائية.', prize: 'ميداليات تذكارية', location: 'ساحة الجامعة',
  },
  {
    title: 'مسابقة خطابة', blurb: 'كلمة مؤثرة في خمس دقائق', category: 'Cultural', mode: 'OnSite', format: 'Registration',
    description: 'مسابقة خطابة في موضوع حر أو محدد. اختر موضوعك وسجّل.',
    rules: 'المدة من 3 إلى 5 دقائق.\nالتحكيم على الأسلوب والمضمون.', prize: 'شهادات وجوائز', location: 'المسرح الرئيسي',
  },
  {
    title: 'مسابقة ثقافية حضورية بين الكليات', blurb: 'فرق ومراحل وأسئلة سريعة', category: 'Cultural', mode: 'OnSite', format: 'Registration',
    description: 'مسابقة ثقافية مباشرة على المسرح بين فرق الكليات، بأسئلة سريعة ومراحل تصفية.',
    rules: 'فريق من 3 طلاب.\nأسئلة متنوعة.\nالتحكيم للجنة.', prize: 'كأس المسابقة', location: 'قاعة المحاضرات الكبرى',
  },
  {
    title: 'مسابقة الأذان والإنشاد الديني', blurb: 'أصوات جميلة في مناسبة دينية', category: 'Religious', mode: 'OnSite', format: 'Registration',
    description: 'مسابقة في الأذان والإنشاد الديني بمناسبة دينية قريبة.',
    rules: 'اختر المجال عند التسجيل.\nمدة الفقرة حتى 4 دقائق.', prize: 'جوائز وشهادات', location: 'مسجد الجامعة',
  },
  {
    title: 'تدريب وتحدٍّ للإسعافات الأولية', blurb: 'تدريب عملي ثم تحدٍّ بين الفرق', category: 'Scientific', mode: 'OnSite', format: 'Registration',
    description: 'تدريب عملي على الإسعافات الأولية يتبعه تحدٍّ بين الفرق. تعلّم قد ينقذ حياة.',
    rules: 'فريق من 4 طلاب.\nالحضور الكامل للتدريب شرط.', prize: 'شهادات إتمام وجوائز للفريق الفائز', location: 'قاعة التدريب',
  },
  {
    title: 'ورشة وتحدٍّ في التصوير', blurb: 'تعلّم ثم صوّر وتنافس', category: 'Arts', mode: 'OnSite', format: 'Registration',
    description: 'ورشة قصيرة في أساسيات التصوير يليها تحدٍّ ميداني داخل الحرم الجامعي.',
    rules: 'يمكن التصوير بالموبايل.\nيُسلَّم العمل في نهاية اليوم.', prize: 'جوائز وعرض الأعمال', location: 'الحرم الجامعي',
  },
  {
    title: 'مسابقة الروبوت والإلكترونيات', blurb: 'فرق تبني وتختبر', category: 'Technology', mode: 'OnSite', format: 'Registration',
    description: 'فرق تصمّم وتشغّل روبوتاً أو دائرة إلكترونية لمهمة محددة أمام لجنة التحكيم.',
    rules: 'فرق من 3 إلى 5 طلاب.\nتُعلن المهمة قبل الموعد بأسبوع.', prize: 'جوائز لأفضل 3 فرق', location: 'معمل الهندسة',
  },
  {
    title: 'ملتقى ريادة الأعمال: اعرض فكرتك', blurb: 'عرض لمدة 3 دقائق أمام لجنة', category: 'Other', mode: 'OnSite', format: 'Registration',
    description: 'اعرض فكرة مشروعك الناشئ في 3 دقائق أمام لجنة من أصحاب الخبرة. أفضل فكرة تحصل على دعم.',
    rules: 'فريق من 1 إلى 4.\nعرض 3 دقائق + دقيقتان للأسئلة.', prize: 'دعم وتوجيه لأفضل فكرة', location: 'قاعة الأنشطة',
  },
  {
    title: 'سوق خيري ومعرض منتجات الطلاب', blurb: 'اعرض منتجاتك اليدوية وادعم قضية', category: 'Other', mode: 'OnSite', format: 'Registration',
    description: 'معرض يعرض فيه الطلاب منتجاتهم اليدوية أو الفنية، ويعود ريعه لقضية خيرية.',
    rules: 'منتجات من صنعك.\nنسبة من البيع للقضية الخيرية.', location: 'ساحة الجامعة',
  },
  {
    title: 'ليلة ألعاب الطاولة', blurb: 'شطرنج، دومينو، طاولة ومزيد', category: 'Other', mode: 'OnSite', format: 'Registration',
    description: 'أمسية ألعاب طاولة هادئة بين الطلاب مع مسابقات صغيرة.',
    rules: 'أحضر لعبتك إن أمكن.', prize: 'هدايا صغيرة', location: 'قاعة الأنشطة',
  },
];
