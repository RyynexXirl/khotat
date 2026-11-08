/**
 * First-semester calendar (1448/03/17 هـ → 1448/07/14 هـ), Sunday–Wednesday.
 * Framework-free: imported by the app, the server functions and the seed script.
 *
 * Each study day is either a regular lesson day (gets a row in plan_days) or a special day
 * (Quran exam, National Day, debt-repayment day) that has no new lesson.
 */

export const HALAQA_NAME = 'حلقة حمزة بن عبدالمطلب'
export const HALAQA_NAME_EN = 'Hamza ibn Abdulmuttalib Circle'

export type DayEvent = 'exam' | 'national_day' | 'debt_repayment'

export interface SemesterDay {
  /** Gregorian date, YYYY-MM-DD */
  date: string
  /** Hijri day/month as written in the plan, e.g. "3/17" */
  hijri: string
  event?: DayEvent
}

export interface SemesterWeek {
  /** Week number as numbered in the semester plan (starts at 2). */
  number: number
  vacation?: boolean
  days: SemesterDay[]
}

type RawWeek = [number, string, Array<[string, DayEvent?]>] | [number, 'vacation']

/** Sunday of each week (Gregorian) with the Hijri labels of its four days. */
const RAW: RawWeek[] = [
  [2, '2026-08-30', [['3/17'], ['3/18'], ['3/19'], ['3/20']]],
  [3, '2026-09-06', [['3/24'], ['3/25'], ['3/26'], ['3/27']]],
  [4, '2026-09-13', [['4/2', 'exam'], ['4/3'], ['4/4'], ['4/5']]],
  [5, '2026-09-20', [['4/9'], ['4/10'], ['4/11'], ['4/12', 'national_day']]],
  [6, '2026-09-27', [['4/16'], ['4/17'], ['4/18'], ['4/19']]],
  [7, '2026-10-04', [['4/23'], ['4/24'], ['4/25'], ['4/26', 'debt_repayment']]],
  [8, '2026-10-11', [['4/30'], ['5/1'], ['5/2'], ['5/3']]],
  [9, '2026-10-18', [['5/7'], ['5/8'], ['5/9'], ['5/10', 'debt_repayment']]],
  [10, '2026-10-25', [['5/14'], ['5/15'], ['5/16'], ['5/17']]],
  [11, '2026-11-01', [['5/21'], ['5/22'], ['5/23'], ['5/24', 'debt_repayment']]],
  [12, '2026-11-08', [['5/28'], ['5/29'], ['5/30'], ['6/1']]],
  [13, '2026-11-15', [['6/5'], ['6/6'], ['6/7'], ['6/8', 'debt_repayment']]],
  [14, 'vacation'],
  [15, '2026-12-06', [['6/26'], ['6/27'], ['6/28'], ['6/29', 'debt_repayment']]],
  [16, '2026-12-13', [['7/4'], ['7/5'], ['7/6'], ['7/7']]],
  [17, '2026-12-20', [['7/11'], ['7/12'], ['7/13'], ['7/14', 'debt_repayment']]],
]

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const SEMESTER: SemesterWeek[] = RAW.map((w) =>
  w[1] === 'vacation'
    ? { number: w[0], vacation: true, days: [] }
    : {
        number: w[0],
        days: (w[2] as Array<[string, DayEvent?]>).map(([hijri, event], i) => ({
          date: addDays(w[1], i),
          hijri,
          ...(event ? { event } : {}),
        })),
      },
)

export const SEMESTER_DAYS: SemesterDay[] = SEMESTER.flatMap((w) => w.days)
/** Regular lesson days (no special event) — one plan row per student for each. */
export const LESSON_DAYS: SemesterDay[] = SEMESTER_DAYS.filter((d) => !d.event)

const BY_DATE = new Map(SEMESTER_DAYS.map((d) => [d.date, d]))
const WEEK_BY_DATE = new Map(SEMESTER.flatMap((w) => w.days.map((d) => [d.date, w.number] as const)))

export function semesterDay(date: string): SemesterDay | undefined {
  return BY_DATE.get(date)
}

export function weekOf(date: string): number | undefined {
  return WEEK_BY_DATE.get(date)
}

/** Hijri d/m label for any date (uses the plan's labels, falls back to Umm al-Qura). */
export function hijriLabel(date: string): string {
  const known = BY_DATE.get(date)
  if (known) return known.hijri
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date(`${date}T00:00:00Z`))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('month')}/${get('day')}`
}
