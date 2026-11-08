import { createFileRoute } from '@tanstack/react-router'
import { HandCoins } from 'lucide-react'
import { AppShell, CenteredMessage } from '@/components/app/app-shell'
import { RequireRole } from '@/components/app/guard'
import { DayLabel, PlanSummary, PlanView } from '@/components/app/plan-view'
import { usePrefs, weekdayName } from '@/lib/i18n'
import { currentLesson, isDebt, lessons } from '@/lib/plan'
import { hijriLabel } from '@/lib/semester'
import { useAsync } from '@/lib/use-async'
import { getStudentPlan } from '@/server/api.functions'
import type { Session } from '@/lib/session'

export const Route = createFileRoute('/student')({
  component: () => <RequireRole roles={['student']}>{(s) => <StudentDashboard session={s} />}</RequireRole>,
})

function StudentDashboard({ session }: { session: Session }) {
  const { t } = usePrefs()
  const { data, loading, error } = useAsync(() => getStudentPlan({ data: { studentId: session.id } }), [session.id])
  const debtDays = data ? lessons(data.days).filter(isDebt) : []
  const next = data ? currentLesson(data.days) : undefined

  return (
    <AppShell
      session={session}
      title={t.hello(session.name)}
      subtitle={data ? t.groupLine(data.student.groupName, data.supervisor) : t.myPlan}
    >
      {loading && !data && <CenteredMessage>{t.loading}</CenteredMessage>}
      {error && <CenteredMessage>{t.loadError}</CenteredMessage>}
      {data === null && <CenteredMessage>{t.accountNotFound}</CenteredMessage>}
      {data && (
        <div className="grid gap-6">
          {next && (
            <div className="rounded-3xl border border-gold/50 bg-accent/60 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-accent-foreground">{t.nextLesson}</div>
                <DayLabel date={next.date} today={data.today} className="text-end" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-deep">{next.newMemorization || t.noAssignment}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t.review}: {next.review || t.noAssignment}
              </div>
            </div>
          )}
          <PlanSummary days={data.days} />
          {debtDays.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
              <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
                <HandCoins className="size-5" /> {t.youHaveDebts(debtDays.length)}
              </div>
              <ol className="mt-2 grid list-inside list-decimal gap-1 text-sm text-red-800 dark:text-red-200">
                {debtDays.map((d) => (
                  <li key={d.id}>
                    {weekdayName(t, d.date)} ({hijriLabel(d.date)}): {d.newMemorization}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <section className="grid gap-3">
            <h2 className="text-lg font-bold">{t.semesterPlan}</h2>
            <PlanView days={data.days} today={data.today} />
          </section>
        </div>
      )}
    </AppShell>
  )
}
