import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { groups, muhaffizeen, planDays, settings, students, supervisors } from '../../db/schema.js'
import { formatStudentName } from '../lib/names.js'
import { currentHour, currentLesson, debtCount, hasContent, lastDoneLesson, lessons, openStatus, todayIso } from '../lib/plan.js'
import { LESSON_DAYS } from '../lib/semester.js'
import { markUngradedDaysAsDebt } from './debts.js'

const SHEIKH_PASSWORD = '1234'
const SHEIKH_PASSWORD_KEY = 'sheikh_password'

/** The Sheikh's password: the value stored in settings, or the default until he changes it. */
async function getSheikhPassword() {
  const [row] = await db.select().from(settings).where(eq(settings.key, SHEIKH_PASSWORD_KEY))
  return row?.value ?? SHEIKH_PASSWORD
}

type PlanRow = typeof planDays.$inferSelect

/** Groups, supervisors (المشرفون), muhaffizeen (المحفظون) and students — used by the login screen. */
export const getDirectory = createServerFn({ method: 'GET' }).handler(async () => {
  const [g, sv, mh, st] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.id)),
    db.select().from(supervisors).orderBy(asc(supervisors.id)),
    db.select({ id: muhaffizeen.id, name: muhaffizeen.name }).from(muhaffizeen).orderBy(asc(muhaffizeen.name)),
    db
      .select({ id: students.id, name: students.name, groupId: students.groupId })
      .from(students)
      .orderBy(asc(students.name)),
  ])
  return { groups: g, supervisors: sv, muhaffizeen: mh, students: st }
})

export const login = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      role: z.enum(['sheikh', 'supervisor', 'muhaffiz', 'student']),
      password: z.string(),
      supervisorId: z.number().int().optional(),
      muhaffizId: z.number().int().optional(),
      studentId: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.role === 'sheikh') {
      if (data.password !== (await getSheikhPassword())) return { ok: false as const, error: 'wrong_password' as const }
      return { ok: true as const, session: { role: 'sheikh' as const, id: 0, name: 'الشيخ' } }
    }
    if (data.role === 'supervisor') {
      if (!data.supervisorId) return { ok: false as const, error: 'choose_supervisor' as const }
      const [s] = await db.select().from(supervisors).where(eq(supervisors.id, data.supervisorId))
      if (!s) return { ok: false as const, error: 'not_found' as const }
      if (s.password !== data.password) return { ok: false as const, error: 'wrong_credentials' as const }
      return { ok: true as const, session: { role: 'supervisor' as const, id: s.id, name: s.name } }
    }
    if (data.role === 'muhaffiz') {
      if (!data.muhaffizId) return { ok: false as const, error: 'choose_muhaffiz' as const }
      const [m] = await db.select().from(muhaffizeen).where(eq(muhaffizeen.id, data.muhaffizId))
      if (!m) return { ok: false as const, error: 'not_found' as const }
      if (m.password !== data.password) return { ok: false as const, error: 'wrong_credentials' as const }
      return { ok: true as const, session: { role: 'muhaffiz' as const, id: m.id, name: m.name } }
    }
    if (!data.studentId) return { ok: false as const, error: 'choose_student' as const }
    const [s] = await db.select().from(students).where(eq(students.id, data.studentId))
    if (!s) return { ok: false as const, error: 'not_found' as const }
    if (s.password !== data.password) return { ok: false as const, error: 'wrong_credentials' as const }
    return { ok: true as const, session: { role: 'student' as const, id: s.id, name: s.name } }
  })

