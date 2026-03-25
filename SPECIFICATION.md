# Chatterbox TTS Web — Node.js/React Conversion Specification

## 1. Overview

This document specifies the complete conversion of the Chatterbox TTS Server web application from a Python/FastAPI backend with vanilla HTML/CSS/JS frontend to a modern **Node.js/TypeScript/React** application using **TanStack Start**.

The Python TTS engine (PyTorch, chatterbox-tts, librosa) **cannot** be ported to Node.js. The Node.js application acts as the web frontend and API orchestrator, proxying TTS synthesis requests to a running Python backend process.

The original Python application is preserved in full in a `python-server/` subdirectory for historical reference.

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **TanStack Start** (full-stack React on Vinxi/Nitro/H3) |
| Language | **TypeScript** (strict mode) |
| Routing | **TanStack Router** (file-based, type-safe) |
| Styling | **Tailwind CSS v4** |
| UI Components | **shadcn/ui** (built on Radix UI primitives) |
| Icons | **Lucide React** |
| Audio | **WaveSurfer.js** |
| Config | **YAML** (js-yaml) — preserves compatibility with existing config.yaml |
| Validation | **Zod** schemas (replaces Pydantic) |
| HTTP Client | **fetch** (native) for Python backend proxy |
| State | React hooks + TanStack Router loader data + React Context (theme) |
| Toasts | **sonner** (shadcn/ui default toast library) |
| Package Manager | **npm** |
| Linting | **ESLint** with TypeScript support |
| Testing | **Vitest** (unit/integration), **Playwright** (E2E) |

## 3. Architecture

```
┌─────────────────────────────────────┐
│         Browser (React SPA)         │
│  TanStack Router + shadcn/ui + WS   │
└──────────────┬──────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────┐
│     TanStack Start (Node.js)        │
│  Vinxi dev server / Nitro prod      │
│  - Server Functions (RPC)           │
│  - API Routes (/api/*)              │
│  - Static file serving              │
│  - Config management (YAML)         │
│  - File upload handling             │
└──────────────┬──────────────────────┘
               │ HTTP proxy
┌──────────────▼──────────────────────┐
│     Python TTS Engine               │
│  FastAPI (minimal, engine-only)     │
│  - POST /synthesize                 │
│  - GET  /model-info                 │
│  - POST /reload-model               │
│  - GET  /health                     │
│  (PyTorch, chatterbox-tts, librosa) │
└─────────────────────────────────────┘
```

### 3.1 Python Backend (Minimal Engine Server)

