import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { HALAQA_NAME, type DayEvent } from './semester'
import { weekday, type DayStatus } from './plan'

/** The app is Arabic-only. */
export type Lang = 'ar'
export type Theme = 'light' | 'dark'

const THEME_KEY = 'halaqa-theme'

/** Runs before hydration so the saved theme applies without a flash. */
export const PREFS_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var h=document.documentElement;if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){h.classList.add('dark')}}catch(e){}})()`

/** Week numbers (2–17) as written in the official plan sheet. */
const WEEK_ORDINALS: Record<number, string> = {
  2: 'الثاني',
  3: 'الثالث',
  4: 'الرابع',
  5: 'الخامس',
  6: 'السادس',
  7: 'السابع',
  8: 'الثامن',
  9: 'التاسع',
  10: 'العاشر',
  11: 'الحادي عشر',
  12: 'الثاني عشر',
  13: 'الثالث عشر',
  14: 'الرابع عشر',
  15: 'الخامس عشر',
  16: 'السادس عشر',
  17: 'السابع عشر',
}

const ar = {
  appName: HALAQA_NAME,
  appTagline: 'متابعة خطط حفظ القرآن الكريم',
  roles: { sheikh: 'الشيخ', supervisor: 'مشرف', muhaffiz: 'محفظ', student: 'طالب' },
  roleDesc: {
    sheikh: 'الإدارة والإحصاءات',
    supervisor: 'تسميع طلاب مجموعته ومتابعة خططهم',
    muhaffiz: 'تسميع الطلاب المعيَّنين له',
    student: 'خطتي وديوني',
  },
  loginAs: 'تسجيل الدخول بصفتك',
  loginTitle: (r: string) => `دخول ${r}`,
  back: 'رجوع',
  chooseSupervisor: 'اختر المشرف',
  chooseMuhaffiz: 'اختر المحفظ',
  chooseFromList: 'اختر من القائمة',
  loading: 'جارٍ التحميل…',
  group: 'المجموعة',
  studentName: 'اسم الطالب',
  searchName: 'ابحث عن اسمك…',
  noResults: 'لا توجد نتائج',
  selected: (n: string) => `تم اختيار ${n}`,
  username: 'اسم المستخدم',
  password: 'كلمة المرور',
  yourPassword: 'كلمة المرور الخاصة بك',
  demoHintPassword: 'للتجربة: كلمة المرور 1234',
  login: 'دخول',
  loggingIn: 'جارٍ الدخول…',
  welcome: (n: string) => `أهلاً ${n}`,
  loginFailed: 'تعذر تسجيل الدخول',
  logout: 'خروج',
  changePassword: 'تغيير كلمة المرور',
  currentPassword: 'كلمة المرور الحالية',
  newPassword: 'كلمة المرور الجديدة',
  passwordChanged: 'تم تغيير كلمة المرور',
  changePasswordFailed: 'تعذر تغيير كلمة المرور',
  save: 'حفظ',
  themeDark: 'الوضع الليلي',
  themeLight: 'الوضع النهاري',
  loadError: 'تعذر تحميل البيانات، حاول مرة أخرى',

  // self-registration
  register: 'تسجيل طالب جديد',
  registerTitle: 'إنشاء حساب طالب',
  fullName: 'الاسم الثلاثي',
  nameHint: 'مثال: محمد بن عبدالله السبيعي',
  subgroup: 'المجموعة الفرعية',
  chooseSubgroup: 'اختر المجموعة الفرعية',
  phone: 'رقم الجوال',
  confirmPassword: 'تأكيد كلمة المرور',
  registerSubmit: 'تسجيل',
  registering: 'جارٍ التسجيل…',
  registerSuccess: 'تم إنشاء حسابك — سجّل الدخول الآن',
  registerFailed: 'تعذر إنشاء الحساب',
  haveAccount: 'لديك حساب؟ سجّل الدخول',
  noAccount: 'طالب جديد؟ سجّل الآن',

  // statuses & events
  status: { pending: 'لم يُسمِّع', done: 'تم الحفظ', missed: 'لم يحفظ', debt: 'دَين' } as Record<DayStatus, string>,
  event: { exam: 'اختبار قرآن', national_day: 'اليوم الوطني', debt_repayment: 'تسديد ديون' } as Record<DayEvent, string>,
  vacation: 'إجازة',
  week: (n: number) => `الأسبوع ${n}`,
  weekOrdinal: (n: number) => WEEK_ORDINALS[n] ?? `الأسبوع ${n}`,
  weekCol: 'الأسبوع',
  today: 'اليوم',
  ahead: 'مُقدَّم',
  weekdays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],

  // plan
  newMemorization: 'الحفظ',
  review: 'المراجعة',
  day: 'اليوم',
  date: 'التاريخ',
  statusCol: 'الحالة',
  noAssignment: '— لم تُحدَّد —',
  lessonsDone: 'دروس منجزة',
  of: (n: number) => `من ${n}`,
  debts: 'الديون',
  debtsHint: 'درس متأخر',
  remaining: 'المتبقي',
  remainingHint: 'حتى نهاية الفصل',
  semesterPlan: 'خطة الفصل الدراسي الأول',
  semesterRange: '1448/03/17 هـ — 1448/07/14 هـ',
  markDone: 'تم الحفظ',
  markMissed: 'لم يحفظ',
  undo: 'تراجع',
  current: 'الدرس الحالي',
  orderRule: 'التسميع بالترتيب: لا يُسجَّل «تم الحفظ» لدرس قبل إنهاء الذي قبله.',
  emptyPlan: 'لم تُكتب الخطة بعد. يكتبها المحفظ أو الشيخ.',
  finished: 'أنهى الطالب جميع دروس الخطة — ما شاء الله',
  savedDone: 'تم تسجيل الحفظ',
  savedMissed: 'تم تسجيل «لم يحفظ»',
  undone: 'تم التراجع',
  saveFailed: 'تعذر الحفظ',
  errors: {
    out_of_order: 'لا يمكن تسجيل «تم الحفظ» قبل إنهاء الدرس الذي قبله',
    not_due: 'لم يحن موعد هذا الدرس بعد',
    not_last: 'يمكن التراجع عن آخر درس محفوظ فقط',
    empty: 'لا يوجد مقرر لهذا اليوم',
    not_found: 'غير موجود',
    wrong_password: 'كلمة المرور غير صحيحة',
    wrong_credentials: 'الاسم أو كلمة المرور غير صحيحة',
    choose_supervisor: 'اختر المشرف',
    choose_muhaffiz: 'اختر المحفظ',
    choose_student: 'اختر اسم الطالب',
    password_mismatch: 'كلمتا المرور غير متطابقتين',
    weak_password: 'كلمة المرور قصيرة جداً',
  } as Record<string, string>,

  // plan editor
  editPlan: 'تعديل الخطة',
  doneEditing: 'إنهاء التعديل',
  savePlan: 'حفظ الخطة',
  saving: 'جارٍ الحفظ…',
  planSaved: 'تم حفظ الخطة',
  copyFrom: 'نسخ الخطة من طالب',
  copyFromHint: 'تُنسخ نصوص الحفظ والمراجعة فقط، وتبقى حالات التسميع كما هي.',
  copy: 'نسخ',
  copied: 'تم نسخ الخطة',
  chooseStudent: 'اختر الطالب',
  unsaved: 'تعديلات غير محفوظة',
  backToDashboard: 'رجوع للوحة',
  studentNotFound: 'الطالب غير موجود',
  groupLine: (g: string, s: string) => `مجموعة ${g} · المحفظ ${s}`,

  // sheikh
  sheikhTitle: 'لوحة الشيخ',
  sheikhSubtitle: 'متابعة جميع المجموعات والطلاب والديون',
  addStudent: 'اضف طالب',
  runDebts: 'احتساب الديون الآن',
  debtsMarked: (n: number) => (n ? `تم تحويل ${n} درس متأخر إلى دَين` : 'لا توجد دروس متأخرة جديدة'),
  runFailed: 'تعذر تشغيل الاحتساب',
  totalStudents: 'إجمالي الطلاب',
  inGroups: (n: number) => `في ${n} مجموعات`,
  studentsWithDebts: 'طلاب عليهم ديون',
  debtDaysShowList: (n: number) => `${n} درس متأخر · عرض القائمة`,
  supervisorOf: (n: string) => `المحفظ: ${n}`,
  studentsCount: (n: number) => `${n} طلاب`,
  progressPct: (n: number) => `الإنجاز ${n}%`,
  students: 'الطلاب',
  searchByName: 'بحث بالاسم…',
  student: 'الطالب',
  progress: 'الإنجاز',
  plan: 'الخطة',
  delete: 'حذف',
  noMatches: 'لا يوجد طلاب مطابقون',
  debtorsTitle: 'الطلاب الذين عليهم ديون',
  debtorsDesc: 'عدد الدروس المتأخرة لكل طالب',
  noDebts: 'لا ديون',
  noDebtsAll: 'لا توجد ديون — ما شاء الله',
  nDebts: (n: number) => `${n} دَين`,
  deleteStudent: 'حذف الطالب',
  deleteConfirm: (n: string) => `سيتم حذف «${n}» وخطته بالكامل. لا يمكن التراجع عن هذا الإجراء.`,
  cancel: 'إلغاء',
  deleted: 'تم حذف الطالب',
  deleteFailed: 'تعذر الحذف',
  newStudent: 'إضافة طالب جديد',
  newStudentDesc: 'تُنشأ له خطة فارغة لأيام الفصل الدراسي، ثم يكتبها المحفظ أو الشيخ يدوياً.',
  chooseGroup: 'اختر المجموعة',
  add: 'إضافة',
  adding: 'جارٍ الإضافة…',
  added: 'تمت إضافة الطالب — اكتب خطته الآن',
  addFailed: 'تعذر إضافة الطالب',

  // sheikh: edit mode & accounts
  editMode: 'وضع التعديل',
  edit: 'تعديل',
  editStudent: 'تعديل الطالب',
  rename: 'إعادة تسمية',
  changeGroup: 'تغيير المجموعة',
  assignMuhaffiz: 'المحفظ المعيَّن',
  noMuhaffiz: 'بدون محفظ',
  saved: 'تم الحفظ',
  supervisorsSection: 'المشرفون',
  muhaffizeenSection: 'المحفظون',
  addSupervisor: 'إضافة مشرف',
  addMuhaffiz: 'إضافة محفظ',
  accountName: 'الاسم',
  accountAdded: 'تمت إضافة الحساب',
  addAccountFailed: 'تعذر إضافة الحساب',
  deleteAccount: 'حذف الحساب',
  deleteAccountConfirm: (n: string) => `سيتم حذف حساب «${n}». لا يمكن التراجع عن هذا الإجراء.`,
  accountDeleted: 'تم حذف الحساب',
  assignedStudents: (n: number) => `${n} طلاب معيَّنون`,
  noAccounts: 'لا توجد حسابات بعد',

  // muhaffiz
  muhaffizTitle: 'طلابي المعيَّنون',
  muhaffizSubtitle: (n: string) => `${n} · التسميع`,
  noAssignedStudents: 'لم يعيّن لك الشيخ أي طالب بعد',

  // pdf export
  exportPdf: 'تصدير PDF',
  printFrom: 'من',
  printTo: 'إلى',
  printSurah: 'اسم السورة',
  printGrade: 'التقدير',
  printNewMem: 'الجديد',
  printReview: 'المراجعة',
  printSemesterLine: 'خطة الفصل الدراسي الأول من 1448/03/17 هـ إلى 1448/07/14 هـ',
  memStart: 'بداية الحفظ',

  // supervisor
  supervisorTitle: (g: string) => `مجموعة ${g}`,
  supervisorSubtitle: (n: string) => `${n} · التسميع`,
  todayIs: (w: string, h: string) => `اليوم: ${w} ${h}`,
  noStudyToday: 'لا يوجد دوام دراسي اليوم',
  recitedCount: (a: number, b: number) => `أنهى خطة اليوم ${a} من ${b} طلاب`,
  allDone: 'تم الحفظ للجميع',
  allDoneConfirm: 'تسجيل «تم الحفظ» للدرس الحالي لكل طالب؟',
  allDoneResult: (n: number) => `تم تسجيل الحفظ لـ ${n} طلاب`,
  caughtUp: 'أنهى خطة اليوم',
  behind: (n: number) => `متأخر ${n} درس`,
  noLessons: 'لا توجد دروس في الخطة',
  noStudents: 'لا يوجد طلاب في هذه المجموعة',
  openPlan: 'الخطة',

  // student
  hello: (n: string) => `أهلاً، ${n}`,
  myPlan: 'خطتي في الحفظ',
  nextLesson: 'المطلوب تسميعه الآن',
  youHaveDebts: (n: number) => `عليك ${n} دَين — سمّعها بالترتيب حتى تصل إلى خطة اليوم`,
  accountNotFound: 'لم يتم العثور على حسابك',
}

export type Messages = typeof ar


interface PrefsValue {
  lang: Lang
  theme: Theme
  t: Messages
  toggleTheme: () => void
}

const PrefsContext = createContext<PrefsValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  // Read what the boot script already applied to <html>.
  useEffect(() => {
    const h = document.documentElement
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with the pre-hydration boot script
    setTheme(h.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo<PrefsValue>(
    () => ({
      lang: 'ar',
      theme,
      t: ar,
      toggleTheme,
    }),
    [theme, toggleTheme],
  )
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider')
  return ctx
}

export function useT(): Messages {
  return usePrefs().t
}

export function weekdayName(t: Messages, iso: string): string {
  return t.weekdays[weekday(iso)]
}

/** Short Gregorian date, e.g. "30 أغسطس" (latin digits). */
export function formatGregorian(_lang: Lang, iso: string): string {
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}
