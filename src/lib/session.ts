import { useEffect, useState } from 'react'

export type Role = 'sheikh' | 'supervisor' | 'muhaffiz' | 'student'
export interface Session {
  role: Role
  id: number
  name: string
}

const KEY = 'riyad-alhifz-session'

export function saveSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

/** Client-side session. `ready` is false until localStorage has been read (after hydration). */
export function useSession() {
  const [state, setState] = useState<{ ready: boolean; session: Session | null }>({ ready: false, session: null })
  useEffect(() => setState({ ready: true, session: readSession() }), [])
  return state
}

export const ROLE_HOME: Record<Role, string> = {
  sheikh: '/sheikh',
  supervisor: '/supervisor',
  muhaffiz: '/muhaffiz',
  student: '/student',
}

export const ROLE_LABEL: Record<Role, string> = {
  sheikh: 'الشيخ',
  supervisor: 'مشرف',
  muhaffiz: 'محفظ',
  student: 'طالب',
}