The existing Python server is stripped down to a minimal FastAPI service exposing only the TTS engine:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/synthesize` | POST | Generate audio from text + params, returns audio bytes |
| `/model-info` | GET | Return current model status/info |
| `/reload-model` | POST | Hot-swap the TTS model |
| `/health` | GET | Health check |

All UI serving, config management, file uploads, presets, and state persistence move to the Node.js layer.

### 3.2 Node.js Server (TanStack Start)

Handles everything except raw TTS synthesis:
- Serves the React SPA
- Manages config.yaml (read/write/reset)
- Manages voice files and reference audio (upload, list, delete)
- Loads and serves presets from YAML
- Persists UI state
- Proxies TTS requests to the Python backend
- Handles audio post-processing (crossfade, stitching, encoding)
- Exposes OpenAI-compatible API endpoint

## 4. Directory Structure

```
chatterbox-tts-web/
├── app/                          # TanStack Start application
│   ├── client.tsx                # Client entry point
│   ├── router.tsx                # Router configuration
│   ├── routeTree.gen.ts          # Auto-generated route tree
│   ├── ssr.tsx                   # SSR entry point
│   ├── routes/
│   │   ├── __root.tsx            # Root layout (navbar, footer, theme, toasts)
│   │   └── index.tsx             # Main TTS page (home route)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── sonner.tsx        # Toast container
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── tooltip.tsx
│   │   ├── tts-form.tsx          # Main TTS generation form
│   │   ├── text-input.tsx        # Text area with character count
│   │   ├── voice-selector.tsx    # Voice mode tabs (predefined/clone)
│   │   ├── predefined-voices.tsx # Predefined voice dropdown + upload
│   │   ├── clone-voices.tsx      # Reference audio dropdown + upload
│   │   ├── generation-params.tsx # Sliders: temperature, exaggeration, cfg, speed
│   │   ├── model-selector.tsx    # Model dropdown + apply/restart
│   │   ├── model-badge.tsx       # Navbar model status badge
│   │   ├── language-select.tsx   # Language dropdown (multilingual model)
│   │   ├── paralinguistic-tags.tsx # Tag insertion buttons (turbo model)
│   │   ├── preset-buttons.tsx    # Preset selection buttons
│   │   ├── output-format.tsx     # WAV/MP3/Opus selector
│   │   ├── chunk-controls.tsx    # Split text toggle + chunk size slider
│   │   ├── audio-player.tsx      # WaveSurfer audio player
│   │   ├── config-panel.tsx      # Server configuration panel
│   │   ├── gen-defaults-panel.tsx # Generation defaults save panel
│   │   ├── navbar.tsx            # Top navigation bar
│   │   ├── footer.tsx            # Footer with GitHub link
│   │   ├── theme-toggle.tsx      # Dark/light mode toggle
│   │   ├── loading-overlay.tsx   # Generation loading overlay
│   │   ├── chunk-warning-modal.tsx
│   │   ├── generation-warning-modal.tsx
│   │   └── tips-section.tsx      # Tips & tricks card
│   ├── hooks/
│   │   ├── use-tts-generation.ts # TTS generation logic + state
│   │   ├── use-theme.tsx         # Theme context + hook
│   │   ├── use-ui-state.ts       # Debounced UI state persistence
│   │   ├── use-model-info.ts     # Model info polling/state
│   │   └── use-wavesurfer.ts     # WaveSurfer instance management
│   ├── lib/
│   │   ├── api-client.ts         # Typed fetch wrapper for server functions
│   │   ├── config.ts             # Config types and helpers
│   │   ├── constants.ts          # Languages, tags, defaults
│   │   ├── schemas.ts            # Zod validation schemas
│   │   ├── types.ts              # TypeScript interfaces/types
│   │   └── utils.ts              # Client-side utility functions
│   ├── server/
│   │   ├── config-manager.ts     # YAML config read/write (server-only)
│   │   ├── file-manager.ts       # Voice/reference file operations
│   │   ├── preset-loader.ts      # YAML preset loading
│   │   ├── tts-proxy.ts          # Proxy requests to Python engine
│   │   ├── audio-processing.ts   # Audio stitching, crossfade, encoding
│   │   └── functions/
│   │       ├── get-initial-data.ts
│   │       ├── get-model-info.ts
│   │       ├── save-settings.ts
│   │       ├── reset-settings.ts
│   │       ├── restart-server.ts
│   │       ├── get-voices.ts
│   │       ├── get-reference-files.ts
│   │       ├── upload-files.ts
│   │       └── generate-tts.ts
│   └── styles/
│       └── globals.css           # Tailwind imports + CSS custom properties
├── api/                          # Nitro API routes (H3 handlers)
│   └── v1/
│       └── audio/
│           └── speech.ts         # OpenAI-compatible endpoint
├── public/                       # Static assets
│   └── favicon.ico
├── voices/                       # Predefined voice .wav files
├── reference_audio/              # User-uploaded reference audio
├── outputs/                      # Generated audio output
├── logs/                         # Server logs
├── presets.yaml                  # TTS presets
├── config.yaml                   # Runtime configuration
├── python-server/                # Original Python application (preserved)
│   ├── server.py
│   ├── engine.py
│   ├── config.py
│   ├── models.py
│   ├── utils.py
│   ├── download_model.py
│   ├── start.py
│   ├── requirements.txt
│   ├── requirements-nvidia.txt
│   ├── requirements-nvidia-cu128.txt
│   ├── requirements-rocm.txt
│   ├── Dockerfile
│   ├── Dockerfile.cu128
│   ├── Dockerfile.rocm
│   ├── docker-compose.yml
│   ├── docker-compose-cpu.yml
│   ├── docker-compose-cu128.yml
│   ├── docker-compose-rocm.yml
│   ├── start.sh
│   ├── start.bat
│   ├── Chatterbox_TTS_Colab_Demo.ipynb
│   ├── documentation.md
│   └── ui/
│       ├── index.html
│       ├── script.js
│       ├── styles.css
│       ├── presets.yaml
│       └── vendor/
│           └── wavesurfer.min.js
├── _docs/                        # Additional documentation
├── app.config.ts                 # TanStack Start / Vinxi config
├── package.json
├── tsconfig.json
├── eslint.config.js              # ESLint configuration
├── vitest.config.ts              # Vitest configuration
├── playwright.config.ts          # Playwright E2E config
├── components.json               # shadcn/ui configuration
├── SPECIFICATION.md              # This file
├── TODO.md                       # Implementation tracking
├── INSTRUCTIONS.md               # Operating instructions (sacred)
├── README.md                     # Developer documentation
└── .gitignore
```

## 5. Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/routes/index.tsx` | Main TTS interface (single-page app) |

