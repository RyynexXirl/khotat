import handler from '@tanstack/react-start/server-entry'
import { markUngradedDaysAsDebt } from './server/debts.js'

export default {
  fetch: handler.fetch,

  /** Cloudflare Cron Trigger (see wrangler.jsonc): daily at 4:00 PM Riyadh time. */
  async scheduled(_controller: unknown, _env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(
      markUngradedDaysAsDebt().then((r) =>
        console.log(`[auto-debt] marked ${r.marked} day(s) as debt for ${r.today}`),
      ),
    )
  },
}