/** Any logged-in user changes their own password (verified against the current one). */
export const changePassword = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      role: z.enum(['sheikh', 'supervisor', 'muhaffiz', 'student']),
      id: z.number().int(),
      currentPassword: z.string(),
      newPassword: z.string().min(4).max(60),
    }),
  )
  .handler(async ({ data }) => {
    if (data.role === 'sheikh') {
      if (data.currentPassword !== (await getSheikhPassword())) return { ok: false as const, error: 'wrong_password' as const }
      await db
        .insert(settings)
        .values({ key: SHEIKH_PASSWORD_KEY, value: data.newPassword })
        .onConflictDoUpdate({ target: settings.key, set: { value: data.newPassword } })
      return { ok: true as const }
    }
    const table = data.role === 'supervisor' ? supervisors : data.role === 'muhaffiz' ? muhaffizeen : students
    const [row] = await db.select().from(table).where(eq(table.id, data.id))
    if (!row) return { ok: false as const, error: 'not_found' as const }
    if (row.password !== data.currentPassword) return { ok: false as const, error: 'wrong_password' as const }
    await db.update(table).set({ password: data.newPassword }).where(eq(table.id, data.id))
    return { ok: true as const }
  })

/** Create empty plan rows for every semester lesson day. */
async function seedPlan(studentId: number) {
  await db.insert(planDays).values(
    LESSON_DAYS.map((d, i) => ({
      studentId,
      dayNumber: i + 1,
      date: d.date,
      newMemorization: '',
      review: '',
      status: 'pending',
    })),
  )
}

/** Student self-registration: name (formatted as «X بن Y Z»), group, sub-group, phone, password. */
export const registerStudent = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      groupId: z.number().int(),
      subgroup: z.string().trim().max(40).optional(),
      phone: z.string().trim().max(20).optional(),
      password: z.string().min(4).max(60),
    }),
  )
  .handler(async ({ data }) => {
    const [group] = await db.select().from(groups).where(eq(groups.id, data.groupId))
    if (!group) throw new Error('group not found')
    const name = formatStudentName(data.name)
    const [student] = await db
      .insert(students)
      .values({ name, groupId: group.id, subgroup: data.subgroup || null, phone: data.phone ?? '', password: data.password })
      .returning()
    await seedPlan(student.id)
    return { id: student.id, name: student.name, groupId: student.groupId }
  })

/** Per-student progress figures derived from their plan rows. */
function progressOf(days: PlanRow[], today: string) {
  const l = lessons(days)
  const done = l.filter((d) => d.status === 'done').length
  const cur = currentLesson(days)
  const dueByToday = l.filter((d) => d.date <= today).length
  return {
    total: l.length,
    done,
    debts: debtCount(days),
    behind: Math.max(0, dueByToday - done),
    current: cur ?? null,
  }
}

async function plansFor(studentIds: number[]) {
  if (studentIds.length === 0) return new Map<number, PlanRow[]>()
  const rows = await db
    .select()
    .from(planDays)
    .where(inArray(planDays.studentId, studentIds))
    .orderBy(asc(planDays.studentId), asc(planDays.dayNumber))
  const map = new Map<number, PlanRow[]>()
  for (const r of rows) {
    const list = map.get(r.studentId) ?? []
    list.push(r)
    map.set(r.studentId, list)
  }
  return map
}

/** Sheikh dashboard: totals, every student with progress, and the debts list. */
export const getSheikhOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const today = todayIso()
  const [st, g, sv, mh] = await Promise.all([
    db
      .select({
        id: students.id,
        name: students.name,
        groupId: students.groupId,
        groupName: groups.name,
        subgroup: students.subgroup,
        muhaffizId: students.muhaffizId,
        muhaffizName: muhaffizeen.name,
      })
      .from(students)
      .innerJoin(groups, eq(groups.id, students.groupId))
      .leftJoin(muhaffizeen, eq(muhaffizeen.id, students.muhaffizId))
      .orderBy(asc(students.groupId), asc(students.name)),
    db.select().from(groups).orderBy(asc(groups.id)),
    db.select().from(supervisors),
    db.select().from(muhaffizeen).orderBy(asc(muhaffizeen.name)),
  ])
  const plans = await plansFor(st.map((s) => s.id))
  const rows = st.map((s) => {
    const p = progressOf(plans.get(s.id) ?? [], today)
    return { ...s, total: p.total, done: p.done, debts: p.debts }
  })
  return {
    students: rows,
    groups: g.map((x) => ({ ...x, supervisor: sv.find((s) => s.groupId === x.id)?.name ?? '' })),
    supervisors: sv,
    muhaffizeen: mh.map((m) => ({ ...m, assigned: rows.filter((r) => r.muhaffizId === m.id).length })),
    totals: {
      students: rows.length,
      withDebts: rows.filter((r) => r.debts > 0).length,
      totalDebtDays: rows.reduce((a, r) => a + r.debts, 0),
    },
  }
})

