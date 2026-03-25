# Chatterbox TTS Web

A modern web interface for the [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) text-to-speech engine, built with **TanStack Start**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui**.

## Architecture

The application uses a **proxy architecture**:

```
Browser (React SPA) → Node.js (TanStack Start) → Python TTS Engine (FastAPI)
```

- **Node.js frontend** handles UI, configuration, file management, and presets
- **Python backend** handles TTS synthesis via PyTorch/chatterbox-tts (required for ML inference)

The original Python application is fully preserved in the `python-server/` directory for reference.

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.10+ (for the TTS engine)
- NVIDIA GPU with CUDA (recommended) or CPU

### Development

```bash
# Terminal 1: Start the Python TTS engine
cd python-server
pip install -r requirements.txt
python server.py --port 8005

# Terminal 2: Start the Node.js frontend
npm install
npm run dev
```

The app will be available at `http://localhost:8004`.

### Production

```bash
npm run build
npm run start
```

## Project Structure

```
├── app/                    # TanStack Start application
│   ├── routes/             # File-based routes (__root.tsx, index.tsx)
│   ├── components/         # React components (TTS form, audio player, etc.)
│   ├── hooks/              # Custom React hooks (theme, TTS generation, WaveSurfer)
│   ├── lib/                # Types, Zod schemas, constants, utilities
│   ├── server/             # Server-side code
│   │   ├── functions/      # TanStack server functions (RPC)
│   │   ├── config-manager.ts
│   │   ├── file-manager.ts
│   │   ├── tts-proxy.ts
│   │   └── audio-processing.ts
│   └── styles/             # Tailwind CSS globals
├── python-server/          # Original Python application (preserved)
├── voices/                 # Predefined voice .wav files
├── reference_audio/        # User-uploaded reference audio
├── config.yaml             # Runtime configuration (YAML)
├── presets.yaml             # TTS presets (YAML)
├── vite.config.ts          # Vite + TanStack Start config
├── SPECIFICATION.md        # Full project specification
├── TODO.md                 # Implementation tracking
└── INSTRUCTIONS.md         # Operating procedures
```

## Features

- **Multiple TTS Models**: Chatterbox Original, Turbo (with paralinguistic tags), and Multilingual (23 languages)
- **Voice Cloning**: Upload reference audio for voice cloning
- **Predefined Voices**: Pre-built voice library with import/export
- **Audio Player**: WaveSurfer.js waveform visualization with play/pause/download
- **Text Chunking**: Automatic text splitting for long-form content (audiobooks, articles)
- **Audio Stitching**: Equal-power crossfade between chunks for seamless output
- **Presets**: Quick-load text + parameter combinations
- **Configuration**: In-app settings management with YAML persistence
- **Dark/Light Theme**: Full theme support with persistence
- **OpenAI-Compatible API**: `POST /api/v1/audio/speech` endpoint

## Configuration

Settings are stored in `config.yaml`. Key settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `server.port` | 8004 | Node.js server port |
| `server.python_engine_url` | `http://localhost:8005` | Python TTS engine URL |
| `model.repo_id` | `chatterbox-turbo` | Active TTS model |
| `generation_defaults.*` | Various | Default generation parameters |
| `audio_output.format` | `wav` | Default output format |

## Tech Stack

- **TanStack Start** — Full-stack React framework (Vite 7, Nitro)
- **React 19** — UI library
- **TypeScript 5.7** — Type safety (strict mode)
- **Tailwind CSS v4** — Utility-first styling
- **shadcn/ui + Radix UI** — Component primitives
- **WaveSurfer.js** — Audio waveform visualization
- **Zod** — Runtime validation
- **sonner** — Toast notifications
- **Vitest** — Unit/integration testing

## Testing

```bash
npm test          # Run unit tests
npm run lint      # Run ESLint
```

## License

See [LICENSE](LICENSE) for details.
