import {
  HeadContent,
  Outlet,
  Scripts,
  ScrollRestoration,
  createRootRoute,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { ThemeProvider } from '~/hooks/use-theme'
import { Navbar } from '~/components/navbar'
import { Footer } from '~/components/footer'
import appCss from '~/styles/globals.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { title: 'Chatterbox TTS Server' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  )
}
