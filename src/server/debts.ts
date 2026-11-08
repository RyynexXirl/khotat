import { and, eq, lt, lte, or, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { planDays } from '../../db/schema.js'
import { currentHour, DEBT_CUTOFF_HOUR, todayIso } from '../lib/plan.js'

export { DEBT_CUTOFF_HOUR }

/**
 * Marks every lesson that was not recited by its day ("pending") as a "debt".
 * Days before today always qualify; today's lessons qualify once it is 4 PM or later.
 * Days without any assignment are skipped.
 */
export async function markUngradedDaysAsDebt(now: Date = new Date()) {
  const today = todayIso(now)
  const includeToday = currentHour(now) >= DEBT_CUTOFF_HOUR
  const rows = await db
    .update(planDays)
    .set({ status: 'debt', updatedAt: new Date() })
    .where(
      and(
        eq(planDays.status, 'pending'),
        or(sql`trim(${planDays.newMemorization}) <> ''`, sql`trim(${planDays.review}) <> ''`),
        includeToday ? lte(planDays.date, today) : lt(planDays.date, today),
      ),
    )
    .returning({ id: planDays.id })
  return { marked: rows.length, today, includeToday }
}
