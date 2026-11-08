import { describe, expect, it } from 'vitest'
import { currentLesson, debtCount, lastDoneLesson, openStatus, type PlanDayLike } from './plan'
import { LESSON_DAYS, SEMESTER, SEMESTER_DAYS, hijriLabel } from './semester'

const day = (n: number, status: string, text = `درس ${n}`): PlanDayLike => ({
  id: n,
  dayNumber: n,
  date: LESSON_DAYS[n - 1].date,
  newMemorization: text,
  review: '',
  status,
})

describe('semester calendar', () => {
  it('covers 1448/03/17 to 1448/07/14 with 52 lesson days', () => {
    expect(SEMESTER_DAYS[0]).toMatchObject({ date: '2026-08-30', hijri: '3/17' })
    expect(SEMESTER_DAYS.at(-1)).toMatchObject({ date: '2026-12-23', hijri: '7/14', event: 'debt_repayment' })
    expect(LESSON_DAYS).toHaveLength(52)
    expect(SEMESTER.find((w) => w.number === 14)?.vacation).toBe(true)
  })

  it('matches the Umm al-Qura calendar for every day', () => {
    for (const d of SEMESTER_DAYS) {
      const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
        timeZone: 'UTC',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(new Date(`${d.date}T00:00:00Z`))
      const label = `${p.find((x) => x.type === 'month')?.value}/${p.find((x) => x.type === 'day')?.value}`
      expect(label).toBe(d.hijri)
      expect(hijriLabel(d.date)).toBe(d.hijri)
    }
  })
})

describe('in-order progression', () => {
  it('the current lesson is the first one not done, even if an earlier one is a debt', () => {
    const days = [day(1, 'done'), day(2, 'debt'), day(3, 'debt'), day(4, 'pending')]
    expect(currentLesson(days)?.id).toBe(2)
    expect(lastDoneLesson(days)?.id).toBe(1)
    expect(debtCount(days)).toBe(2)
  })

  it('skips days with no assignment', () => {
    const days = [day(1, 'done'), day(2, 'pending', ''), day(3, 'pending')]
    expect(currentLesson(days)?.id).toBe(3)
    expect(lastDoneLesson(days)?.id).toBe(1)
  })

  it('missed counts as debt until memorized', () => {
    expect(debtCount([day(1, 'missed'), day(2, 'pending')])).toBe(1)
    expect(debtCount([day(1, 'done'), day(2, 'pending')])).toBe(0)
  })

  it('a lesson becomes a debt after its day, or at 4 PM Riyadh on its day', () => {
    // 2026-11-08 10:00 Riyadh = 07:00Z ; 16:30 Riyadh = 13:30Z
    expect(openStatus('2026-11-04', new Date('2026-11-08T07:00:00Z'))).toBe('debt')
    expect(openStatus('2026-11-08', new Date('2026-11-08T07:00:00Z'))).toBe('pending')
    expect(openStatus('2026-11-08', new Date('2026-11-08T13:30:00Z'))).toBe('debt')
    expect(openStatus('2026-11-09', new Date('2026-11-08T13:30:00Z'))).toBe('pending')
  })
})
