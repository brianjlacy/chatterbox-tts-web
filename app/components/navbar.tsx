import { Link } from '@tanstack/react-router'
import { ThemeToggle } from './theme-toggle'
import { ModelBadge } from './model-badge'
import type { ModelInfo } from '~/lib/types'

interface NavbarProps {
  title?: string
  modelInfo?: ModelInfo | null
}

export function Navbar({ title = 'Chatterbox TTS Server', modelInfo = null }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-lg font-semibold text-foreground hover:text-foreground/80">
            {title}
          </Link>
          <ModelBadge modelInfo={modelInfo} />
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            API Docs
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
