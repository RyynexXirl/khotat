import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AlarmClock, ChevronLeft, HandCoins, Pencil, Plus, Search, Trash2, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AppShell, CenteredMessage } from '@/components/app/app-shell'
import { RequireRole } from '@/components/app/guard'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/lib/i18n'
import { AJAWID, SUBGROUPS } from '@/lib/names'
import { useAsync } from '@/lib/use-async'
import {
  addMuhaffiz,
  addStudent,
  addSupervisor,
  deleteMuhaffiz,
  deleteStudent,
  deleteSupervisor,
  getSheikhOverview,
  runDebtCheck,
  updateStudent,
} from '@/server/api.functions'
import type { Session } from '@/lib/session'

export const Route = createFileRoute('/sheikh')({
  component: () => <RequireRole roles={['sheikh']}>{(s) => <SheikhDashboard session={s} />}</RequireRole>,
})

type Overview = Awaited<ReturnType<typeof getSheikhOverview>>
type StudentRow = Overview['students'][number]
type AccountToDelete = { kind: 'supervisor' | 'muhaffiz'; id: number; name: string }

function SheikhDashboard({ session }: { session: Session }) {
  const { t } = usePrefs()
  const dirAttr = 'rtl'
  const { data, loading, error, reload } = useAsync(() => getSheikhOverview(), [])
  const [debtsOpen, setDebtsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [toEdit, setToEdit] = useState<StudentRow | null>(null)
  const [toDelete, setToDelete] = useState<StudentRow | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<AccountToDelete | null>(null)
  const [addSvOpen, setAddSvOpen] = useState(false)
  const [addMhOpen, setAddMhOpen] = useState(false)
  const [groupFilter, setGroupFilter] = useState<number | 'all'>('all')
  const [query, setQuery] = useState('')
  const [checking, setChecking] = useState(false)

  const filtered = useMemo(
    () =>
      (data?.students ?? []).filter(
        (s) => (groupFilter === 'all' || s.groupId === groupFilter) && s.name.includes(query.trim()),
      ),
    [data, groupFilter, query],
  )
  const debtors = useMemo(
    () => [...(data?.students ?? [])].filter((s) => s.debts > 0).sort((a, b) => b.debts - a.debts),
    [data],
  )

  return (
    <AppShell
      session={session}
      title={t.sheikhTitle}
      subtitle={t.sheikhSubtitle}
      actions={
        <>
          <Button className="bg-gold text-deep hover:bg-gold/90 dark:text-[oklch(0.2_0.03_172)]" onClick={() => setAddOpen(true)}>
            <Plus /> {t.addStudent}
          </Button>
          <Button
            variant="outline"
            className="border-white/30 bg-white/10 text-inherit hover:bg-white/20 hover:text-inherit"
            disabled={checking}
            onClick={async () => {
              setChecking(true)
              try {
                const r = await runDebtCheck()
                toast.success(t.debtsMarked(r.marked))
                await reload()
              } catch {
                toast.error(t.runFailed)
              } finally {
                setChecking(false)
              }
            }}
          >
            <AlarmClock /> {t.runDebts}
          </Button>
        </>
      }
    >
      {loading && !data && <CenteredMessage>{t.loading}</CenteredMessage>}
      {error && <CenteredMessage>{t.loadError}</CenteredMessage>}
      {data && (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersRound className="size-4 text-primary" /> {t.totalStudents}
              </div>
              <div className="mt-2 text-4xl font-bold text-deep sm:text-5xl">{data.totals.students}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t.inGroups(data.groups.length)}</div>
            </div>
            <button
              type="button"
              onClick={() => setDebtsOpen(true)}
              className="group rounded-3xl border border-red-200 bg-gradient-to-bl from-red-50 to-card p-4 text-start shadow-sm transition-all hover:shadow-md active:scale-[0.98] sm:p-6 dark:border-red-900 dark:from-red-950/60 dark:to-card dark:hover:from-red-950/90"
            >
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <HandCoins className="size-4" /> {t.studentsWithDebts}
              </div>
              <div className="mt-2 text-4xl font-bold text-red-700 sm:text-5xl dark:text-red-300">
                {data.totals.withDebts}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-red-700/80 dark:text-red-300/80">
                {t.debtDaysShowList(data.totals.totalDebtDays)}
                <ChevronLeft className="size-3.5" />
              </div>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {data.groups.map((g) => {
              const members = data.students.filter((s) => s.groupId === g.id)
              const done = members.reduce((a, s) => a + s.done, 0)
              const total = members.reduce((a, s) => a + s.total, 0)
              const pct = total ? Math.round((done / total) * 100) : 0
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupFilter(groupFilter === g.id ? 'all' : g.id)}
                  className={cn(
                    'rounded-2xl border bg-card p-4 text-start shadow-sm transition-all hover:border-primary',
                    groupFilter === g.id && 'border-primary ring-2 ring-primary/20',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-bold text-deep">{g.name}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{t.studentsCount(members.length)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.supervisorOf(g.supervisor)}</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t.progressPct(pct)}</div>
                </button>
              )
            })}
          </div>

          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{t.students}</h2>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus /> {t.addStudent}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Switch checked={editMode} onCheckedChange={setEditMode} dir="rtl" />
                  {t.editMode}
                </label>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="ps-9" placeholder={t.searchByName} value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="hidden grid-cols-[1fr_8rem_6rem_7rem_7rem] gap-3 border-b bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground md:grid">
                <span>{t.student}</span>
                <span>{t.group}</span>
                <span>{t.progress}</span>
                <span>{t.debts}</span>
                <span />
              </div>
              <div className="divide-y">
                {filtered.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3 md:grid md:grid-cols-[1fr_8rem_6rem_7rem_7rem]"
                  >
                    <Link to="/plan/$studentId" params={{ studentId: String(s.id) }} className="min-w-0 flex-1 hover:text-primary">
                      <div className="truncate font-semibold">{s.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {s.groupName}
                        {s.subgroup ? ` · ${s.subgroup}` : ''} · {s.done}/{s.total}
                      </div>
                      {s.muhaffizName && <div className="text-[11px] text-muted-foreground">{t.assignMuhaffiz}: {s.muhaffizName}</div>}
                    </Link>
                    <span className="hidden text-sm md:block">
                      {s.groupName}
                      {s.subgroup ? ` · ${s.subgroup}` : ''}
                    </span>
                    <span className="hidden text-sm md:block">
                      {s.done}/{s.total}
                    </span>
                    <DebtPill n={s.debts} />
                    <div className="flex justify-end gap-1">
                      <Button asChild size="sm" variant="outline" className="hidden md:inline-flex">
                        <Link to="/plan/$studentId" params={{ studentId: String(s.id) }}>
                          {t.plan}
                        </Link>
                      </Button>
                      {editMode && (
                        <>
                          <Button size="icon-sm" variant="ghost" aria-label={t.edit} onClick={() => setToEdit(s)}>
                            <Pencil className="text-primary" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label={t.delete} onClick={() => setToDelete(s)}>
                            <Trash2 className="text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {filtered.length === 0 && <CenteredMessage>{t.noMatches}</CenteredMessage>}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <AccountsCard
              title={t.supervisorsSection}
              addLabel={t.addSupervisor}
              onAdd={() => setAddSvOpen(true)}
              rows={data.supervisors.map((sv) => ({
                id: sv.id,
                name: sv.name,
                detail: data.groups.find((g) => g.id === sv.groupId)?.name ?? '',
              }))}
              editMode={editMode}
              onDelete={(id, name) => setAccountToDelete({ kind: 'supervisor', id, name })}
            />
            <AccountsCard
              title={t.muhaffizeenSection}
              addLabel={t.addMuhaffiz}
              onAdd={() => setAddMhOpen(true)}
              rows={data.muhaffizeen.map((m) => ({
                id: m.id,
                name: m.name,
                detail: t.assignedStudents(m.assigned),
              }))}
              editMode={editMode}
              onDelete={(id, name) => setAccountToDelete({ kind: 'muhaffiz', id, name })}
            />
          </div>
        </div>
      )}

      <Dialog open={debtsOpen} onOpenChange={setDebtsOpen}>
        <DialogContent dir={dirAttr} className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.debtorsTitle}</DialogTitle>
            <DialogDescription>{t.debtorsDesc}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {debtors.length === 0 && <p className="py-6 text-center text-muted-foreground">{t.noDebtsAll}</p>}
            {debtors.map((s) => (
              <Link
                key={s.id}
                to="/plan/$studentId"
                params={{ studentId: String(s.id) }}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
              >
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.groupName}</div>
                </div>
                <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">{t.nDebts(s.debts)}</span>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AddStudentDialog open={addOpen} onOpenChange={setAddOpen} groups={data?.groups ?? []} />

      {toEdit && (
        <EditStudentDialog
          student={toEdit}
          groups={data?.groups ?? []}
          muhaffizeen={data?.muhaffizeen ?? []}
          onClose={() => setToEdit(null)}
          onSaved={async () => {
            setToEdit(null)
            await reload()
          }}
        />
      )}

      <AddSupervisorDialog open={addSvOpen} onOpenChange={setAddSvOpen} groups={data?.groups ?? []} onAdded={reload} />
      <AddMuhaffizDialog open={addMhOpen} onOpenChange={setAddMhOpen} onAdded={reload} />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent dir={dirAttr}>
          <DialogHeader>
            <DialogTitle>{t.deleteStudent}</DialogTitle>
            <DialogDescription>{t.deleteConfirm(toDelete?.name ?? '')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!toDelete) return
                try {
                  await deleteStudent({ data: { id: toDelete.id } })
                  toast.success(t.deleted)
                  setToDelete(null)
                  await reload()
                } catch {
                  toast.error(t.deleteFailed)
                }
              }}
            >
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!accountToDelete} onOpenChange={(o) => !o && setAccountToDelete(null)}>
        <DialogContent dir={dirAttr}>
          <DialogHeader>
            <DialogTitle>{t.deleteAccount}</DialogTitle>
            <DialogDescription>{t.deleteAccountConfirm(accountToDelete?.name ?? '')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountToDelete(null)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!accountToDelete) return
                try {
                  if (accountToDelete.kind === 'supervisor') await deleteSupervisor({ data: { id: accountToDelete.id } })
                  else await deleteMuhaffiz({ data: { id: accountToDelete.id } })
                  toast.success(t.accountDeleted)
                  setAccountToDelete(null)
                  await reload()
                } catch {
                  toast.error(t.deleteFailed)
                }
              }}
            >
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

function DebtPill({ n }: { n: number }) {
  const { t } = usePrefs()
  return (
    <span
      className={cn(
        'inline-flex w-fit justify-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
        n > 0
          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      )}
    >
      {n > 0 ? t.nDebts(n) : t.noDebts}
    </span>
  )
}

function AccountsCard({
  title,
  addLabel,
  onAdd,
  rows,
  editMode,
  onDelete,
}: {
  title: string
  addLabel: string
  onAdd: () => void
  rows: Array<{ id: number; name: string; detail: string }>
  editMode: boolean
  onDelete: (id: number, name: string) => void
}) {
  const { t } = usePrefs()
  return (
    <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus /> {addLabel}
        </Button>
      </div>
      <div className="divide-y rounded-xl border">
        {rows.length === 0 && <p className="p-3 text-center text-sm text-muted-foreground">{t.noAccounts}</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.detail}</div>
            </div>
            {editMode && (
              <Button size="icon-sm" variant="ghost" aria-label={t.delete} onClick={() => onDelete(r.id, r.name)}>
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function AddStudentDialog({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  groups: Array<{ id: number; name: string }>
}) {
  const { t } = usePrefs()
  const dirAttr = 'rtl'
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [subgroup, setSubgroup] = useState('')
  const [saving, setSaving] = useState(false)
  const isAjawid = groups.find((g) => String(g.id) === groupId)?.name === AJAWID
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dirAttr}>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!groupId) return toast.error(t.chooseGroup)
            setSaving(true)
            try {
              const student = await addStudent({
                data: { name, groupId: Number(groupId), subgroup: isAjawid && subgroup ? subgroup : undefined },
              })
              toast.success(t.added)
              setName('')
              setGroupId('')
              setSubgroup('')
              onOpenChange(false)
              void navigate({ to: '/plan/$studentId', params: { studentId: String(student.id) } })
            } catch {
              toast.error(t.addFailed)
            } finally {
              setSaving(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.newStudent}</DialogTitle>
            <DialogDescription>{t.newStudentDesc}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="student-name">{t.studentName}</Label>
            <Input id="student-name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </div>
          <div className="grid gap-2">
            <Label>{t.group}</Label>
            <Select value={groupId} onValueChange={setGroupId} dir={dirAttr}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t.chooseGroup} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAjawid && (
            <div className="grid gap-2">
              <Label>{t.subgroup}</Label>
              <Select value={subgroup} onValueChange={setSubgroup} dir={dirAttr}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.chooseSubgroup} />
                </SelectTrigger>
                <SelectContent>
                  {SUBGROUPS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t.adding : t.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditStudentDialog({
  student,
  groups,
  muhaffizeen,
  onClose,
  onSaved,
}: {
  student: StudentRow
  groups: Array<{ id: number; name: string }>
  muhaffizeen: Overview['muhaffizeen']
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = usePrefs()
  const dirAttr = 'rtl'
  const [name, setName] = useState(student.name)
  const [groupId, setGroupId] = useState(String(student.groupId))
  const [subgroup, setSubgroup] = useState(student.subgroup ?? '')
  const [muhaffizId, setMuhaffizId] = useState(student.muhaffizId ? String(student.muhaffizId) : 'none')
  const [saving, setSaving] = useState(false)
  const isAjawid = groups.find((g) => String(g.id) === groupId)?.name === AJAWID
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={dirAttr}>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              await updateStudent({
                data: {
                  id: student.id,
                  name,
                  groupId: Number(groupId),
                  subgroup: isAjawid ? subgroup || null : null,
                  muhaffizId: muhaffizId === 'none' ? null : Number(muhaffizId),
                },
              })
              toast.success(t.saved)
              await onSaved()
            } catch {
              toast.error(t.saveFailed)
            } finally {
              setSaving(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.editStudent}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-name">{t.rename}</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </div>
          <div className="grid gap-2">
            <Label>{t.changeGroup}</Label>
            <Select value={groupId} onValueChange={setGroupId} dir={dirAttr}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAjawid && (
            <div className="grid gap-2">
              <Label>{t.subgroup}</Label>
              <Select value={subgroup} onValueChange={setSubgroup} dir={dirAttr}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.chooseSubgroup} />
                </SelectTrigger>
                <SelectContent>
                  {SUBGROUPS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>{t.assignMuhaffiz}</Label>
            <Select value={muhaffizId} onValueChange={setMuhaffizId} dir={dirAttr}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.noMuhaffiz}</SelectItem>
                {muhaffizeen.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t.saving : t.savePlan}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddSupervisorDialog({
  open,
  onOpenChange,
  groups,
  onAdded,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  groups: Array<{ id: number; name: string }>
  onAdded: () => Promise<void>
}) {
  const { t } = usePrefs()
  const dirAttr = 'rtl'
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dirAttr}>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!groupId) return toast.error(t.chooseGroup)
            setSaving(true)
            try {
              await addSupervisor({ data: { name, groupId: Number(groupId), password } })
              toast.success(t.accountAdded)
              setName('')
              setGroupId('')
              setPassword('')
              onOpenChange(false)
              await onAdded()
            } catch {
              toast.error(t.addAccountFailed)
            } finally {
              setSaving(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.addSupervisor}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>{t.accountName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </div>
          <div className="grid gap-2">
            <Label>{t.group}</Label>
            <Select value={groupId} onValueChange={setGroupId} dir={dirAttr}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t.chooseGroup} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t.password}</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={4} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t.adding : t.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddMuhaffizDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onAdded: () => Promise<void>
}) {
  const { t } = usePrefs()
  const dirAttr = 'rtl'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dirAttr}>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              await addMuhaffiz({ data: { name, phone: phone || undefined, password } })
              toast.success(t.accountAdded)
              setName('')
              setPhone('')
              setPassword('')
              onOpenChange(false)
              await onAdded()
            } catch {
              toast.error(t.addAccountFailed)
            } finally {
              setSaving(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.addMuhaffiz}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>{t.accountName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </div>
          <div className="grid gap-2">
            <Label>{t.phone}</Label>
            <Input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t.password}</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={4} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t.adding : t.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
