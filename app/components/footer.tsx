import { Github } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4">
        <a
          href="https://github.com/brianjlacy/chatterbox-tts-web"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="h-4 w-4" />
          <span>View Project on GitHub | Powered by TanStack Start</span>
        </a>
      </div>
    </footer>
  )
}
