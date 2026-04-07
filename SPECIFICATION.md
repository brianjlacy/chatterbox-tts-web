# Chatterbox TTS Web Specification

## 1. Purpose

This document describes the **current implementation contract** for the converted Chatterbox TTS web app as it exists in this repository today.

It replaces the earlier aspirational spec that assumed a new minimal Python engine service. The checked-in implementation still integrates with the preserved legacy Python server under `python-server/`.

## 2. Runtime Model

```text
Browser
  -> TanStack Start app
  -> legacy Python FastAPI server
```

### 2.1 Node/TanStack responsibilities

- render the React UI
- load initial config, preset, voice, and model data
- persist UI state back into `config.yaml`
- manage voice/reference uploads in shared folders
- proxy TTS and OpenAI-compatible requests to Python

### 2.2 Python responsibilities

- load and hot-swap the model
- run actual speech synthesis
- perform chunking, stitching, and encoding
- expose the preserved FastAPI endpoints used by the Node layer

## 3. Backend Contract the Node App Depends On

The Node app is currently written against these Python routes:

| Python route | Purpose |
| --- | --- |
| `POST /tts` | Main generation endpoint |
| `GET /api/model-info` | Active model metadata |
| `POST /restart_server` | Model hot-swap |
| `POST /v1/audio/speech` | OpenAI-compatible speech endpoint |

The earlier `/synthesize`, `/model-info`, `/reload-model`, and `/health` contract is **not** what the preserved Python server exposes today.

## 4. Shared Files and Directories

The current implementation shares state across the Node and Python layers through repo-root files and folders:

- `config.yaml`
- `presets.yaml`
- `voices/`
- `reference_audio/`
- `outputs/`

This works, but it also means port/config ownership is not fully untangled yet.

## 5. Implemented User Flows

### 5.1 Initial load

The index route loads:

- merged config from `config.yaml`
- predefined voices
- uploaded reference files
- preset definitions
- current model info from Python

### 5.2 Speech generation

The React form submits a validated request to a TanStack server function, and that server function proxies the request to Python `POST /tts`.

The Python server returns already encoded audio. The Node layer returns that audio to the browser as base64 so the client can create a playable blob URL.

### 5.3 Model changes

The React app saves the selected model into config and then triggers Python `POST /restart_server`.

### 5.4 File uploads

The React app base64-encodes uploaded files and sends them to TanStack server functions, which write them into the shared `voices/` or `reference_audio/` directories.

### 5.5 OpenAI-compatible API

The Node route `POST /api/v1/audio/speech` validates the request and proxies it to Python `POST /v1/audio/speech`.

## 6. Frontend State Model

The UI persists:

- last text
- selected voice mode and file
- seed
- chunk settings
- active preset name
- warning-dismissal preferences
- theme

That state is written back into the `ui_state` section of `config.yaml`.

## 7. Validation Rules

The Node-side request schema is aligned to the preserved Python server:

- `chunk_size`: `50` to `500`
- `temperature`: `0.0` to `1.5`
- `exaggeration`: `0.25` to `2.0`
- `cfg_weight`: `0.2` to `1.0`
- `speed_factor`: `0.25` to `4.0`
- `seed`: non-negative integer

## 8. Verified Behavior

As of `2026-04-06`:

- lint passes
- the checked-in schema tests pass
- production build passes
- the React app is wired to the legacy Python routes that actually exist
- the upload flows are connected
- paralinguistic tag insertion is wired to the actual `<textarea>` element

## 9. Known Deviations From the Original Conversion Goal

The following items are still incomplete relative to the original conversion vision:

1. The repo still depends on the legacy Python server instead of a smaller engine-only service.
2. `config.yaml` still acts as shared state for both layers, which keeps port ownership blurry.
3. The Config panel is mostly read-only and does not yet behave like a full settings editor.
4. Test coverage is still narrow.

## 10. Review Follow-Up

See `REVIEW.md` for the detailed audit summary and `TODO.md` for the additive follow-up task list.
