# Fixtures de audio · Habla ya

Clips en castellano con texto esperado para medir Whisper local.

| id | Contenido |
| --- | --- |
| `avion` | Descripción de avión (caso real reportado: Airbus/Boeing/A320) |
| `corto` | Frase corta de fútbol |
| `marcas` | Marcas comerciales |
| `inventado` | Tema inventado |

- Generados con **Edge TTS** (`es-ES-AlvaroNeural`) → WAV mono 16 kHz.
- Regenerar: `npm run fixtures:hablaya` (hace falta `edge-tts` + `ffmpeg`).
- Tests: `npm run test:whisper-fixtures` o `npm test`.
