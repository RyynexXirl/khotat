import type { Config } from '@netlify/functions'
import { markUngradedDaysAsDebt } from '../../src/server/debts.js'

/**
 * Runs daily at 4:00 PM Riyadh time (13:00 UTC) and converts
 * every ungraded day up to and including today into a "debt".
 */
export default async (req: Request) => {
  const { next_run } = await req.json().catch(() => ({ next_run: null }))
  const result = await markUngradedDaysAsDebt()
  console.log(`[auto-debt] marked ${result.marked} day(s) as debt for ${result.today}. Next run: ${next_run}`)
}

export const config: Config = {
  schedule: '0 13 * * *',
}
