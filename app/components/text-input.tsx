interface TextInputProps {
  value: string
  onChange: (value: string) => void
  textareaRef?: React.Ref<HTMLTextAreaElement>
}

export function TextInput({ value, onChange, textareaRef }: TextInputProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="text" className="text-sm font-medium text-foreground">
        Text to synthesize
      </label>
      <p className="text-xs text-muted-foreground">
        Enter the text you want to convert to speech. For audiobooks, you can paste long chapters.
      </p>
      <div className="relative">
        <textarea
          id="text"
          ref={textareaRef}
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter text here..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          required
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground tabular-nums">
          {value.length} Characters
        </div>
      </div>
    </div>
  )
}
