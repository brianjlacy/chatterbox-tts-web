import type { ModelInfo } from '~/lib/types'
import { cn } from '~/lib/utils'

interface ModelBadgeProps {
  modelInfo: ModelInfo | null
}

export function ModelBadge({ modelInfo }: ModelBadgeProps) {
  if (!modelInfo) return null

  const badgeConfig = {
    turbo: {
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      label: '⚡ Turbo',
    },
    multilingual: {
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      label: '🌍 Multilingual',
    },
    original: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      label: 'Original',
    },
  }

  const config = badgeConfig[modelInfo.type] ?? badgeConfig.original

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      config.className,
    )}>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          modelInfo.loaded ? 'bg-green-500' : 'bg-red-500',
        )}
      />
      {config.label}
    </span>
  )
}
