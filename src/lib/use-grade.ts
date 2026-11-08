import { useState } from 'react'
import { toast } from 'sonner'
import { useT } from './i18n'
import { gradeLesson } from '@/server/api.functions'

/** Records تم الحفظ / لم يحفظ / تراجع for one lesson and hands back the refreshed plan. */
type Days = Awaited<ReturnType<typeof gradeLesson>>['days']

export function useGrade(onDays: (days: Days) => void) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  async function grade(dayId: number, action: 'done' | 'missed' | 'undo') {
    setBusy(true)
    try {
      const res = await gradeLesson({ data: { dayId, action } })
      if (res.days.length) onDays(res.days)
      if (!res.ok) toast.error(t.errors[res.error ?? ''] ?? t.saveFailed)
      else {
        // Toggling an active grade off returns the day to "pending".
        const off = (action === 'done' || action === 'missed') && res.status === 'pending'
        toast.success(off || action === 'undo' ? t.undone : action === 'done' ? t.savedDone : t.savedMissed)
      }
      return res.ok
    } catch {
      toast.error(t.saveFailed)
      return false
    } finally {
      setBusy(false)
    }
  }
  return { grade, busy }
}
