/**
 * Shared, framework-free plan helpers (app, server functions, scheduled function, seed script).
 *
 * Progression rules:
 * - A plan is an ordered list of lessons (one per regular semester lesson day).
 * - A student moves strictly in order: a lesson can only be marked "done" when every
 *   earlier lesson is done. The current lesson is the first one not yet done.
 * - Any lesson not done by its date is a debt. The student keeps reciting debts in order until
 *   caught up with today, then continues — and may go ahead of schedule.
 * - Grades are only "done" (تم الحفظ) or "missed" (لم يحفظ). There is no partial grade.
 */

export const TIME_ZONE = 'Asia/Riyadh'
export const DEBT_CUTOFF_HOUR = 16 // 4:00 PM (Asia/Riyadh)

/** pending = not recited yet · done = memorized · missed = recited but not memorized · debt = overdue */
export type DayStatus = 'pending' | 'done' | 'missed' | 'debt'
export const DAY_STATUSES: DayStatus[] = ['pending', 'done', 'missed', 'debt']
/** Statuses that count as a debt. */
export const DEBT_STATUSES: DayStatus[] = ['debt', 'missed']

export interface PlanDayLike {
  id: number
  dayNumber: number
  date: string
  newMemorization: string
  review: string
  status: string
}

/** A day without any assignment is skipped by the progression (not graded, never a debt). */
export function hasContent(d: Pick<PlanDayLike, 'newMemorization' | 'review'>): boolean {
  return d.newMemorization.trim() !== '' || d.review.trim() !== ''
}

/** Lessons in order, ignoring empty days. */
export function lessons<T extends PlanDayLike>(days: T[]): T[] {
  return days.filter(hasContent).sort((a, b) => a.dayNumber - b.dayNumber)
}

/** The lesson the student must recite next (first not done), or undefined when finished. */
export function currentLesson<T extends PlanDayLike>(days: T[]): T | undefined {
  return lessons(days).find((d) => d.status !== 'done')
}

/** The last done lesson (the only one that can be un-done, to keep the order intact). */
export function lastDoneLesson<T extends PlanDayLike>(days: T[]): T | undefined {
  const l = lessons(days)
  const cur = l.findIndex((d) => d.status !== 'done')
  const idx = cur === -1 ? l.length - 1 : cur - 1
  return idx >= 0 ? l[idx] : undefined
}

export function isDebt(d: Pick<PlanDayLike, 'status'>): boolean {
  return DEBT_STATUSES.includes(d.status as DayStatus)
}

export function debtCount(days: PlanDayLike[]): number {
  return lessons(days).filter(isDebt).length
}

/** Status a not-done lesson should have, given the current time. */
export function openStatus(date: string, now: Date = new Date()): DayStatus {
  const today = todayIso(now)
  if (date < today || (date === today && currentHour(now) >= DEBT_CUTOFF_HOUR)) return 'debt'
  return 'pending'
}

/** Today's date (YYYY-MM-DD) in the halaqa's time zone. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}

/** Current hour (0-23) in the halaqa's time zone. */
export function currentHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hourCycle: 'h23' }).format(now),
  )
}

export function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay()
}
