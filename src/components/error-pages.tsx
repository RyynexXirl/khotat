import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main dir="rtl" className="grid min-h-svh place-items-center px-6 py-16">
      <div className="max-w-md space-y-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          الصفحة غير موجودة
        </h1>
        <p className="text-muted-foreground">
          هذه الصفحة غير موجودة. تحقق من العنوان أو عد إلى الصفحة الرئيسية.
        </p>
        <Button asChild>
          <Link to="/">الصفحة الرئيسية</Link>
        </Button>
      </div>
    </main>
  )
}

export function RouteErrorPage({ reset }: ErrorComponentProps) {
  const router = useRouter()

  return (
    <main dir="rtl" className="grid min-h-svh place-items-center px-6 py-16">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          تعذر تحميل الصفحة
        </h1>
        <p role="alert" className="text-muted-foreground">
          حاول مرة أخرى أو عد إلى الصفحة الرئيسية.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => {
              void router.invalidate()
              reset()
            }}
          >
            إعادة المحاولة
          </Button>
          <Button variant="outline" asChild>
            <a href="/">الصفحة الرئيسية</a>
          </Button>
        </div>
      </div>
    </main>
  )
}