The application is a single-page interface. The root layout (`__root.tsx`) provides the navbar, footer, theme provider, and toast container. The index route renders the full TTS form, audio player, and configuration panels.

### 5.1 Route Loader

The index route uses a TanStack Router `loader` to fetch initial data server-side:

```typescript
export const Route = createFileRoute('/')({
  loader: async () => {
    return await getInitialData()
  },
  component: HomePage,
})
```

This replaces the client-side `fetchInitialData()` call in the original `script.js`.

## 6. API Routes (Nitro/H3)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/audio/speech` | POST | OpenAI-compatible TTS endpoint |

## 7. Server Functions

TanStack Start server functions provide type-safe RPC between client and server:

| Function | Description |
|----------|-------------|
| `getInitialData()` | Returns config, voices, presets, model info |
| `getModelInfo()` | Returns current model status |
| `saveSettings(partial)` | Merges partial config update into config.yaml |
| `resetSettings()` | Resets config.yaml to defaults |
| `restartServer()` | Triggers Python engine model hot-swap |
| `getPredefinedVoices()` | Lists predefined voice files |
| `getReferenceFiles()` | Lists reference audio files |
| `uploadReferenceFiles(formData)` | Uploads reference audio for cloning |
| `uploadPredefinedVoice(formData)` | Uploads predefined voice files |
| `generateTts(params)` | Proxies TTS request to Python, returns audio |

## 8. Component Hierarchy

```
<RootLayout>                     ← __root.tsx
  <ThemeProvider>
    <Navbar>
      <AppTitle />
      <ModelBadge />
      <ThemeToggle />
    </Navbar>

    <Outlet />                   ← Router outlet

    <Footer />
    <Toaster />                  ← sonner toast container
    <LoadingOverlay />
    <ChunkWarningModal />
    <GenerationWarningModal />
  </ThemeProvider>
</RootLayout>

<HomePage>                       ← index.tsx
  <Card>
    <TTSForm>
      <ModelSelector />
      <TextInput />
      <ParalinguisticTags />     ← turbo only
      <GenerateButton />
      <ChunkControls />
      <VoiceSelector>
        <PredefinedVoices />
        <CloneVoices />
      </VoiceSelector>
      <PresetButtons />
      <Collapsible title="Generation Parameters">
        <GenerationParams />
        <SeedInput />
        <LanguageSelect />       ← multilingual only
        <OutputFormat />
        <SaveGenDefaultsButton />
      </Collapsible>
      <Collapsible title="Server Configuration">
        <ConfigPanel />
        <SaveConfigButton />
        <RestartServerButton />
      </Collapsible>
      <ResetSettingsButton />
    </TTSForm>
  </Card>

  <AudioPlayer />
  <TipsSection />
</HomePage>
```

## 9. State Management

### 9.1 Server State (via Route Loaders)
- Initial data (config, voices, presets, model info) loaded in route loader
- Refreshed via `router.invalidate()` or direct server function calls

### 9.2 Client State (React hooks)
- **`useTtsGeneration`**: Form state, generation in progress, audio result
- **`useTheme`**: Dark/light mode (React Context + localStorage)
- **`useUiState`**: Debounced persistence of UI state to server (750ms)
- **`useModelInfo`**: Current model info, pending changes state
- **`useWaveSurfer`**: WaveSurfer instance lifecycle

### 9.3 Form State
```typescript
interface TTSFormState {
  text: string
  voiceMode: 'predefined' | 'clone'
  predefinedVoiceId: string | null
  referenceAudioFilename: string | null
  temperature: number
  exaggeration: number
  cfgWeight: number
  speedFactor: number
  seed: number
  language: string
  outputFormat: 'wav' | 'mp3' | 'opus'
  splitText: boolean
  chunkSize: number
}
```

## 10. Configuration System

### 10.1 Config Structure (config.yaml)
Backward-compatible with the existing config.yaml format, plus a new `python_engine_url` field:

```yaml
server:
  host: "0.0.0.0"
  port: 8004
  python_engine_url: "http://localhost:8005"
  log_file_path: "logs/tts_server.log"
  log_file_max_size_mb: 10
  log_file_backup_count: 5

model:
  repo_id: "chatterbox-turbo"

tts_engine:
  device: "auto"
  predefined_voices_path: "voices"
  reference_audio_path: "reference_audio"
  default_voice_id: "Emily.wav"

paths:
  model_cache: "model_cache"
  output: "outputs"

generation_defaults:
  temperature: 0.8
  exaggeration: 0.5
  cfg_weight: 0.5
  seed: 0
  speed_factor: 1.0
  language: "en"

audio_output:
  format: "wav"
  sample_rate: 24000
  max_reference_duration_sec: 30
  save_to_disk: false

audio_processing:
  enable_crossfade: true
  enable_silence_trimming: false
  enable_internal_silence_fix: false
  enable_unvoiced_removal: false

ui_state:
  last_text: ""
  last_voice_mode: "predefined"
  last_predefined_voice: "Emily.wav"
  last_reference_file: ""
  last_seed: 0
  last_chunk_size: 240
  last_split_text_enabled: true
  theme: "dark"
  last_preset_name: ""
  hide_chunk_warning: false
  hide_generation_warning: false

ui:
  title: "Chatterbox TTS Server"
  show_language_select: true
  max_predefined_voices_in_dropdown: 50
```

