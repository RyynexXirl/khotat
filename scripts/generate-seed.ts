/**
 * Generates the demo-data SQL that replaces the demo plans with first-semester plans
 * (1448/03/17 → 1448/07/14). Groups, محفظون and students from the first seed are kept.
 *
 * Usage: node scripts/generate-seed.ts > netlify/database/migrations/<migration>/migration.sql
 *
 * In the real app plans are written by hand by the محفظ or the Sheikh; this script only fills
 * the demo students' plans so the dashboards have something to show.
 */
import type { DayStatus } from '../src/lib/plan.ts'
import { LESSON_DAYS } from '../src/lib/semester.ts'

const SEED_TODAY = '2026-11-08' // lessons before this get realistic progress

const SURAHS: Array<[string, number]> = [
  ['المجادلة', 22], ['الحشر', 24], ['الممتحنة', 13], ['الصف', 14], ['الجمعة', 11],
  ['المنافقون', 11], ['التغابن', 18], ['الطلاق', 12], ['التحريم', 12], ['الملك', 30],
  ['القلم', 52], ['الحاقة', 52], ['المعارج', 44], ['نوح', 28], ['الجن', 28],
  ['المزمل', 20], ['المدثر', 56], ['القيامة', 40], ['الإنسان', 31], ['المرسلات', 50],
  ['النبأ', 40], ['النازعات', 46], ['عبس', 42], ['التكوير', 29], ['الانفطار', 19],
  ['المطففين', 36], ['الانشقاق', 25], ['البروج', 22], ['الطارق', 17], ['الأعلى', 19],
  ['الغاشية', 26], ['الفجر', 30], ['البلد', 20], ['الشمس', 15], ['الليل', 21],
  ['الضحى', 11], ['الشرح', 8], ['التين', 8], ['العلق', 19], ['القدر', 5],
  ['البينة', 8], ['الزلزلة', 8], ['العاديات', 11], ['القارعة', 11], ['التكاثر', 8],
  ['العصر', 3], ['الهمزة', 9], ['الفيل', 5], ['قريش', 4], ['الماعون', 7],
  ['الكوثر', 3], ['الكافرون', 6], ['النصر', 3], ['المسد', 5], ['الإخلاص', 4],
  ['الفلق', 5], ['الناس', 6],
]

/** Starting surah index for each group (student ids 1–5, 6–10, 11–15). */
const GROUP_START = [0, 9, 20]
const AYAT_PER_DAY = [5, 6, 4]
/** How many due lessons each student is behind (negative = ahead of schedule). */
const BEHIND = [0, 2, 0, 4, -1, 1, 0, 3, 0, 0, 0, 5, 1, 0, -1]

function fmt(surah: number, from: number, to: number): string {
  const [name, total] = SURAHS[surah]
  if (from === 1 && to === total) return `سورة ${name} كاملة`
  return `سورة ${name} (${from}–${to})`
}

function planTexts(startSurah: number, perDay: number) {
  let surah = startSurah
  let ayah = 1
  const segments: Array<{ surah: number; from: number; to: number }> = []
  return LESSON_DAYS.map(() => {
    let text = 'تثبيت ما سبق حفظه'
    if (surah < SURAHS.length) {
      const total = SURAHS[surah][1]
      const to = Math.min(ayah + perDay - 1, total)
      segments.push({ surah, from: ayah, to })
      text = fmt(surah, ayah, to)
      if (to >= total) {
        surah += 1
        ayah = 1
      } else ayah = to + 1
    }
    const prev = segments.slice(Math.max(0, segments.length - 3), segments.length - 1)
    let review = 'سورة الفاتحة وقصار السور'
    if (prev.length === 2 && prev[0].surah === prev[1].surah) review = fmt(prev[0].surah, prev[0].from, prev[1].to)
    else if (prev.length) review = prev.map((s) => fmt(s.surah, s.from, s.to)).join(' + ')
    return { newMemorization: text, review }
  })
}

const q = (v: string) => `'${v.replace(/'/g, "''")}'`
const due = LESSON_DAYS.filter((d) => d.date < SEED_TODAY).length
const rows: string[] = []

for (let studentId = 1; studentId <= 15; studentId++) {
  const g = Math.floor((studentId - 1) / 5)
  const si = (studentId - 1) % 5
  const texts = planTexts(Math.min(GROUP_START[g] + (si % 2), SURAHS.length - 1), AYAT_PER_DAY[g] + (si % 2))
  const doneCount = due - BEHIND[studentId - 1]
  LESSON_DAYS.forEach((d, i) => {
    let status: DayStatus = 'pending'
    if (i < doneCount) status = 'done'
    else if (d.date < SEED_TODAY) status = i === doneCount && studentId % 2 === 0 ? 'missed' : 'debt'
    rows.push(
      `(${studentId}, ${i + 1}, ${q(d.date)}, ${q(texts[i].newMemorization)}, ${q(texts[i].review)}, ${q(status)})`,
    )
  })
}

const out = [
  `DELETE FROM "plan_days";`,
  `INSERT INTO "plan_days" ("student_id", "day_number", "date", "new_memorization", "review", "status") VALUES\n${rows.join(',\n')};`,
]
console.log(out.join('\n--> statement-breakpoint\n'))
