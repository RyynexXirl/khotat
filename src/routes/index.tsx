import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpenCheck, Check, ChevronLeft, GraduationCap, Search, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandMark } from '@/components/app/brand'
import { ThemeToggle } from '@/components/app/app-shell'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/lib/i18n'
import { AJAWID, SUBGROUPS, formatStudentName } from '@/lib/names'
import { readSession, ROLE_HOME, saveSession, type Role } from '@/lib/session'
import { useAsync } from '@/lib/use-async'
import { getDirectory, login, registerStudent } from '@/server/api.functions'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

const ROLES: Array<{ role: Role; icon: typeof UserRound }> = [
  { role: 'sheikh', icon: ShieldCheck },
  { role: 'supervisor', icon: UsersRound },
  { role: 'muhaffiz', icon: BookOpenCheck },
  { role: 'student', icon: GraduationCap },
]

function LoginPage() {
  const navigate = useNavigate()
  const { t } = usePrefs()
  const dirAttr = 'rtl'
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<Role | null>(null)
  const [supervisorId, setSupervisorId] = useState('')
  const [muhaffizId, setMuhaffizId] = useState('')
  const [groupId, setGroupId] = useState<number | null>(null)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const dir = useAsync(() => getDirectory(), [])

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    const s = readSession()
    if (s) void navigate({ to: ROLE_HOME[s.role] })
  }, [navigate])

  const groupStudents = useMemo(() => {
    const list = dir.data?.students.filter((s) => s.groupId === groupId) ?? []
    const q = query.trim()
    return q ? list.filter((s) => s.name.includes(q)) : list
  }, [dir.data, groupId, query])

  const selectedStudent = dir.data?.students.find((s) => s.id === studentId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return
    setSubmitting(true)
    try {
      const res = await login({
        data: {
          role,
          password,
          supervisorId: supervisorId ? Number(supervisorId) : undefined,
          muhaffizId: muhaffizId ? Number(muhaffizId) : undefined,
          studentId: studentId ?? undefined,
        },
      })
      if (!res.ok) {
        toast.error(t.errors[res.error] ?? t.loginFailed)
        return
      }
      saveSession(res.session)
      toast.success(t.welcome(res.session.role === 'sheikh' ? t.roles.sheikh : res.session.name))
      void navigate({ to: ROLE_HOME[res.session.role] })
    } catch {
      toast.error(t.loginFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    !!role &&
    (role === 'sheikh' ||
      (role === 'supervisor' && !!supervisorId) ||
      (role === 'muhaffiz' && !!muhaffizId) ||
      (role === 'student' && !!studentId))

  return (
    <div className="min-h-screen bg-background">
      <section className="pattern-stars relative overflow-hidden">
        <div className="absolute end-3 top-3">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-md px-6 pt-12 pb-24 text-center">
          <BrandMark className="mx-auto size-16" />
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{t.appName}</h1>
          <p className="mt-3 opacity-85">{t.appTagline}</p>
          <p className="mt-4 font-display text-lg text-gold">﴿ وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ ﴾</p>
        </div>
      </section>

      <main className="relative mx-auto -mt-16 max-w-md px-4 pb-16">
        {mode === 'register' ? (
          <RegisterForm
            groups={dir.data?.groups ?? []}
            loading={dir.loading}
            onDone={() => {
              setMode('login')
              void dir.reload()
            }}
            onBack={() => setMode('login')}
          />
        ) : (
          <form onSubmit={submit} className="rounded-3xl border bg-card p-5 shadow-xl sm:p-6">
            {!role ? (
              <>
                <h2 className="text-center text-lg font-bold">{t.loginAs}</h2>
                <div className="mt-4 grid gap-3">
                  {ROLES.map(({ role: r, icon: Icon }) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className="group flex items-center gap-4 rounded-2xl border bg-background p-4 text-start transition-all hover:border-primary hover:bg-secondary active:scale-[0.98]"
                    >
                      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Icon className="size-6" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-lg font-bold">{t.roles[r]}</span>
                        <span className="block text-sm text-muted-foreground">{t.roleDesc[r]}</span>
                      </span>
                      <ChevronLeft className="size-5 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                    </button>
                  ))}
                </div>
                <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setMode('register')}>
                  <GraduationCap /> {t.noAccount}
                </Button>
              </>
            ) : (
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{t.loginTitle(t.roles[role])}</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRole(null)
                      setStudentId(null)
                      setGroupId(null)
                      setSupervisorId('')
                      setMuhaffizId('')
                    }}
                  >
                    <ArrowRight /> {t.back}
                  </Button>
                </div>

                {role === 'supervisor' && (
                  <div className="grid gap-2">
                    <Label>{t.chooseSupervisor}</Label>
                    <Select value={supervisorId} onValueChange={setSupervisorId} dir={dirAttr}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder={dir.loading ? t.loading : t.chooseFromList} />
                      </SelectTrigger>
                      <SelectContent>
                        {dir.data?.supervisors.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name} — {dir.data?.groups.find((g) => g.id === s.groupId)?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {role === 'muhaffiz' && (
                  <div className="grid gap-2">
                    <Label>{t.chooseMuhaffiz}</Label>
                    <Select value={muhaffizId} onValueChange={setMuhaffizId} dir={dirAttr}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder={dir.loading ? t.loading : t.chooseFromList} />
                      </SelectTrigger>
                      <SelectContent>
                        {dir.data?.muhaffizeen.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {role === 'student' && (
                  <>
                    <div className="grid gap-2">
                      <Label>{t.group}</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {dir.data?.groups.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setGroupId(g.id)
                              setStudentId(null)
                              setQuery('')
                            }}
                            className={cn(
                              'rounded-xl border px-2 py-3 text-sm font-bold transition-all',
                              groupId === g.id
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'bg-background hover:bg-secondary',
                            )}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {groupId && (
                      <div className="grid gap-2">
                        <Label htmlFor="student-search">{t.studentName}</Label>
                        <div className="relative">
                          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="student-search"
                            className="h-11 ps-9"
                            placeholder={t.searchName}
                            value={selectedStudent && !query ? selectedStudent.name : query}
                            onChange={(e) => {
                              setQuery(e.target.value)
                              setStudentId(null)
                            }}
                            autoComplete="off"
                          />
                        </div>
                        {!studentId && (
                          <div className="max-h-56 overflow-y-auto rounded-lg border">
                            {groupStudents.length === 0 && (
                              <div className="p-3 text-center text-sm text-muted-foreground">{t.noResults}</div>
                            )}
                            {groupStudents.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setStudentId(s.id)
                                  setQuery('')
                                }}
                                className="flex w-full items-center gap-2 border-b px-3 py-2.5 text-start text-sm last:border-b-0 hover:bg-secondary"
                              >
                                <UserRound className="size-4 text-muted-foreground" />
                                {s.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {studentId && (
                          <div className="flex items-center gap-2 text-sm text-primary">
                            <Check className="size-4" /> {t.selected(selectedStudent?.name ?? '')}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <Input
                    id="password"
                    className="h-11"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••"
                    autoFocus={role === 'sheikh'}
                    required
                  />
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">
                  {t.yourPassword}
                </p>

                <Button type="submit" size="lg" className="h-12 text-base" disabled={!canSubmit || submitting}>
                  {submitting ? t.loggingIn : t.login}
                </Button>
              </div>
            )}
          </form>
        )}
        {dir.error && <p className="mt-4 text-center text-sm text-destructive">{t.loadError}</p>}
      </main>
    </div>
  )
}

function RegisterForm({
  groups,
  loading,
  onDone,
  onBack,
}: {
  groups: Array<{ id: number; name: string }>
  loading: boolean
  onDone: () => void
  onBack: () => void
}) {
  const { t } = usePrefs()
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState<number | null>(null)
  const [subgroup, setSubgroup] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedGroup = groups.find((g) => g.id === groupId)
  const needsSubgroup = selectedGroup?.name === AJAWID

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!groupId) return toast.error(t.chooseGroup)
    if (needsSubgroup && !subgroup) return toast.error(t.chooseSubgroup)
    if (password.length < 4) return toast.error(t.errors.weak_password)
    if (password !== confirm) return toast.error(t.errors.password_mismatch)
    setSaving(true)
    try {
      await registerStudent({
        data: {
          name,
          groupId,
          subgroup: needsSubgroup ? subgroup : undefined,
          phone: phone || undefined,
          password,
        },
      })
      toast.success(t.registerSuccess)
      onDone()
    } catch {
      toast.error(t.registerFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl border bg-card p-5 shadow-xl sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t.registerTitle}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowRight /> {t.back}
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="reg-name">{t.fullName}</Label>
        <Input
          id="reg-name"
          className="h-11"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.nameHint}
          minLength={2}
          required
        />
        {name.trim().split(/\s+/).filter(Boolean).length >= 3 && (
          <p className="text-xs text-muted-foreground" dir="rtl">
            {formatStudentName(name)}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>{t.group}</Label>
        <div className="grid grid-cols-3 gap-2">
          {loading && <p className="col-span-3 text-center text-sm text-muted-foreground">{t.loading}</p>}
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setGroupId(g.id)
                setSubgroup('')
              }}
              className={cn(
                'rounded-xl border px-2 py-3 text-sm font-bold transition-all',
                groupId === g.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary',
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {needsSubgroup && (
        <div className="grid gap-2">
          <Label>{t.subgroup}</Label>
          <div className="grid grid-cols-3 gap-2">
            {SUBGROUPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubgroup(s)}
                className={cn(
                  'rounded-xl border px-2 py-3 text-sm font-bold transition-all',
                  subgroup === s ? 'border-gold bg-gold text-deep dark:text-[oklch(0.2_0.03_172)]' : 'bg-background hover:bg-secondary',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="reg-phone">{t.phone}</Label>
        <Input
          id="reg-phone"
          className="h-11"
          type="tel"
          inputMode="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05xxxxxxxx"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="reg-password">{t.password}</Label>
          <Input
            id="reg-password"
            className="h-11"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-confirm">{t.confirmPassword}</Label>
          <Input
            id="reg-confirm"
            className="h-11"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="h-12 text-base" disabled={saving}>
        {saving ? t.registering : t.registerSubmit}
      </Button>
      <Button type="button" variant="link" size="sm" onClick={onBack}>
        {t.haveAccount}
      </Button>
    </form>
  )
}
