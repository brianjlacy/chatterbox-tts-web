import { LANGUAGES_MULTILINGUAL, LANGUAGES_ENGLISH_ONLY } from '~/lib/constants'
import type { ModelType } from '~/lib/types'

interface LanguageSelectProps {
  language: string
  modelType: ModelType | null
  onChange: (language: string) => void
}

export function LanguageSelect({ language, modelType, onChange }: LanguageSelectProps) {
  const isMultilingual = modelType === 'multilingual'
  const languages = isMultilingual ? LANGUAGES_MULTILINGUAL : LANGUAGES_ENGLISH_ONLY

  // Hide entirely for non-multilingual models
  if (!isMultilingual) return null

  return (
    <div className="space-y-1">
      <label htmlFor="language" className="text-sm font-medium text-foreground">Language</label>
      <select
        id="language"
        value={language}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>{lang.name}</option>
        ))}
      </select>
    </div>
  )
}
