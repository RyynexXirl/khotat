import { createFileRoute } from '@tanstack/react-router'
import { AppShell, CenteredMessage } from '@/components/app/app-shell'
import { RequireRole } from '@/components/app/guard'
import { GradingSheet } from '@/components/app/grading-sheet'
import { usePrefs } from '@/lib/i18n'
import { useAsync } from '@/lib/use-async'
import { getMuhaffizSheet, gradeAllCurrent } from '@/server/api.functions'
import type { Session } from '@/lib/session'

export const Route = createFileRoute('/muhaffiz')({
  component: () => <RequireRole roles={['muhaffiz']}>{(s) => <MuhaffizDashboard session={s} />}</RequireRole>,
})

function MuhaffizDashboard({ session }: { session: Session }) {
  const { t } = usePrefs()
  const { data, loading, error, reload } = useAsync(
    () => getMuhaffizSheet({ data: { muhaffizId: session.id } }),
    [session.id],
  )

  return (
    <AppShell session={session} title={t.muhaffizTitle} subtitle={t.muhaffizSubtitle(session.name)}>
      {loading && !data && <CenteredMessage>{t.loading}</CenteredMessage>}
      {error && <CenteredMessage>{t.loadError}</CenteredMessage>}
      {data && data.rows.length === 0 && <CenteredMessage>{t.noAssignedStudents}</CenteredMessage>}
      {data && data.rows.length > 0 && (
        <GradingSheet
          data={data}
          reload={reload}
          onGradeAll={async () => (await gradeAllCurrent({ data: { muhaffizId: session.id } })).count}
        />
      )}
    </AppShell>
  )
}
