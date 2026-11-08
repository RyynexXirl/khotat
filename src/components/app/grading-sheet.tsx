import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { BookOpen, CheckCheck, ChevronLeft, RotateCcw, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DayLabel } from '@/components/app/plan-view'
import { GradeButtons } from '@/components/app/status'
import { cn } from '@/lib/utils'
import { usePrefs, weekdayName } from '@/lib/i18n'
import { hijriLabel, semesterDay } from '@/lib/semester'
import { useGrade } from '@/lib/use-grade'
import type { getGradingSheet } from '@/server/api.functions'

type SheetData = Omit<NonNullable<Awaited<ReturnType<typeof getGradingSheet>>>, 'supervisor' | 'group'>

/** Recitation sheet shared by the مشرف (group) and محفظ (assigned students) dashboards. */
export function GradingSheet({
  data,
  onGradeAll,
  reload,
}: {
  data: SheetData
  onGradeAll: () => Promise<number>
  reload: () => Promise<void>
}) {
  const { t } = usePrefs()
  const { grade, busy } = useGrade(() => {})
  const [allBusy, setAllBusy] = useState(false)

  async function act(dayId: number, action: 'done' | 'missed' | 'undo') {
    await grade(dayId, action)
    await reload()
  }

  const today = data.today
  const todayInfo = today ? semesterDay(today) : undefined
  const caughtUp = data.rows.filter((r) => r.total > 0 && r.behind === 0).length
  const dueCount = data.rows.filter((r) => r.current && r.current.date <= today).length

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <div className="font-bold">
            {t.todayIs(weekdayName(t, today), hijriLabel(today))}
            {todayInfo?.event && (
              <span className="ms-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {t.event[todayInfo.event]}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {todayInfo ? t.recitedCount(caughtUp, data.rows.length) : t.noStudyToday}
          </div>
        </div>
        <Button
          disabled={allBusy || dueCount === 0}
          onClick={async () => {
            if (!window.confirm(t.allDoneConfirm)) return
            setAllBusy(true)
            try {
              const count = await onGradeAll()
              toast.success(t.allDoneResult(count))
              await reload()
            } catch {
              toast.error(t.saveFailed)
            } finally {
              setAllBusy(false)
            }
          }}
        >
          <CheckCheck /> {t.allDone}
        </Button>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t.orderRule}</p>

      <div className="grid gap-3 lg:grid-cols-2">
        {data.rows.map(({ student, current, debts, behind, total, lastDone }) => {
          const ahead = !!current && current.date > today
          return (
            <div key={student.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to="/plan/$studentId"
                  params={{ studentId: String(student.id) }}
                  className="group flex items-center gap-1 font-bold hover:text-primary"
                >
                  {student.name}
                  <ChevronLeft className="size-4 text-muted-foreground" />
                </Link>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {debts > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      {t.nDebts(debts)}
                    </span>
                  )}
                  {total > 0 &&
                    (behind > 0 ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {t.behind(behind)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {t.caughtUp}
                      </span>
                    ))}
                </div>
              </div>

              {total === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{t.emptyPlan}</p>
              ) : !current ? (
                <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{t.finished}</p>
              ) : (
                <>
                  <div
                    className={cn(
                      'mt-3 rounded-lg border p-3',
                      current.date < today || current.status === 'debt' || current.status === 'missed'
                        ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30'
                        : 'bg-muted/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <DayLabel date={current.date} today={today} />
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {ahead ? t.ahead : t.current}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex gap-2">
                        <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                        {current.newMemorization || t.noAssignment}
                      </div>
                      <div className="flex gap-2 text-muted-foreground">
                        <RotateCcw className="mt-0.5 size-4 shrink-0 text-gold" />
                        {current.review || t.noAssignment}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <GradeButtons
                      disabled={busy}
                      missedDisabled={ahead && current.status !== 'missed'}
                      missedActive={current.status === 'missed'}
                      onDone={() => void act(current.id, 'done')}
                      onMissed={() => void act(current.id, 'missed')}
                    />
                  </div>
                </>
              )}
              {lastDone && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(lastDone.id, 'undo')}
                  className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                >
                  <Undo2 className="size-3.5" /> {t.undo} ({weekdayName(t, lastDone.date)} {hijriLabel(lastDone.date)})
                </button>
              )}
            </div>
          )
        })}
      </div>
      {data.rows.length === 0 && <p className="py-10 text-center text-muted-foreground">{t.noStudents}</p>}
    </div>
  )
}
