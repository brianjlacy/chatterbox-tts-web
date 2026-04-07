# Review Summary

Reviewed on `2026-04-06`.

## Scope

This pass covered:

- code review of the Node/TanStack app
- comparison against the preserved Python server
- documentation refresh
- search for leftover conversation artifacts
- validation with lint, tests, build, and `npm audit`

## Fixed During Review

### 1. Python proxy contract mismatch

The Node app was still calling a hypothetical backend contract (`/synthesize`, `/model-info`, `/reload-model`) that the preserved Python server does not expose.

The proxy now targets the routes that actually exist:

- `POST /tts`
- `GET /api/model-info`
- `POST /restart_server`
- `POST /v1/audio/speech`

### 2. Audio response handling

The generation flow was treating backend audio bytes as raw `Float32Array` samples, which corrupted encoded output formats.

The Node layer now preserves the already encoded audio returned by Python.

### 3. Upload flows

The React UI had placeholder upload handlers that only showed toasts and refreshed lists.

Those flows are now connected to the existing TanStack upload server functions.

### 4. Paralinguistic tag insertion

The tag insertion hook was not wired to the actual `<textarea>`, which broke cursor-based insertion.

### 5. Validation drift

The frontend allowed request values outside the Python server's accepted range, especially for `chunk_size` and `cfg_weight`.

### 6. Conversation artifacts in docs

Legacy citation markers such as `file:21` and `web:65` were present in `python-server/README_Colab.md` and were even surfacing as Tailwind build warnings.

## Outstanding Issues

### 1. Shared config ownership is still muddy

The repo-root `config.yaml` mixes concerns for the Node layer and the Python backend. The most visible symptom is port ambiguity between the Node app and the backend service.

### 2. Config panel is still not a full editor

Most fields are read-only, and the current "Save Server Configuration" action mostly writes existing values back to disk.

### 3. Automated test coverage is still thin

Current automated coverage is limited to schema tests. The proxy contract, upload flows, and main route behavior still need direct tests.

### 4. Dependency advisories remain

`npm audit --json` currently reports `25` vulnerabilities (`24` moderate, `1` high), with the most important items coming from the Vite/TanStack toolchain and its transitive `h3` dependency chain.

### 5. Dependency version drift risk

`package.json` still uses `latest` for some TanStack packages, which makes future installs less predictable than the current lockfile suggests.

## Validation Results

The following commands were run successfully during this review:

```bash
./node_modules/.bin/eslint.cmd .
./node_modules/.bin/vitest.cmd run
./node_modules/.bin/vite.cmd build
```

Additional check run:

```bash
npm audit --json
```

## Recommended Next Steps

1. Separate Node app config from Python backend config, or make the ownership explicit in code and UI.
2. Add tests around the proxy contract, uploads, and the main generation flow.
3. Decide whether the remaining chunk-warning flow still provides value or should be simplified.
4. Revisit dependency versions once upstream advisories are patched.
