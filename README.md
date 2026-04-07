# Chatterbox TTS Web

This repository is the Node/TypeScript/React conversion of the Chatterbox TTS web application.

The web UI, server-side orchestration, and API proxy now live in the TanStack Start app under `app/`. Audio inference still runs in the preserved Python server under `python-server/`.

## Current Status

Verified on `2026-04-06`.

- `eslint` passes.
- `vitest` passes (`app/lib/schemas.test.ts`, 8 tests).
- `vite build` passes.
- The React app now proxies the Python routes that actually exist in this repo: `/tts`, `/api/model-info`, `/restart_server`, and `/v1/audio/speech`.
- Voice and reference-file uploads are wired in the React UI.

This repo does **not** yet include a newly separated "minimal engine-only" Python service. The current implementation integrates with the legacy Python server contract that is preserved in `python-server/`.

## Architecture

```text
Browser (React 19 UI)
  -> TanStack Start app (Node.js)
  -> preserved Python server (FastAPI + PyTorch)
```

The Node/TanStack layer owns:

- routing and page rendering
- form state and UI persistence
- file listing and uploads
- config reads and writes
- proxying the OpenAI-compatible speech route

The Python layer still owns:

- model loading
- TTS generation
- audio chunking and stitching
- audio encoding
- model hot-swap
- GPU / PyTorch runtime concerns

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.10+
- A working Python environment for the legacy backend
- GPU support is optional but recommended for real synthesis workloads

### 1. Install Node dependencies

```bash
npm install
```

### 2. Install Python dependencies

```bash
python -m pip install -r python-server/requirements.txt
```

Use the legacy docs in `python-server/` if you need CUDA 12.8 or Colab-specific setup.

### 3. Check backend port configuration

The Node app expects the Python backend at `http://localhost:8005` by default.

Before launching the Python backend, make sure the backend is not trying to bind to the same port as the Node app. In practice that means reviewing the shared root `config.yaml` and aligning the Python server port with `server.python_engine_url`.

### 4. Start the Python backend from the repo root

Starting it from the repo root keeps it pointed at the shared `config.yaml`, `voices/`, and `reference_audio/` directories:

```bash
python python-server/server.py
```

### 5. Start the Node app

```bash
npm run dev
```

The Node app runs at `http://localhost:8004`.

## OpenAI-Compatible API

The TanStack app exposes:

```text
POST /api/v1/audio/speech
```

That route validates the request and then proxies the call to the legacy Python server's `/v1/audio/speech` endpoint.

## Project Layout

```text
app/                    TanStack Start app
app/components/         React UI components
app/hooks/              Client hooks and UI state helpers
app/lib/                Shared types, constants, schemas, utilities
app/server/             Server-only config, file, and proxy code
app/api/                API routes exposed by the Node app
python-server/          Preserved legacy Python server
voices/                 Shared predefined voice files
reference_audio/        Shared uploaded reference audio
config.yaml             Shared runtime config
presets.yaml            Preset definitions
SPECIFICATION.md        Current implementation contract
REVIEW.md               Review summary and follow-up list
TODO.md                 Additive project tracking
```

## Documentation Map

- `README.md`: current setup and repo overview
- `SPECIFICATION.md`: current implementation contract
- `REVIEW.md`: verified findings, fixes, and remaining risks
- `python-server/documentation.md`: legacy Python server reference
- `python-server/README_CUDA128.md`: legacy CUDA 12.8 setup guide
- `python-server/README_Colab.md`: legacy Colab setup guide

## Known Gaps

The highest-value remaining issues are tracked in `REVIEW.md` and appended to `TODO.md`. The most important ones today are:

- shared config ownership between the Node app and Python backend is still confusing
- automated coverage is still thin outside schema validation
- dependency advisories remain in the current Vite/TanStack toolchain

## Verification

Commands run during this review:

```bash
./node_modules/.bin/eslint.cmd .
./node_modules/.bin/vitest.cmd run
./node_modules/.bin/vite.cmd build
npm audit --json
```
