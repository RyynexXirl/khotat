/** Sub-groups within the الأجاويد group. */
export const AJAWID = 'الأجاويد'
export const SUBGROUPS = ['الصناديد', 'الرعود', 'الكواسر'] as const

/**
 * Format a registered name as "X بن Y Z": if the student typed three or more
 * words without "بن"/"ابن", insert «بن» after the first name.
 */
export function formatStudentName(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 3 && !parts.includes('بن') && !parts.includes('ابن') && !parts.includes('بنت')) {
    return [parts[0], 'بن', ...parts.slice(1)].join(' ')
  }
  return parts.join(' ')
}

export interface AssignmentParts {
  from: string
  to: string
  surah: string
}

/**
 * Split a plan text like «سورة الحشر (21–24) + سورة الممتحنة (1–4)» into
 * from / to / surah columns for the printed plan. Unparseable text goes into surah.
 */
export function parseAssignment(text: string): AssignmentParts {
  const matches = [...text.matchAll(/سورة\s+([^()+]+?)\s*\((\d+)\s*[–—-]\s*(\d+)\s*\)/g)]
  if (!matches.length) return { from: '', to: '', surah: text.trim() }
  const surahs = [...new Set(matches.map((m) => m[1].trim()))]
  return { from: matches[0][2], to: matches[matches.length - 1][3], surah: surahs.join(' + ') }
}