### 10.2 ConfigManager (Server-Side)
TypeScript singleton class mirroring the Python `YamlConfigManager`:
- Thread-safe YAML read/write
- Deep merge for partial updates
- Reset to defaults
- Type-safe getters

## 11. Theme System

Uses Tailwind CSS dark mode with class strategy:
- `<html class="dark">` or `<html class="light">`
- ThemeProvider React Context + localStorage persistence
- Debounced save to server `ui_state.theme`
- shadcn/ui components auto-respect dark class via CSS variables

## 12. Audio Player

WaveSurfer.js integration via `useWaveSurfer` custom hook:
- Instance creation/destruction lifecycle
- Theme-aware waveform colors
- Play/pause state management
- Duration display
- Blob URL lifecycle (create/revoke)
- Error handling

AudioPlayer component renders: waveform, play/pause button, download link, metadata (voice mode, gen time, duration).

## 13. Notifications

Uses **sonner** toast library (shadcn/ui default):
```typescript
toast.success('Audio generated successfully!')
toast.error('TTS generation failed.')
toast.info('Preset loaded.')
toast.warning('Speed factor away from 1.0 is experimental.')
```

## 14. Modals

Uses shadcn/ui `<Dialog>` (Radix AlertDialog):
1. **Chunk Warning Modal** — "Don't show again" checkbox → persisted in ui_state
2. **Generation Quality Warning** — "Don't show again" checkbox → persisted in ui_state

## 15. Key Behavioral Requirements

### 15.1 Model-Specific UI
- **Turbo**: Show paralinguistic tag buttons, hide exaggeration/cfg sliders
- **Multilingual**: Show language dropdown with 23 languages
- **Original**: Show all standard sliders, hide tags and language

### 15.2 Preset Filtering
- Presets with names starting with "Turbo" hidden for non-turbo models
- Active preset visually highlighted
- Preset selection loads text + all generation parameters

### 15.3 UI State Persistence
- Debounced (750ms) save of form state to server on any change
- Restored on page load via route loader
- Includes: text, voice mode, selected voice, seed, chunk settings, theme, warnings dismissed

### 15.4 Voice File Management
- Upload via file input (multiple files, .wav/.mp3)
- Server validates file format and duration
- Lists refresh after upload
- Selected voice preserved across refreshes

### 15.5 TTS Generation Flow
1. Validate form (text not empty, voice selected)
2. Show generation warning modal (if not dismissed)
3. Show chunk warning modal (if applicable and not dismissed)
4. Show loading overlay
5. POST to server function with all parameters
6. Server: resolve voice path, split text if needed
7. For each chunk: POST to Python `/synthesize`
8. Apply speed factor, stitch chunks with crossfade
9. Encode to requested format (WAV/MP3/Opus)
10. Return audio bytes to client
11. Create blob URL, initialize WaveSurfer player
12. Hide loading overlay, show success toast

### 15.6 OpenAI-Compatible API
`POST /api/v1/audio/speech` accepts:
```json
{
  "model": "chatterbox-turbo",
  "input": "Hello world",
  "voice": "Emily.wav",
  "response_format": "wav",
  "speed": 1.0,
  "seed": 0
}
```
Returns streaming audio response via H3/Nitro API route.

## 16. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Node.js server port | `8004` |
| `PYTHON_ENGINE_URL` | Python TTS engine URL | `http://localhost:8005` |
| `CONFIG_PATH` | Path to config.yaml | `./config.yaml` |
| `NODE_ENV` | Environment | `development` |

## 17. Development Workflow

```bash
# Terminal 1: Python TTS engine
cd python-server && python server.py --port 8005

# Terminal 2: Node.js frontend
npm run dev
```

Production:
```bash
npm run build
npm run start
```

## 18. Testing Strategy

| Type | Tool | Scope |
|------|------|-------|
| Unit | Vitest | Server functions, config manager, utils, schemas |
| Integration | Vitest | Server function → Python proxy flow |
| Component | Vitest + Testing Library | React components |
| E2E | Playwright | Full user flows (generation, config, uploads) |
