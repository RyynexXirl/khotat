import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useSession, type Role, type Session } from '@/lib/session'
import { BrandMark } from './brand'

/** Renders children only for a signed-in user with one of the allowed roles. */
export function RequireRole({ roles, children }: { roles: Role[]; children: (s: Session) => React.ReactNode }) {
  const { ready, session } = useSession()
  const navigate = useNavigate()
  const allowed = !!session && roles.includes(session.role)
  useEffect(() => {
    if (ready && !allowed) void navigate({ to: '/' })
  }, [ready, allowed, navigate])
  if (!ready || !allowed || !session) return <FullPageLoader />
  return <>{children(session)}</>
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <BrandMark className="size-14 animate-pulse text-primary" />
    </div>
  )
}
