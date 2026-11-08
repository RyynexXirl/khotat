import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowRight, Copy, FileDown, Pencil, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppShell, CenteredMessage } from '@/components/app/app-shell'
import { RequireRole } from '@/components/app/guard'
import { PlanSummary, PlanView } from '@/components/app/plan-view'
import { PlanPrint } from '@/components/app/plan-print'
import { usePrefs } from '@/lib/i18n'
import { lessons } from '@/lib/plan'
import { ROLE_HOME, type Session } from '@/lib/session'
import { useAsync } from '@/lib/use-async'
import { useGrade } from '@/lib/use-grade'
import { copyPlan, getStudentPlan, savePlanContent } from '@/server/api.functions'

export const Route = createFileRoute('/plan/$studentId')({
  component: PlanRoute,
})

function PlanRoute() {
  const { studentId } = Route.useParams()
  return (
    <RequireRole roles={['sheikh', 'supervisor', 'muhaffiz']}>
      {(s) => <StudentPlanPage session={s} studentId={Number(studentId)} />}
    </RequireRole>
  )
}

type Drafts = Record<number, { newMemorization: string; review: string }>

function StudentPlanPage({ session, studentId }: { session: Session; studentId: number }) {
  const { t } = usePrefs()
  const { data, loading, error, setData } = useAsync(() => getStudentPlan({ data: { studentId } }), [studentId])
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Drafts>({})
  const [saving, setSaving] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [printing, setPrinting] = useState(false)
  const { grade, busy } = useGrade((days) => data && setData({ ...data, days }))

  const isEmpty = !!data && lessons(data.days).length === 0
  const dirty = Object.keys(drafts).length > 0

  // Print flow: render the landscape table, open the print dialog, then restore the app.
  useEffect(() => {
    if (!printing) return
    const after = () => setPrinting(false)
    window.addEventListener('afterprint', after)
    const timer = setTimeout(() => window.print(), 50)
    return () => {
      window.removeEventListener('afterprint', after)
      clearTimeout(timer)
    }
  }, [printing])

  if (printing && data) {
    return (
      <PlanPrint
        studentName={data.student.name}
        groupName={data.student.groupName}
        subgroup={data.student.subgroup}
        supervisor={data.supervisor}
        days={data.days}
      />
    )
  }

  async function save() {
    if (!data) return
    setSaving(true)
    try {
      const items = Object.entries(drafts).map(([id, v]) => ({ id: Number(id), ...v }))
      const days = await savePlanContent({ data: { studentId, items } })
      setData({ ...data, days })
      setDrafts({})
      setEditing(false)
      toast.success(t.planSaved)
    } catch {
      toast.error(t.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      session={session}
      title={data ? data.student.name : t.plan}
      subtitle={data ? t.groupLine(data.student.groupName, data.supervisor) : undefined}
      actions={
        <Button asChild variant="outline" size="sm" className="border-white/30 bg-white/10 text-inherit hover:bg-white/20 hover:text-inherit">
          <Link to={ROLE_HOME[session.role]}>
            <ArrowRight /> {t.backToDashboard}
          </Link>
        </Button>
      }
    >
      {loading && !data && <CenteredMessage>{t.loading}</CenteredMessage>}
      {error && <CenteredMessage>{t.loadError}</CenteredMessage>}
      {data === null && <CenteredMessage>{t.studentNotFound}</CenteredMessage>}
      {data && (
        <div className="grid gap-6">
          <PlanSummary days={data.days} />

          <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
            <div>
              <h2 className="text-lg font-bold">{t.semesterPlan}</h2>
              <p className="text-xs text-muted-foreground" dir="rtl">
                {t.semesterRange}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={save} disabled={saving || !dirty}>
                    <Save /> {saving ? t.saving : t.savePlan}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDrafts({})
                      setEditing(false)
                    }}
                  >
                    <X /> {t.cancel}
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => setEditing(true)}>
                    <Pencil /> {t.editPlan}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCopyOpen(true)}>
                    <Copy /> {t.copyFrom}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPrinting(true)}>
                    <FileDown /> {t.exportPdf}
                  </Button>
                </>
              )}
            </div>
          </div>

          {!editing && (
            <p className="-mt-3 text-xs text-muted-foreground">{isEmpty ? t.emptyPlan : t.orderRule}</p>
          )}

          <PlanView
            days={data.days}
            today={data.today}
            canGrade
            editing={editing}
            drafts={drafts}
            onDraft={(id, patch) =>
              setDrafts((prev) => {
                const base = prev[id] ?? {
                  newMemorization: data.days.find((d) => d.id === id)?.newMemorization ?? '',
                  review: data.days.find((d) => d.id === id)?.review ?? '',
                }
                return { ...prev, [id]: { ...base, ...patch } }
              })
            }
            onGrade={grade}
            busy={busy}
          />
        </div>
      )}

      {data && (
        <CopyDialog
          open={copyOpen}
          onOpenChange={setCopyOpen}
          students={data.classmates}
          onCopy={async (fromStudentId) => {
            const days = await copyPlan({ data: { fromStudentId, toStudentId: studentId } })
            setData({ ...data, days })
          }}
        />
      )}
    </AppShell>
  )
}

function CopyDialog({
  open,
  onOpenChange,
  students,
  onCopy,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  students: Array<{ id: number; name: string }>
  onCopy: (id: number) => Promise<void>
}) {
  const { t } = usePrefs()
  const [from, setFrom] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{t.copyFrom}</DialogTitle>
          <DialogDescription>{t.copyFromHint}</DialogDescription>
        </DialogHeader>
        <Select value={from} onValueChange={setFrom} dir="rtl">
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t.chooseStudent} />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button
            disabled={!from || busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onCopy(Number(from))
                toast.success(t.copied)
                onOpenChange(false)
                setFrom('')
              } catch {
                toast.error(t.saveFailed)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Copy /> {t.copy}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
