# Run the Legacy Python Server on Google Colab

> Legacy guide. This document is only for running the preserved Python server directly. The main project docs for the Node/TanStack app live in the repo root.

This guide runs the original Python web server in a fresh Google Colab notebook with a T4 GPU, using an isolated micromamba environment to avoid Colab package conflicts.

The goal is to expose the legacy web UI through Colab's built-in port proxy while keeping logs visible in the notebook.

## What You Get

After the setup cells finish:

- the legacy Python server is running in the foreground
- Colab provides a clickable proxy URL for the web UI
- the model load state is checked through `/api/model-info`
- live server logs are written to `/content/chatterbox_server_stdout.log`

## Rules

- Do not use "Run all".
- Run the cells one by one.
- Keep the notebook tab open while the server is running.

## Cell 1: Create an isolated Python 3.11 environment

```bash
%%bash
set -e

cd /content
curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xvj bin/micromamba
./bin/micromamba create -y -n cb311 -c conda-forge python=3.11 pip
```

## Cell 2: Install PyTorch, ONNX, and the Chatterbox fork

```bash
%%bash
set -euo pipefail

cd /content
MICROMAMBA="/content/bin/micromamba"

"$MICROMAMBA" run -n cb311 python -m pip install -U pip setuptools wheel --progress-bar on
"$MICROMAMBA" run -n cb311 pip install \
  --progress-bar on \
  torch==2.5.1+cu121 torchaudio==2.5.1+cu121 torchvision==0.20.1+cu121 \
  --index-url https://download.pytorch.org/whl/cu121
"$MICROMAMBA" run -n cb311 pip install --progress-bar on onnx==1.16.0
"$MICROMAMBA" run -n cb311 pip uninstall -y chatterbox-tts chatterbox || true
"$MICROMAMBA" run -n cb311 pip install \
  --no-cache-dir --upgrade \
  --progress-bar on \
  "chatterbox-tts @ git+https://github.com/devnen/chatterbox-v2.git@master"
```

## Cell 3: Verify CUDA and inspect the Turbo install

```bash
%%bash
set -e

/content/bin/micromamba run -n cb311 python - <<'PY'
import inspect
import torch
import chatterbox.tts_turbo as t

print("torch:", torch.__version__)
print("cuda available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("gpu:", torch.cuda.get_device_name(0))

print("chatterbox.tts_turbo path:", t.__file__)
src = inspect.getsource(t.ChatterboxTurboTTS.from_pretrained)
print("\n--- from_pretrained() preview ---")
print("\n".join(src.splitlines()[:80]))
PY
```

## Cell 4: Clone the legacy server and run it in the foreground

```python
# @title 4. Install Server + Run With Full Live Logs
import os
import socket
import subprocess
import time
from pathlib import Path

import requests

PORT = 8004
REPO_DIR = "/content/Chatterbox-TTS-Server"
LOG_STDOUT = "/content/chatterbox_server_stdout.log"

def sh(cmd, check=False):
    return subprocess.run(["bash", "-lc", cmd], check=check)

def port_open(host="127.0.0.1", port=PORT, timeout=0.25):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False

os.chdir("/content")
sh("rm -rf /content/Chatterbox-TTS-Server", check=False)
sh("git clone https://github.com/devnen/Chatterbox-TTS-Server.git", check=True)
os.chdir(REPO_DIR)

if Path("requirements-nvidia.txt").exists():
    sh("/content/bin/micromamba run -n cb311 pip install -U pip setuptools wheel", check=False)
    sh("/content/bin/micromamba run -n cb311 pip install -r requirements-nvidia.txt", check=False)

Path(LOG_STDOUT).unlink(missing_ok=True)

env = os.environ.copy()
env["PYTHONUNBUFFERED"] = "1"
env["HF_HOME"] = "/content/hf_home"
env["TRANSFORMERS_CACHE"] = "/content/hf_home/transformers"
env["HF_HUB_CACHE"] = "/content/hf_home/hub"
Path(env["HF_HOME"]).mkdir(parents=True, exist_ok=True)

proc = subprocess.Popen(
    ["/content/bin/micromamba", "run", "-n", "cb311", "python", "-u", "server.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    env=env,
)

with open(LOG_STDOUT, "w", encoding="utf-8", errors="replace") as f:
    shown_link = False
    while True:
        line = proc.stdout.readline()
        if line:
            print(line, end="")
            f.write(line)
            f.flush()

        if (not shown_link) and port_open():
            shown_link = True
            print("\n=== Server port is reachable ===")
            from google.colab.output import serve_kernel_port_as_window

            serve_kernel_port_as_window(PORT)

            try:
                mi = requests.get(f"http://127.0.0.1:{PORT}/api/model-info", timeout=2).json()
                print("\n/api/model-info:", mi)
            except Exception as e:
                print("\n/api/model-info query failed:", repr(e))

        if proc.poll() is not None:
            print("\n=== Server process exited with code", proc.returncode, "===")
            break
```

## Cell 5: Stop the server

```bash
%%bash
PORT=8004

sudo lsof -t -i:$PORT || true
sudo kill -9 $(sudo lsof -t -i:$PORT) 2>/dev/null || true
sudo lsof -i:$PORT || true
```

## Troubleshooting

### The page opens but TTS does not work

Check `/api/model-info` and confirm the response includes `loaded: true`.

### Colab lost the micromamba binary

Re-run Cell 1.

### The server is still using port 8004

Run Cell 5 and then rerun Cell 4.

### Where are model files cached?

This guide stores them under `/content/hf_home`.

## Notes

- Colab often shows the proxy link as `https://localhost:8004/`, but it resolves to an external `*.colab.*` URL.
- For bug reports, include `/content/chatterbox_server_stdout.log` and the `/api/model-info` output.
