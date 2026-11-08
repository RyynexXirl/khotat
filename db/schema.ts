import { pgTable, serial, text, integer, date, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'

/** Key/value app settings (e.g. the Sheikh's password, key "sheikh_password"). */
export const settings = pgTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(),
})

export const groups = pgTable('groups', {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
})

export const supervisors = pgTable('supervisors', {
  id: serial().primaryKey(),
  name: text().notNull(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id),
  password: text().notNull().default('1234'),
})

/** المحفظون: individual teachers the Sheikh assigns specific students to. */
export const muhaffizeen = pgTable('muhaffizeen', {
  id: serial().primaryKey(),
  name: text().notNull(),
  phone: text().notNull().default(''),
  password: text().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const students = pgTable('students', {
  id: serial().primaryKey(),
  name: text().notNull(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id),
  /** Sub-group within الأجاويد: الصناديد / الرعود / الكواسر */
  subgroup: text(),
  phone: text().notNull().default(''),
  password: text().notNull().default('1234'),
  muhaffizId: integer('muhaffiz_id').references(() => muhaffizeen.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
})

/**
 * One row per student per semester lesson day (see src/lib/semester.ts).
 * status: pending | done | missed | debt
 * Lessons are recited strictly in day_number order; "debt" is set automatically by the
 * daily 4 PM scheduled function for lessons not recited by their day.
 */
export const planDays = pgTable(
  'plan_days',
  {
    id: serial().primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    newMemorization: text('new_memorization').notNull().default(''),
    review: text('review').notNull().default(''),
    status: text('status').notNull().default('pending'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    uniqueIndex('plan_days_student_day_idx').on(t.studentId, t.dayNumber),
    index('plan_days_date_idx').on(t.date),
    index('plan_days_status_idx').on(t.status),
  ],
)
