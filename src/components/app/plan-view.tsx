import { BookOpen, Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatGregorian, usePrefs, weekdayName } from '@/lib/i18n'
import { currentLesson, debtCount, lastDoneLesson, lessons, type PlanDayLike } from '@/lib/plan'
import { hijriLabel, SEMESTER, type SemesterDay } from '@/lib/semester'
import { GradeButtons, StatusBadge } from './status'

export type PlanDay = PlanDayLike

export function PlanSummary({ days }: { days: PlanDay[] }) {
  const { t } = usePrefs()
  const l = lessons(days)
  const done = l.filter((d) => d.status === 'done').length
  const debts = debtCount(days)
  const pct = l.length ? Math.round((done / l.length) * 100) : 0
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label={t.lessonsDone} value={`${done}`} hint={t.of(l.length)} />
      <Stat label={t.debts} value={`${debts}`} hint={t.debtsHint} danger={debts > 0} />
      <Stat label={t.remaining} value={`${l.length - done}`} hint={t.remainingHint} />
      <div className="col-span-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Stat({ label, value, hint, danger }: { label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-3 shadow-sm sm:p-4',
        danger && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-bold sm:text-3xl', danger ? 'text-red-700 dark:text-red-300' : 'text-deep')}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  )
}

export function DayLabel({ date, today, className }: { date: string; today: string; className?: string }) {
  const { t, lang } = usePrefs()
  const hijri = hijriLabel(date)
  return (
    <div className={cn('text-sm', className)}>
      <div className="flex items-center gap-1.5 font-semibold">
        {weekdayName(t, date)} <span dir="ltr">({hijri})</span>
        {date === today && <span className="rounded bg-gold px-1.5 text-[10px] font-bold text-deep dark:text-[oklch(0.2_0.03_172)]">{t.today}</span>}
      </div>
      <div className="text-xs text-muted-foreground">{formatGregorian(lang, date)}</div>
    </div>
  )
}

export function PlanView({
  days,
  today,
  canGrade = false,
  editing = false,
  drafts,
  onDraft,
  onGrade,
  busy,
}: {
  days: PlanDay[]
  today: string
  canGrade?: boolean
  editing?: boolean
  drafts?: Record<number, { newMemorization: string; review: string }>
  onDraft?: (id: number, patch: { newMemorization?: string; review?: string }) => void
  onGrade?: (dayId: number, action: 'done' | 'missed' | 'undo') => void
  busy?: boolean
}) {
  const { t } = usePrefs()
  const byDate = new Map(days.map((d) => [d.date, d]))
  const current = currentLesson(days)
  const lastDone = lastDoneLesson(days)

  return (
    <div className="grid gap-5">
      {SEMESTER.map((week) => (
        <section key={week.number} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground">
            {t.week(week.number)}
            {week.vacation && <span className="text-xs font-semibold text-muted-foreground">{t.vacation}</span>}
          </div>
          {week.vacation ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">{t.vacation}</div>
          ) : (
            <div className="divide-y">
              {week.days.map((sd) => (
                <DayRow
                  key={sd.date}
                  sd={sd}
                  day={byDate.get(sd.date)}
                  today={today}
                  isCurrent={!!current && byDate.get(sd.date)?.id === current.id}
                  isLastDone={!!lastDone && byDate.get(sd.date)?.id === lastDone.id}
                  canGrade={canGrade && !editing}
                  editing={editing}
                  draft={byDate.get(sd.date) ? drafts?.[byDate.get(sd.date)!.id] : undefined}
                  onDraft={onDraft}
                  onGrade={onGrade}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function DayRow({
  sd,
  day,
  today,
  isCurrent,
  isLastDone,
  canGrade,
  editing,
  draft,
  onDraft,
  onGrade,
  busy,
}: {
  sd: SemesterDay
  day?: PlanDay
  today: string
  isCurrent: boolean
  isLastDone: boolean
  canGrade: boolean
  editing: boolean
  draft?: { newMemorization: string; review: string }
  onDraft?: (id: number, patch: { newMemorization?: string; review?: string }) => void
  onGrade?: (dayId: number, action: 'done' | 'missed' | 'undo') => void
  busy?: boolean
}) {
  const { t } = usePrefs()

  if (sd.event || !day) {
    return (
      <div className={cn('flex items-center justify-between gap-3 px-4 py-3', sd.date === today && 'bg-accent/50')}>
        <DayLabel date={sd.date} today={today} />
        {sd.event && (
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold',
              sd.event === 'debt_repayment'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
            )}
          >
            {t.event[sd.event]}
          </span>
        )}
      </div>
    )
  }

  const nm = draft?.newMemorization ?? day.newMemorization
  const rv = draft?.review ?? day.review
  const empty = !day.newMemorization.trim() && !day.review.trim()

  return (
    <div
      className={cn(
        'grid gap-2 px-4 py-3 md:grid-cols-[10rem_1fr_1fr_auto] md:items-center md:gap-4',
        sd.date === today && 'bg-accent/40',
        isCurrent && !editing && 'bg-primary/5 ring-1 ring-inset ring-primary/40',
      )}
    >
      <div className="flex items-center justify-between gap-2 md:block">
        <DayLabel date={sd.date} today={today} />
        <div className="md:hidden">{!editing && !empty && <StatusBadge status={day.status} />}</div>
      </div>

      {editing ? (
        <>
          <input
            aria-label={t.newMemorization}
            placeholder={t.newMemorization}
            value={nm}
            onChange={(e) => onDraft?.(day.id, { newMemorization: e.target.value })}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
          <input
            aria-label={t.review}
            placeholder={t.review}
            value={rv}
            onChange={(e) => onDraft?.(day.id, { review: e.target.value })}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
          <span className="hidden md:block" />
        </>
      ) : (
        <>
          <div className="flex gap-2 text-sm">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className={cn(!day.newMemorization && 'text-muted-foreground')}>
              {day.newMemorization || t.noAssignment}
            </span>
          </div>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <RotateCcw className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>{day.review || t.noAssignment}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <div className="hidden md:block">{!empty && <StatusBadge status={day.status} />}</div>
            {day.status === 'done' && day.date > today && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <Check className="size-3" /> {t.ahead}
              </span>
            )}
            {canGrade && isCurrent && (
              <div className="w-full md:w-56">
                <GradeButtons
                  size="sm"
                  disabled={busy}
                  missedDisabled={day.date > today && day.status !== 'missed'}
                  missedActive={day.status === 'missed'}
                  onDone={() => onGrade?.(day.id, 'done')}
                  onMissed={() => onGrade?.(day.id, 'missed')}
                />
              </div>
            )}
            {canGrade && isLastDone && !isCurrent && (
              <div className="w-full md:w-56">
                <GradeButtons
                  size="sm"
                  disabled={busy}
                  missedDisabled
                  doneActive
                  onDone={() => onGrade?.(day.id, 'done')}
                  onMissed={() => {}}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