/** New students get an empty plan row for every lesson day; the plan is then written by hand. */
export const addStudent = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      groupId: z.number().int(),
      subgroup: z.string().trim().max(40).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const [group] = await db.select().from(groups).where(eq(groups.id, data.groupId))
    if (!group) throw new Error('group not found')
    const [student] = await db
      .insert(students)
      .values({ name: formatStudentName(data.name), groupId: group.id, subgroup: data.subgroup || null })
      .returning()
    await seedPlan(student.id)
    return student
  })

/** Sheikh edit mode: rename, change group/sub-group, or assign a muhaffiz. */
export const updateStudent = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.number().int(),
      name: z.string().trim().min(2).max(80).optional(),
      groupId: z.number().int().optional(),
      subgroup: z.string().trim().max(40).nullable().optional(),
      muhaffizId: z.number().int().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const patch: Partial<typeof students.$inferInsert> = {}
    if (data.name !== undefined) patch.name = formatStudentName(data.name)
    if (data.groupId !== undefined) {
      const [group] = await db.select().from(groups).where(eq(groups.id, data.groupId))
      if (!group) throw new Error('group not found')
      patch.groupId = group.id
    }
    if (data.subgroup !== undefined) patch.subgroup = data.subgroup || null
    if (data.muhaffizId !== undefined) patch.muhaffizId = data.muhaffizId
    if (Object.keys(patch).length) await db.update(students).set(patch).where(eq(students.id, data.id))
    return { ok: true }
  })

export const deleteStudent = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    await db.delete(planDays).where(eq(planDays.studentId, data.id))
    await db.delete(students).where(eq(students.id, data.id))
    return { ok: true }
  })

export const addSupervisor = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      groupId: z.number().int(),
      password: z.string().min(4).max(60),
    }),
  )
  .handler(async ({ data }) => {
    const [group] = await db.select().from(groups).where(eq(groups.id, data.groupId))
    if (!group) throw new Error('group not found')
    const [sv] = await db
      .insert(supervisors)
      .values({ name: data.name, groupId: group.id, password: data.password })
      .returning()
    return { id: sv.id, name: sv.name }
  })

export const deleteSupervisor = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    await db.delete(supervisors).where(eq(supervisors.id, data.id))
    return { ok: true }
  })

export const addMuhaffiz = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      phone: z.string().trim().max(20).optional(),
      password: z.string().min(4).max(60),
    }),
  )
  .handler(async ({ data }) => {
    const [m] = await db
      .insert(muhaffizeen)
      .values({ name: data.name, phone: data.phone ?? '', password: data.password })
      .returning()
    return { id: m.id, name: m.name }
  })

export const deleteMuhaffiz = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    await db.update(students).set({ muhaffizId: null }).where(eq(students.muhaffizId, data.id))
    await db.delete(muhaffizeen).where(eq(muhaffizeen.id, data.id))
    return { ok: true }
  })

async function loadPlan(studentId: number) {
  return db.select().from(planDays).where(eq(planDays.studentId, studentId)).orderBy(asc(planDays.dayNumber))
}

export const getStudentPlan = createServerFn({ method: 'GET' })
  .validator(z.object({ studentId: z.number().int() }))
  .handler(async ({ data }) => {
    const [student] = await db
      .select({
        id: students.id,
        name: students.name,
        groupId: students.groupId,
        groupName: groups.name,
        subgroup: students.subgroup,
      })
      .from(students)
      .innerJoin(groups, eq(groups.id, students.groupId))
      .where(eq(students.id, data.studentId))
    if (!student) return null
    const [days, [sv], classmates] = await Promise.all([
      loadPlan(data.studentId),
      db.select().from(supervisors).where(eq(supervisors.groupId, student.groupId)),
      db.select({ id: students.id, name: students.name }).from(students).orderBy(asc(students.name)),
    ])
    return {
      student,
      supervisor: sv?.name ?? '',
      days,
      today: todayIso(),
      classmates: classmates.filter((c) => c.id !== student.id),
    }
  })

