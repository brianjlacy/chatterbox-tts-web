# Chatterbox TTS Web

A full-stack TTS (text-to-speech) application powered by the [Chatterbox](https://github.com/resemble-ai/chatterbox) neural TTS model. The web UI, server-side orchestration, and API all live in the TanStack Start app under `app/`. PyTorch model inference runs in a minimal Python microservice under `python-server/`.

---

## Architecture

```
Browser (React 19 UI)
  └─▶  TanStack Start app (Node.js, port 8004)
         └─▶  Python inference microservice (FastAPI + PyTorch, port 8005)
```

**The Node/TanStack layer owns everything except raw model inference:**

- Routing and page rendering (TanStack Router)
- React UI and form state
- Config reads and writes
- File management (voices, reference audio, output)
- Text chunking and per-chunk synthesis orchestration
- WAV decoding, audio stitching and crossfading
- Speed factor adjustment (SoundTouch pitch-preserving time-stretch)
- Silence post-processing
- Audio encoding (WAV, MP3)
- OpenAI-compatible speech API (`POST /api/v1/audio/speech`)

**The Python microservice owns only:**

- Model loading and GPU/PyTorch runtime
- Raw TTS synthesis: text → WAV bytes
- Model hot-swap (`POST /reload`)

This means you can run the Python server on any machine reachable over HTTP — it exposes just 3 endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/model-info` | GET | Returns loaded model metadata |
| `/synthesize` | POST | Synthesizes a single text chunk → WAV |
| `/reload` | POST | Re-reads config and hot-swaps the model |

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 22+** | Required for the TanStack Start app |
| **Python 3.10+** | Required for the inference microservice |
| **CUDA** (optional) | Strongly recommended for real synthesis workloads; CPU works but is slow |

---

## Setup

### 1. Install Node.js dependencies

```bash
npm install
```

### 2. Set up the Python environment

Run from the repo root so Python picks up the shared `config.yaml`:

```bash
# Create a virtual environment (recommended)
python -m venv python-server/venv

# Activate it — Linux/macOS:
source python-server/venv/bin/activate
# Activate it — Windows:
python-server\venv\Scripts\activate

# Install Python dependencies
pip install -r python-server/requirements.txt
```

> **CUDA 12.8 / RTX 5090 (Blackwell) users:** see [python-server/README_CUDA128.md](python-server/README_CUDA128.md).
> **Google Colab users:** see [python-server/README_Colab.md](python-server/README_Colab.md).

---

## Running

Both services must be running simultaneously. Open two terminals.

### Terminal 1 — Python inference server

**Start from the repo root** so it reads the shared `config.yaml`, `voices/`, and `reference_audio/` directories:

```bash
python python-server/server.py
```

Starts on **http://localhost:8005**. Model weights are downloaded automatically on first run (requires internet). Subsequent starts use the local cache.

### Terminal 2 — Node app

```bash
npm run dev
```

Starts on **http://localhost:8004**. Open [http://localhost:8004](http://localhost:8004) in your browser.

---

## Configuration

[`config.yaml`](config.yaml) at the repo root is read by both services. Key settings:

```yaml
server:
  port: 8004                        # Node app port
  python_engine_port: 8005          # Python inference server port
  python_engine_url: http://localhost:8005  # Where Node calls Python

model:
  repo_id: chatterbox-turbo         # 'chatterbox-turbo' or 'chatterbox'

tts_engine:
  device: cuda                      # 'cuda' or 'cpu'

generation_defaults:
  temperature: 0.8
  exaggeration: 1.3
  cfg_weight: 0.5
  seed: 0
  speed_factor: 1.0
  language: en
```

To switch models or devices: edit `config.yaml`, then click **Reload Model** in the UI (or restart the Python server).

---

## OpenAI-Compatible API

The TanStack app exposes an OpenAI-compatible endpoint handled entirely in Node:

```
POST /api/v1/audio/speech
```

**Request body:**

```json
{
  "model": "chatterbox",
  "input": "Hello, world!",
  "voice": "Emily.wav",
  "response_format": "wav",
  "speed": 1.0
}
```

Drop-in replacement for the OpenAI TTS API — point any OpenAI SDK client's base URL at `http://localhost:8004`.

---

## Voices

**Predefined voices:** drop `.wav` files into `voices/`. They appear in the UI dropdown automatically.

**Voice cloning:** upload a reference audio clip (up to 30 seconds) from the UI. The model will match the speaker's voice.

---

## Development

```bash
npm test          # Run Vitest unit tests
npm run lint      # ESLint
npm run build     # Production Vite build
```

---

## Project Layout

```
app/
  api/              API routes (OpenAI-compatible speech endpoint)
  components/       React UI components
  hooks/            Client-side state and hooks
  lib/              Shared types, constants, schemas, utilities
  routes/           TanStack Router page routes
  server/           Server-only: config, file manager, audio pipeline, TTS orchestrator
python-server/      Python inference microservice (3 endpoints only)
voices/             Predefined voice .wav files
reference_audio/    Uploaded reference audio for voice cloning
outputs/            Generated audio (if audio_output.save_to_disk is enabled)
config.yaml         Shared runtime config (read by both services)
presets.yaml        Saved generation presets
SPECIFICATION.md    Implementation contract and API details
REVIEW.md           Review findings and follow-up items
TODO.md             Project task tracking
```

---

## Troubleshooting

**"Model not loaded" / synthesis requests fail**
The Python inference server is not running or not reachable at `server.python_engine_url`. Start it with `python python-server/server.py` from the repo root.

**Port conflict on startup**
Node uses port 8004 (`server.port`), Python uses port 8005 (`server.python_engine_port`). Verify nothing else is bound to either port, and that both values in `config.yaml` are distinct.

**Slow first run**
Model weights are fetched from HuggingFace on first startup. This may take several minutes.

**CPU inference is very slow**
Set `tts_engine.device: cuda` in `config.yaml` and ensure your CUDA drivers are installed. CPU mode is functional but much slower.

---

## Documentation Map

- [`README.md`](README.md) — setup and overview (this file)
- [`SPECIFICATION.md`](SPECIFICATION.md) — current implementation contract
- [`REVIEW.md`](REVIEW.md) — review findings and remaining risks
- [`python-server/documentation.md`](python-server/documentation.md) — Python microservice reference
- [`python-server/README_CUDA128.md`](python-server/README_CUDA128.md) — CUDA 12.8 / Blackwell GPU setup
- [`python-server/README_Colab.md`](python-server/README_Colab.md) — Google Colab setup
