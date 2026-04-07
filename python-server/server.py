# File: server.py
# Minimal TTS inference microservice.
# Exposes only 3 endpoints: model-info, synthesize, reload.
# All orchestration (text chunking, stitching, encoding, post-processing)
# is handled by the Node.js layer.

import io
import logging
import logging.handlers
import numpy as np
import soundfile as sf
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from config import config_manager, get_host, get_port, get_log_file_path
import engine
from pydantic import BaseModel

# --- Logging ---
log_file_path_obj = get_log_file_path()
log_file_max_size_mb = config_manager.get_int("server.log_file_max_size_mb", 10)
log_backup_count = config_manager.get_int("server.log_file_backup_count", 5)
log_file_path_obj.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.handlers.RotatingFileHandler(
            str(log_file_path_obj),
            maxBytes=log_file_max_size_mb * 1024 * 1024,
            backupCount=log_backup_count,
            encoding="utf-8",
        ),
        logging.StreamHandler(),
    ],
)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("watchfiles").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


# --- Request model ---
class SynthesizeRequest(BaseModel):
    text: str
    audio_prompt_path: Optional[str] = None
    temperature: float = 0.8
    exaggeration: float = 0.5
    cfg_weight: float = 0.5
    seed: int = 0
    language: str = "en"


# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("TTS microservice: loading model...")
    paths_to_ensure = [
        config_manager.get_path("paths.output", "./outputs", ensure_absolute=True),
        config_manager.get_path("tts_engine.reference_audio_path", "./reference_audio", ensure_absolute=True),
        config_manager.get_path("tts_engine.predefined_voices_path", "./voices", ensure_absolute=True),
        config_manager.get_path("paths.model_cache", "./model_cache", ensure_absolute=True),
    ]
    for p in paths_to_ensure:
        p.mkdir(parents=True, exist_ok=True)

    if not engine.load_model():
        logger.critical("TTS model failed to load on startup.")
    else:
        logger.info("TTS model loaded successfully.")

    yield
    logger.info("TTS microservice: shutting down.")


# --- App ---
app = FastAPI(
    title="Chatterbox TTS Microservice",
    description="Bare inference microservice. Orchestration lives in the Node layer.",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --- Endpoints ---

@app.get("/model-info")
async def get_model_info_endpoint():
    """Return metadata about the currently loaded model."""
    try:
        return engine.get_model_info()
    except Exception as e:
        logger.error(f"Error getting model info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve model information")


@app.post("/synthesize")
async def synthesize_endpoint(req: SynthesizeRequest):
    """
    Synthesize a single text chunk and return raw WAV bytes.
    The Node layer handles text chunking, stitching, speed, post-processing, and encoding.
    """
    if not engine.MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Model not loaded")

    logger.info(f"Synthesizing: {len(req.text)} chars, voice={req.audio_prompt_path is not None}")

    audio_tensor, sample_rate = engine.synthesize(
        text=req.text,
        audio_prompt_path=req.audio_prompt_path,
        temperature=req.temperature,
        exaggeration=req.exaggeration,
        cfg_weight=req.cfg_weight,
        seed=req.seed,
        language=req.language,
    )

    if audio_tensor is None or sample_rate is None:
        raise HTTPException(status_code=500, detail="Synthesis failed")

    # Convert tensor to numpy float32
    audio_np = audio_tensor.cpu().numpy().squeeze().astype(np.float32)

    # Encode as PCM int16 WAV
    buf = io.BytesIO()
    sf.write(buf, audio_np, sample_rate, format="wav", subtype="PCM_16")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="audio/wav",
        headers={"X-Sample-Rate": str(sample_rate)},
    )


@app.post("/reload")
async def reload_endpoint():
    """Hot-swap the model based on current config."""
    logger.info("Model reload requested.")
    try:
        config_manager.load_config()
        success = engine.reload_model()
        if success:
            model_info = engine.get_model_info()
            name = model_info.get("class_name", "Unknown")
            mtype = model_info.get("type", "unknown")
            return {"message": f"Model hot-swap successful. Now running: {name} ({mtype})", "restart_needed": False}
        else:
            raise HTTPException(status_code=500, detail="Model reload failed. Check logs.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during model reload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error during reload: {e}")


# --- Entrypoint ---
if __name__ == "__main__":
    import uvicorn
    host = get_host()
    port = config_manager.get_int("server.python_engine_port", 8005)
    logger.info(f"Starting TTS microservice on {host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=False)