const text = z.string().max(300)

/** Save the manually written plan (memorization / review texts). Statuses are not touched. */
export const savePlanContent = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      studentId: z.number().int(),
      items: z.array(z.object({ id: z.number().int(), newMemorization: text, review: text })).max(200),
    }),
  )
  .handler(async ({ data }) => {
    await Promise.all(
      data.items.map((it) =>
        db
          .update(planDays)
          .set({ newMemorization: it.newMemorization.trim(), review: it.review.trim(), updatedAt: new Date() })
          .where(and(eq(planDays.id, it.id), eq(planDays.studentId, data.studentId))),
      ),
    )
    return loadPlan(data.studentId)
  })

/** Copy plan texts from one student to another (matched by day number). */
export const copyPlan = createServerFn({ method: 'POST' })
  .validator(z.object({ fromStudentId: z.number().int(), toStudentId: z.number().int() }))
  .handler(async ({ data }) => {
    const [from, to] = await Promise.all([loadPlan(data.fromStudentId), loadPlan(data.toStudentId)])
    const byDay = new Map(from.map((d) => [d.dayNumber, d]))
    await Promise.all(
      to.flatMap((d) => {
        const src = byDay.get(d.dayNumber)
        if (!src) return []
        return [
          db
            .update(planDays)
            .set({ newMemorization: src.newMemorization, review: src.review, updatedAt: new Date() })
            .where(eq(planDays.id, d.id)),
        ]
      }),
    )
    return loadPlan(data.toStudentId)
  })

type GradeError = 'not_found' | 'empty' | 'out_of_order' | 'not_due' | 'not_last'

/**
 * Grade one lesson, enforcing the order:
 * - "done": only the current lesson (all earlier lessons done). May be ahead of its date.
 * - "missed": only the current lesson, and only once its date has come.
 * - "undo": only the last done lesson.
 * Grades are toggleable: clicking "done" on the last done lesson, or "missed" on a missed
 * current lesson, deselects the grade and returns the day to "pending".
 */
async function gradeOne(dayId: number, action: 'done' | 'missed' | 'undo'): Promise<GradeError | null> {
  const [row] = await db.select().from(planDays).where(eq(planDays.id, dayId))
  if (!row) return 'not_found'
  if (!hasContent(row)) return 'empty'
  const days = await loadPlan(row.studentId)
  const now = new Date()
  const backToPending = () =>
    db.update(planDays).set({ status: 'pending', updatedAt: now }).where(eq(planDays.id, row.id))
  if (action === 'undo') {
    if (lastDoneLesson(days)?.id !== row.id) return 'not_last'
    await db
      .update(planDays)
      .set({ status: openStatus(row.date, now), updatedAt: now })
      .where(eq(planDays.id, row.id))
    return null
  }
  if (action === 'done' && row.status === 'done') {
    // Toggle off: only the last done lesson can be deselected, to keep the order intact.
    if (lastDoneLesson(days)?.id !== row.id) return 'not_last'
    await backToPending()
    return null
  }
  if (currentLesson(days)?.id !== row.id) return 'out_of_order'
  if (action === 'missed') {
    if (row.status === 'missed') {
      await backToPending()
      return null
    }
    if (row.date > todayIso(now)) return 'not_due'
    await db.update(planDays).set({ status: 'missed', updatedAt: now }).where(eq(planDays.id, row.id))
    return null
  }
  await db.update(planDays).set({ status: 'done', updatedAt: now }).where(eq(planDays.id, row.id))
  return null
}

