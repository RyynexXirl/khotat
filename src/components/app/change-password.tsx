import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePrefs } from '@/lib/i18n'
import type { Session } from '@/lib/session'
import { cn } from '@/lib/utils'
import { changePassword } from '@/server/api.functions'

/** Header key button + dialog letting any logged-in user change their own password. */
export function ChangePasswordButton({ session, className }: { session: Session; className?: string }) {
  const { t } = usePrefs()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={t.changePassword}
        title={t.changePassword}
        className={cn('text-inherit hover:bg-white/10 hover:text-inherit', className)}
      >
        <KeyRound />
      </Button>
      <ChangePasswordDialog session={session} open={open} onOpenChange={setOpen} />
    </>
  )
}

function ChangePasswordDialog({
  session,
  open,
  onOpenChange,
}: {
  session: Session
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = usePrefs()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (next !== confirm) return toast.error(t.errors.password_mismatch)
            setSaving(true)
            try {
              const res = await changePassword({
                data: { role: session.role, id: session.id, currentPassword: current, newPassword: next },
              })
              if (!res.ok) return toast.error(t.errors[res.error ?? ''] ?? t.changePasswordFailed)
              toast.success(t.passwordChanged)
              setCurrent('')
              setNext('')
              setConfirm('')
              onOpenChange(false)
            } catch {
              toast.error(t.changePasswordFailed)
            } finally {
              setSaving(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.changePassword}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>{t.currentPassword}</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>{t.newPassword}</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={4} required />
          </div>
          <div className="grid gap-2">
            <Label>{t.confirmPassword}</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={4} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
