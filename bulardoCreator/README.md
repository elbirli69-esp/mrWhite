# bulardoCreator

Pregunta por curiosidad **o** pega un briefing con factos → cable inventado (DeepSeek).

Ruta: `/bulardocreator`

## Modos

- **Cuñado** — absurdo + jerga ForoCoches/Burbuja + cierre soez
- **Suave** — absurdo con poco slang
- **Creíble** — nota científica verosímil (sigue siendo inventada)

## Acciones

En cada cable: **Copiar**, **Regenerar**, **Más absurdo**, **Más sobrio**.

Plantillas (Política / Ciencia / Farándula / Cotidiano), historial local (`localStorage`) y streaming SSE.

## Env

`DEEPSEEK_API_KEY` en Vercel (Production + Preview).

Sin clave, en local usa un mock (también por SSE).