export const gradeLesson = createServerFn({ method: 'POST' })
  .validator(z.object({ dayId: z.number().int(), action: z.enum(['done', 'missed', 'undo']) }))
  .handler(async ({ data }) => {
    const error = await gradeOne(data.dayId, data.action)
    const [row] = await db.select().from(planDays).where(eq(planDays.id, data.dayId))
    return { ok: !error, error, status: row?.status ?? null, days: row ? await loadPlan(row.studentId) : [] }
  })

async function gradingSheetFor(groupStudents: Array<typeof students.$inferSelect>) {
  const today = todayIso()
  const plans = await plansFor(groupStudents.map((s) => s.id))
  return {
    today,
    hour: currentHour(),
    rows: groupStudents.map((s) => {
      const days = plans.get(s.id) ?? []
      const p = progressOf(days, today)
      return { student: s, ...p, lastDone: lastDoneLesson(days) ?? null }
    }),
  }
}

/** مشرف's recitation sheet: each student's current lesson in his group. */
export const getGradingSheet = createServerFn({ method: 'GET' })
  .validator(z.object({ supervisorId: z.number().int() }))
  .handler(async ({ data }) => {
    const [sv] = await db.select().from(supervisors).where(eq(supervisors.id, data.supervisorId))
    if (!sv) return null
    const [group] = await db.select().from(groups).where(eq(groups.id, sv.groupId))
    const groupStudents = await db
      .select()
      .from(students)
      .where(eq(students.groupId, sv.groupId))
      .orderBy(asc(students.name))
    return { supervisor: sv, group, ...(await gradingSheetFor(groupStudents)) }
  })

/** محفظ's recitation sheet: only the students the Sheikh assigned to him. */
export const getMuhaffizSheet = createServerFn({ method: 'GET' })
  .validator(z.object({ muhaffizId: z.number().int() }))
  .handler(async ({ data }) => {
    const [mh] = await db.select().from(muhaffizeen).where(eq(muhaffizeen.id, data.muhaffizId))
    if (!mh) return null
    const assigned = await db
      .select()
      .from(students)
      .where(eq(students.muhaffizId, mh.id))
      .orderBy(asc(students.name))
    const groupRows = assigned.length
      ? await db.select().from(groups).where(inArray(groups.id, [...new Set(assigned.map((s) => s.groupId))]))
      : []
    return { muhaffiz: mh, groups: groupRows, ...(await gradingSheetFor(assigned)) }
  })

/** Mark the current lesson of every student of a supervisor (group) or muhaffiz (assigned) as done. */
export const gradeAllCurrent = createServerFn({ method: 'POST' })
  .validator(z.object({ supervisorId: z.number().int().optional(), muhaffizId: z.number().int().optional() }))
  .handler(async ({ data }) => {
    let ids: number[] = []
    if (data.supervisorId) {
      const [sv] = await db.select().from(supervisors).where(eq(supervisors.id, data.supervisorId))
      if (!sv) return { count: 0 }
      ids = (await db.select({ id: students.id }).from(students).where(eq(students.groupId, sv.groupId))).map((s) => s.id)
    } else if (data.muhaffizId) {
      ids = (await db.select({ id: students.id }).from(students).where(eq(students.muhaffizId, data.muhaffizId))).map(
        (s) => s.id,
      )
    }
    const plans = await plansFor(ids)
    const today = todayIso()
    // Only lessons that are due (debts or today's lesson) — "mark all" never pushes anyone ahead.
    const dayIds = ids
      .map((id) => currentLesson(plans.get(id) ?? []))
      .filter((d): d is PlanRow => !!d && d.date <= today)
      .map((d) => d.id)
    if (dayIds.length) {
      await db.update(planDays).set({ status: 'done', updatedAt: new Date() }).where(inArray(planDays.id, dayIds))
    }
    return { count: dayIds.length }
  })

/** Manual trigger of the same logic the 4 PM scheduled function runs. */
export const runDebtCheck = createServerFn({ method: 'POST' }).handler(async () => {
  return markUngradedDaysAsDebt()
})
