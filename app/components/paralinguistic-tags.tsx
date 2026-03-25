import { PARALINGUISTIC_TAGS } from '~/lib/constants'

interface ParalinguisticTagsProps {
  visible: boolean
  onInsertTag: (tag: string) => void
}

export function ParalinguisticTags({ visible, onInsertTag }: ParalinguisticTagsProps) {
  if (!visible) return null

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">Insert Tag:</span>
        {PARALINGUISTIC_TAGS.map((item) => (
          <button
            key={item.tag}
            type="button"
            onClick={() => onInsertTag(item.tag)}
            title={`Insert ${item.tag} tag`}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Click a tag to insert it at your cursor position. Tags produce natural vocal reactions in the generated audio.
      </p>
    </div>
  )
}
