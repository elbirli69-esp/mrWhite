#!/usr/bin/env python3
"""Regenera WAVs de prueba en castellano con Edge TTS (voz neural).

Requisitos: pip install edge-tts && ffmpeg en PATH.
Uso: python3 scripts/generate-hablaya-fixtures.py
"""

from __future__ import annotations

import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/games/hablaya/fixtures"
AUDIO = OUT / "audio"
VOICE = "es-ES-AlvaroNeural"

CLIPS = [
    {
        "id": "avion",
        "expected": (
            "Un avión sirve para volar. Se pueden hacer viajes a una velocidad muy alta. "
            "Es el medio de transporte con la velocidad más alta y cabe mucha gente. "
            "Hay dos compañías comerciales, como Airbus y Boeing. El A320 por ejemplo."
        ),
        "mustHave": ["volar", "velocidad", "gente", "a320"],
        "niceToHave": ["avion", "airbus", "boeing", "transporte"],
        "minRecall": 0.75,
    },
    {
        "id": "corto",
        "expected": "Hoy hablamos de fútbol y de la selección española.",
        "mustHave": ["hoy", "futbol"],
        "niceToHave": ["hablamos", "seleccion", "espanola"],
        "minRecall": 0.5,
    },
    {
        "id": "marcas",
        "expected": "Las compañías Airbus y Boeing fabrican aviones como el A320.",
        "mustHave": ["a320"],
        "niceToHave": ["airbus", "boeing", "aviones", "companias"],
        "minRecall": 0.45,
    },
    {
        "id": "inventado",
        "expected": "El dragón azul guardaba un queso volador en la montaña de caramelo.",
        "mustHave": ["dragon", "queso", "caramelo"],
        "niceToHave": ["azul", "volador", "montana"],
        "minRecall": 0.7,
    },
]


async def synth(clip_id: str, text: str) -> None:
    mp3 = Path(f"/tmp/hablaya-{clip_id}.mp3")
    await edge_tts.Communicate(text, VOICE).save(str(mp3))
    wav = AUDIO / f"{clip_id}.wav"
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(mp3),
            "-ac",
            "1",
            "-ar",
            "16000",
            str(wav),
        ]
    )
    print(f"wrote {wav} ({wav.stat().st_size} bytes)")


async def main() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    for clip in CLIPS:
        await synth(clip["id"], clip["expected"])
    meta = [
        {
            **clip,
            "voice": VOICE,
            "file": f"audio/{clip['id']}.wav",
        }
        for clip in CLIPS
    ]
    path = OUT / "clips.json"
    path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path}")


if __name__ == "__main__":
    asyncio.run(main())
