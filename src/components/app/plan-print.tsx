import { usePrefs, weekdayName, type Messages } from '@/lib/i18n'
import { parseAssignment } from '@/lib/names'
import { DAY_STATUSES, type DayStatus } from '@/lib/plan'
import { hijriLabel, SEMESTER, SEMESTER_DAYS, type SemesterWeek } from '@/lib/semester'
import type { PlanDay } from './plan-view'

/**
 * Landscape, print-ready replica of the official plan sheet (study_plan_template):
 * two side-by-side weekly tables (weeks 2–9 | 10–17) with الجديد/المراجعة columns,
 * auto-filled with the student's dates, surahs, from/to and grades.
 * Rendered only while printing; the browser's "Save as PDF" produces the file.
 */
export function PlanPrint({
  studentName,
  days,
}: {
  studentName: string
  groupName: string
  subgroup?: string | null
  supervisor: string
  days: PlanDay[]
}) {
  const { t } = usePrefs()
  const byDate = new Map(days.map((d) => [d.date, d]))

  // «بداية الحفظ»: where the student's memorization starts (first assigned lesson).
  const first = SEMESTER_DAYS.map((sd) => byDate.get(sd.date)).find((d) => d?.newMemorization.trim())
  const start = first ? formatStart(first.newMemorization) : ''

  const left = SEMESTER.filter((w) => w.number <= 9)
  const right = SEMESTER.filter((w) => w.number >= 10)

  return (
    <div className="print-root" dir="rtl">
      <style>{'@page { size: A4 landscape; margin: 5mm; }'}</style>
      <div className="print-header">
        <div className="print-title">{t.printSemesterLine}</div>
        <div className="print-student">
          <span>
            {t.studentName} / <strong>{studentName}</strong>
          </span>
          <span>
            {t.memStart} / <strong>{start || '………………'}</strong>
          </span>
        </div>
      </div>
      <div className="print-weeks">
        <WeekTable weeks={left} byDate={byDate} t={t} />
        <WeekTable weeks={right} byDate={byDate} t={t} />
      </div>
    </div>
  )
}

/** «سورة الحشر (21–24)» → «سورة الحشر من 21» for the بداية الحفظ field. */
function formatStart(text: string): string {
  const p = parseAssignment(text)
  if (!p.surah) return ''
  return p.from ? `${p.surah} من ${p.from}` : p.surah
}

function WeekTable({
  weeks,
  byDate,
  t,
}: {
  weeks: SemesterWeek[]
  byDate: Map<string, PlanDay>
  t: Messages
}) {
  return (
    <table>
      <colgroup>
        <col style={{ width: '8.5%' }} />
        <col style={{ width: '9.5%' }} />
        <col style={{ width: '7.5%' }} />
        <col style={{ width: '19%' }} />
        <col style={{ width: '5.5%' }} />
        <col style={{ width: '5.5%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '19.5%' }} />
        <col style={{ width: '5.5%' }} />
        <col style={{ width: '5.5%' }} />
        <col style={{ width: '7%' }} />
      </colgroup>
      <thead>
        <tr>
          <th rowSpan={2}>{t.weekCol}</th>
          <th rowSpan={2}>{t.day}</th>
          <th rowSpan={2}>{t.date}</th>
          <th colSpan={3}>{t.printNewMem}</th>
          <th rowSpan={2}>{t.printGrade}</th>
          <th colSpan={3}>{t.printReview}</th>
          <th rowSpan={2}>{t.printGrade}</th>
        </tr>
        <tr>
          <th>{t.printSurah}</th>
          <th>{t.printFrom}</th>
          <th>{t.printTo}</th>
          <th>{t.printSurah}</th>
          <th>{t.printFrom}</th>
          <th>{t.printTo}</th>
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) =>
          week.vacation ? (
            <tr key={week.number}>
              <td className="week-cell">{t.weekOrdinal(week.number)}</td>
              <td className="event-cell" colSpan={10}>
                {t.vacation}
              </td>
            </tr>
          ) : (
            week.days.map((sd, i) => {
              const day = byDate.get(sd.date)
              const nm = parseAssignment(day?.newMemorization ?? '')
              const rv = parseAssignment(day?.review ?? '')
              const status = (
                DAY_STATUSES.includes(day?.status as DayStatus) ? day?.status : 'pending'
              ) as DayStatus
              const grade = sd.event || status === 'pending' ? '' : t.status[status]
              return (
                <tr key={sd.date}>
                  {i === 0 && (
                    <td className="week-cell" rowSpan={week.days.length}>
                      {t.weekOrdinal(week.number)}
                    </td>
                  )}
                  <td className="day-cell">{weekdayName(t, sd.date)}</td>
                  <td className="date-cell">{hijriLabel(sd.date)}</td>
                  {sd.event ? (
                    <td className="event-cell" colSpan={8}>
                      {t.event[sd.event]}
                    </td>
                  ) : (
                    <>
                      <td>{nm.surah}</td>
                      <td>{nm.from}</td>
                      <td>{nm.to}</td>
                      <td className="grade-cell">{grade}</td>
                      <td>{rv.surah}</td>
                      <td>{rv.from}</td>
                      <td>{rv.to}</td>
                      <td className="grade-cell">{grade}</td>
                    </>
                  )}
                </tr>
              )
            })
          ),
        )}
      </tbody>
    </table>
  )
}
