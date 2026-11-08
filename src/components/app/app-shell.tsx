import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/lib/i18n'
import { clearSession, type Session } from '@/lib/session'
import { BrandMark } from './brand'
import { ChangePasswordButton } from './change-password'

/** Light/dark toggle (shown on the patterned header bands). */
export function ThemeToggle({ className }: { className?: string }) {
  const { t, theme, toggleTheme } = usePrefs()
  const label = theme === 'dark' ? t.themeLight : t.themeDark
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn('text-inherit hover:bg-white/10 hover:text-inherit', className)}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}

export function AppShell({
  session,
  title,
  subtitle,
  actions,
  children,
}: {
  session: Session
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { t } = usePrefs()
  const who = session.role === 'sheikh' ? t.roles.sheikh : `${t.roles[session.role]} · ${session.name}`
  return (
    <div className="min-h-screen bg-background pattern-soft">
      <header className="pattern-stars">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <BrandMark className="size-9 shrink-0" />
            <span className="truncate font-display text-lg font-bold leading-none sm:text-xl">{t.appName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs sm:inline">{who}</span>
            <ChangePasswordButton session={session} />
            <ThemeToggle />
            <Button
              size="sm"
              variant="ghost"
              className="text-inherit hover:bg-white/10 hover:text-inherit"
              onClick={() => {
                clearSession()
                void navigate({ to: '/' })
              }}
            >
              <LogOut className="rotate-180" />
              {t.logout}
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-content px-4 pt-2 pb-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
          {subtitle && <div className="mt-1 text-sm opacity-80">{subtitle}</div>}
          {actions && <div className="hero-actions mt-4 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </header>
      <main className="mx-auto max-w-content px-4 py-6 pb-16">{children}</main>
    </div>
  )
}

export function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-center text-muted-foreground">{children}</div>
  )
}
