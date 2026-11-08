import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { PREFS_BOOT_SCRIPT, PrefsProvider, usePrefs } from '@/lib/i18n'
import { HALAQA_NAME } from '@/lib/semester'

import '../styles.css'

const siteName = `${HALAQA_NAME} — متابعة الحفظ`
const siteDescription = 'متابعة خطط حفظ القرآن الكريم للطلاب والمحفظين'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      { name: 'theme-color', content: '#1d4a40' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap',
      },
    ],
    scripts: [{ children: PREFS_BOOT_SCRIPT }],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PrefsProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <ThemedToaster />
        </PrefsProvider>
        <Scripts />
      </body>
    </html>
  )
}

function ThemedToaster() {
  const { theme } = usePrefs()
  return <Toaster position="top-center" dir="rtl" theme={theme} richColors />
}
