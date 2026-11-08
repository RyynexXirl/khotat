import { Check, CircleDashed, HandCoins, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { DAY_STATUSES, type DayStatus } from '@/lib/plan'

export const STATUS_STYLE: Record<DayStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-border',
  done: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
  missed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
  debt: 'bg-red-600 text-white border-red-600 dark:bg-red-700 dark:border-red-700',
}

export const STATUS_ICON: Record<DayStatus, typeof Check> = {
  pending: CircleDashed,
  done: Check,
  missed: X,
  debt: HandCoins,
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useT()
  const s = (DAY_STATUSES.includes(status as DayStatus) ? status : 'pending') as DayStatus
  const Icon = STATUS_ICON[s]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        STATUS_STYLE[s],
        className,
      )}
    >
      <Icon className="size-3.5" />
      {t.status[s]}
    </span>
  )
}

/** The two grading buttons: تم الحفظ / لم يحفظ. Buttons are toggleable: an active grade shows pressed and clicking it again returns the day to «لم يُسمِّع». */
export function GradeButtons({
  onDone,
  onMissed,
  missedDisabled,
  disabled,
  doneActive = false,
  missedActive = false,
  size = 'md',
}: {
  onDone: () => void
  onMissed: () => void
  missedDisabled?: boolean
  disabled?: boolean
  doneActive?: boolean
  missedActive?: boolean
  size?: 'sm' | 'md'
}) {
  const t = useT()
  const base = cn(
    'flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-40',
    size === 'md' ? 'min-h-11 text-sm' : 'min-h-8 px-2.5 text-xs',
  )
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onDone}
        aria-pressed={doneActive}
        className={cn(
          base,
          doneActive
            ? 'border-emerald-800 bg-emerald-800 text-white ring-2 ring-emerald-800/30 dark:border-emerald-400 dark:bg-emerald-700 dark:ring-emerald-400/40'
            : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600',
        )}
      >
        <Check className="size-4" />
        {t.markDone}
      </button>
      <button
        type="button"
        disabled={disabled || missedDisabled}
        onClick={onMissed}
        aria-pressed={missedActive}
        className={cn(
          base,
          missedActive
            ? 'border-rose-600 bg-rose-600 text-white ring-2 ring-rose-600/30 dark:border-rose-500 dark:bg-rose-600 dark:ring-rose-400/40'
            : 'bg-card text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/50',
        )}
      >
        <X className="size-4" />
        {t.markMissed}
      </button>
    </div>
  )
}
