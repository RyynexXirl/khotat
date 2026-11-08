import { createFileRoute } from '@tanstack/react-router'
import { AppShell, CenteredMessage } from '@/components/app/app-shell'
import { RequireRole } from '@/components/app/guard'
import { GradingSheet } from '@/components/app/grading-sheet'
import { usePrefs } from '@/lib/i18n'
import { useAsync } from '@/lib/use-async'
import { getGradingSheet, gradeAllCurrent } from '@/server/api.functions'
import type { Session } from '@/lib/session'

export const Route = createFileRoute('/supervisor')({
  component: () => <RequireRole roles={['supervisor']}>{(s) => <SupervisorDashboard session={s} />}</RequireRole>,
})

function SupervisorDashboard({ session }: { session: Session }) {
  const { t } = usePrefs()
  const { data, loading, error, reload } = useAsync(
    () => getGradingSheet({ data: { supervisorId: session.id } }),
    [session.id],
  )

  return (
    <AppShell
      session={session}
      title={data?.group ? t.supervisorTitle(data.group.name) : t.roles.supervisor}
      subtitle={t.supervisorSubtitle(session.name)}
    >
      {loading && !data && <CenteredMessage>{t.loading}</CenteredMessage>}
      {error && <CenteredMessage>{t.loadError}</CenteredMessage>}
      {data && (
        <GradingSheet
          data={data}
          reload={reload}
          onGradeAll={async () => (await gradeAllCurrent({ data: { supervisorId: session.id } })).count}
        />
      )}
    </AppShell>
  )
}
